# Singleflight源码解读

## 为什么使用Singleflight？
使用Singleflight的目的：解决缓存击穿

### 什么是缓存击穿？
什么是缓存击穿？
缓存击穿简单来说，就是热点Key失效后，如果突然出现大量请求就会直达数据库，造成数据库负载升高

可能想的一个解决办法是，只允许一个请求访问数据库，并把数据回填到缓存中，后续请求访问缓存即可

而singleflight基本就是这个思路，多个并发请求到来，只有第一个协程执行任务，在将结果复用给其他协程

可以看看代码
```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"

    "golang.org/x/sync/singleflight"
)

var cache = sync.Map{}
var g singleflight.Group

func getFromCache(key string) (string, bool) {
    if val, ok := cache.Load(key); ok {
        return val.(string), true
    }
    return "", false
}

func setToCache(key, value string) {
    cache.Store(key, value)
}

func getFromDB(key string) string {
    fmt.Println("Querying database for:", key)
    time.Sleep(100 * time.Millisecond) // 模拟数据库延迟
    return "value_of_" + key
}

func GetValue(ctx context.Context, key string) (string, error) {
    if val, ok := getFromCache(key); ok {
        return val, nil
    }

    // 进入 singleflight 防止击穿
    val, err, _ := g.Do(key, func() (interface{}, error) {
        value := getFromDB(key)
        setToCache(key, value)
        return value, nil
    })
    if err != nil {
        return "", err
    }
    return val.(string), nil
}
```

但是，这次，出于我本人的好奇，我想看看singleflight具体是如何实现的，而且其源码也不长，总共200多行


## 源码解读

### Group 和 call 结构体

首先，我们先看看Group 这个类型，他拥有Do这个方法

```go
// Group represents a class of work and forms a namespace in
// which units of work can be executed with duplicate suppression.
// 翻译了下：
// 组代表一类工作，并形成一个命名空间，其中的工作单元可以在重复抑制的情况下执行。
type Group struct {
        mu sync.Mutex       // 由于map不能支持并发读写，所以需要互斥锁来保护m
        m  map[string]*call // 延迟初始化
}
```

结构上还是很简单的，大体上就是使用一个map来保存不同key的请求，然后使用sync.Mutex来保护map，防止并发读写

接下来我们看看call及其子类型
```go
// call is an in-flight or completed singleflight.Do call
// 翻译了一下： 大致意思是说这个call代表了一个正在执行或者已经完成的请求
type call struct {
        wg sync.WaitGroup

        // These fields are written once before the WaitGroup is done
        // and are only read after the WaitGroup is done.
        // 这个意思是，下面的val和err只能在"WaitGroup" done 之前才可以也只能被写入一次
        // 并且只能在"WaitGroup" done 之后被读取
        val interface{}
        err error

        // These fields are read and written with the singleflight
        // mutex held before the WaitGroup is done, and are read but
        // not written after the WaitGroup is done.
        //意思就是：
        // 这些字段在 WaitGroup 完成之前使用 singleflight 互斥锁进行读写，
        // 在 WaitGroup 完成之后，这些字段会被读取，但不会被写入。
        dups  int  //这个是记录这个 key 被分享了多少次    
        chans []chan<- Result // 执行DoChan会被用到
}

// Result holds the results of Do, so they can be passed
// on a channel.
// 意思是
// 这个Result 保存了Do的结果，因此它们可以通过通道传递
type Result struct {
        Val    interface{}
        Err    error
        Shared bool
}
```

暂时，我们只是了解了 这些类型有哪些字段，但字段的用途可能还有些不了解，别急，我们接着看

### Do

我们看看最主要的Do方法，具体的解释，我写在源码中
```go
func (g *Group) Do(key string, fn func() (interface{}, error)) (v interface{}, err error, shared bool) {
        // 给group上锁，因为要开始读取g.m
        g.mu.Lock()
        // 之前说过这个m是延迟初始化的，所以我们需要判断下是否需要初始化
        if g.m == nil {
                g.m = make(map[string]*call)
        }
        // 检查这个m中是否有key的这个请求
        if c, ok := g.m[key]; ok {
                // 如果有，c.dup++
                // 这个 dup应该是call被共享的次数
                c.dups++
                // 解锁
                g.mu.Unlock()
                // 等待call结束
                c.wg.Wait()
                   
                // 走到这一步说明，请求完成，处理结果
                if e, ok := c.err.(*panicError); ok {
                        panic(e)
                } else if c.err == errGoexit {
                // runtime.Goexit 是 Go 标准库 runtime 包中的一个函数，
                // 用来 立即终止当前 goroutine 的执行，但 不会终止整个程序或其他 goroutines
                        runtime.Goexit()
                }
                // 返回结果
                return c.val, c.err, true
        }
        // 这里说明，这个是第一个请求的gorountine
        // 创建一个新的call
        c := new(call)
        // wg add 1
        c.wg.Add(1)
        // 给map中对应的key赋值
        g.m[key] = c
        // 写结束，解锁
        g.mu.Unlock()
        
        // 执行任务
        g.doCall(c, key, fn)
        return c.val, c.err, c.dups > 0
}


func (g *Group) doCall(c *call, key string, fn func() (interface{}, error)) {
        // 标志是否正常返回
        normalReturn := false
        // 捕捉到了panic
        recovered := false

        // use double-defer to distinguish panic from runtime.Goexit,
        // more details see https://golang.org/cl/134395
        defer func() {
                // 如果没有正常返回，并且没有成功捕捉到panic就设置错误errGoexit，使得其他请求退出
                if !normalReturn && !recovered {
                        c.err = errGoexit
                }
                
                // 任务结束,需要删除对应的map中对应的key
                // 由于是对map的写操作，需要加锁
                g.mu.Lock()
                defer g.mu.Unlock()
                
                // 此次任务完成，wg done
                c.wg.Done()
                // 检查对应key的值是否还是c
                // 如果是，就删除对应的key
                if g.m[key] == c {
                        delete(g.m, key)
                }

                if e, ok := c.err.(*panicError); ok {
                        // 为了防止等待的通道被永远阻塞，
                        // 需要确保此panic无法恢复。
                        if len(c.chans) > 0 {
                                go panic(e)
                                select {} // Keep this goroutine around so that it will appear in the crash dump.
                        } else {
                                panic(e)
                        }
                } else if c.err == errGoexit {
                        // Already in the process of goexit, no need to call again
                } else {
                        // 正常返回
                        for _, ch := range c.chans {
                                ch <- Result{c.val, c.err, c.dups > 0}
                        }
                }
        }()

        func() {
                defer func() {
                        if !normalReturn {
                                // 理想情况下，我们应该等到确定了以下情况后再进行堆栈跟踪：
                                // 这是一个恐慌还是一个 Runtime.GoExit。
                                // 不幸的是，我们区分这两者的唯一方法是查看
                                // 恢复是否阻止了 Goroutine 的终止，而
                                // 当我们知道这一点时，与恐慌相关的堆栈跟踪部分已经被丢弃了。
                                if r := recover(); r != nil {
                                        c.err = newPanicError(r)
                                }
                        }
                }()
                // 这里真正执行具体的任务
                // 并标记正常返回
                // 这里有一种特殊情况
                // 就是fn()中有调用runtime.Goexit()
                // 就会直接截断gorountine
                // 但是注册的defer函数还是会被执行
                c.val, c.err = fn()
                normalReturn = true
        }()

        if !normalReturn {
                recovered = true
        }
}
```

### DoChan
其实还有个DoChan方法，但和Do方法不同的是，他返回的是一个channel，当第一个gorountine执行完后，就会往每一个正在等待的gorountine的channel中放入值
```go
// DoChan is like Do but returns a channel that will receive the
// results when they are ready.
//
// The returned channel will not be closed.
func (g *Group) DoChan(key string, fn func() (interface{}, error)) <-chan Result {
        ch := make(chan Result, 1)
        g.mu.Lock()
        if g.m == nil {
                g.m = make(map[string]*call)
        }
        if c, ok := g.m[key]; ok {
                c.dups++
                c.chans = append(c.chans, ch)
                g.mu.Unlock()
                return ch
        }
        c := &call{chans: []chan<- Result{ch}}
        c.wg.Add(1)
        g.m[key] = c
        g.mu.Unlock()

        go g.doCall(c, key, fn)

        return ch
}
```