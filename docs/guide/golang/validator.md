# validator

起因是在使用`gin`框架的`模型绑定`的时候，发现它默认使用了`go-playground/validator`这个库来做数据验证

那我们先从gin的模型绑定说起

## gin的模型绑定

### 什么是模型绑定？
即将请求的数据绑定到结构体上

我们看一个例子:
```go
// 添加一个shell task的请求
type AddShellTaskRequest struct {
	TaskName      string   `json:"task_name" binding:"required"`          // 任务名称
	Description   string   `json:"description" binding:"required"`            // 任务描述
	ScheduledTime string   `json:"scheduled_time" binding:"required,cron"` // Cron表达式(支持秒级)
	Command       string   `json:"command" binding:"required"`               // 执行命令
	Args          []string `json:"args" binding:"omitempty" `          // 命令参数
	Timeout       int      `json:"timeout" binding:"required,max=7200,gt=0"`      // 超时时间(秒)，最大2小时
}
// 例如前端传来一个Json的请求
// {
//   "args": [
//     "backup.sh",
//     "--full"
//   ],
//   "command": "/bin/bash",
//   "description": "每日数据备份任务",
//   "scheduled_time": "0 2 * * * *",
//   "task_name": "daily-backup",
//   "timeout": 1800,
// }

// 我们需要把这个请求绑定到AddShellTaskRequest结构体上

var req AddShellTaskRequest
// 这个方法会自动帮我们把请求的数据绑定到req变量上，并且根据binding标签做数据验证
// 如果验证失败，就会抛出错误
if err := c.ShouldBindBodyWithJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, map[string]string{
        "error": err.Error(),
    })
    return
}
```
可以发现，如果我们没有配置`binding`标签，模型绑定后我们需要手动去验证数据的合法性，这样会增加代码量，并且容易出错
但是如果我们配置了`binding`标签，模型绑定会自动帮我们做数据验证，这样就省去了手动验证的麻烦
而`gin`框架默认使用的验证库就是`go-playground/validator`，它是一个功能强大且灵活的Go语言数据验证库
这里顺便提一嘴，`binging`里面的标签，比如`required`都是可以从`go-playground/validator`的[文档](https://pkg.go.dev/github.com/go-playground/validator/v10#hdr-Baked_In_Validators_and_Tags)中找到的，这边后面会简单介绍一些常见的；而且，我们也可以自定义标签及验证函数


## validator库的使用

### 验证单个字段变量值

这个虽然并不常见，但是也简单介绍下

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

func main() {

    //validator.New() 创建一个验证器
	validate := validator.New()

    // 这边主要还是传入tag来进行验证
    // email: 用来检验字符串是否符合email的格式
    // required : 字段必须设置，不能为默认值;对于数字，确保值不为零。对于字符串，确保值不为空字符串。对于布尔值，确保值不为 false;对于切片、映射、指针、接口、通道和函数，确保值不为 nil
    // 这里需要对bool类型特别注意，如果你要绑定一个bool值，最好不要使用required标签，因为这样会被拦截掉false值
    // 当然如果对于int类型来说，0是一个有效值，也不应该设置这个标签，他会拦截掉0值
	var emailTest string = "test@126.com"
	err = validate.Var(emailTest, "required,email")
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("success") // 输出： success
	}

    // gte=大于等于 (gt = 大于)
    // lte=小于等于 (lt = 小于)
    // eq = 等于
    var a int
    err = validate.Var()a, "gte=10,lte=20")
    if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("success") // 输出： success
	}

    // 这里也介绍下omitempty : 如果字段为零值，则跳过后续约束；否则继续执行后续约束
    a = 0
	err := validate.Var(a, "omitempty,min=18")
	if err != nil {
		fmt.Printf("a: %d failed: %v\n", a, err.Error())
	} else {
		fmt.Printf("a: %d success\n",a)
	}

	a = 18
	err = validate.Var(a, "omitempty,min=18")
	if err != nil {
		fmt.Printf("a: %d failed: %v\n", a, err.Error())
	}else {
		fmt.Printf("a: %d success\n",a)
	}

	a = 7
	err = validate.Var(a, "omitempty,min=18")
	if err != nil {
		fmt.Printf("a: %d failed: %v\n", a, err.Error())
	}else {
		fmt.Printf("a: %d success\n",a)
	}

    // 结果：
    // a: 0 success
    // a: 18 success
    // a: 7 failed: Key: '' Error:Field validation for '' failed on the 'min' tag
}
```

### 验证struct


```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type User struct {
	FirstName string     `validate:"required"`
	LastName  string     `validate:"required"`
	Age       uint8      `validate:"gte=0,lte=130"`
	Email     string     `validate:"required,email"`
	Addresses []*Address `validate:"required,dive,required"`
}

type Address struct {
	Street string `validate:"required"`
	City   string `validate:"required"`
	Planet string `validate:"required"`
	Phone  string `validate:"required"`
}

func main() {
	address := &Address{
		Street: "Eavesdown Docks",
		Planet: "Persphone",
		Phone:  "none",
	}

	user := &User{
		FirstName: "Badger",
		LastName:  "Smith",
		Age:       135,
		Email:     "Badger.Smith@gmail.com",
		Addresses: []*Address{address},
	}

	validate := validator.New()
    // 对于结构体的验证，直接使用Struct方法
    // 这里介绍下dive标签：用于切片、数组、映射和指针等复合类型，表示深入一层验证
	err := validate.Struct(user)
	if err != nil {
		fmt.Println(err)
		return
	}

    // 输出
    // Key: 'User.Age' Error:Field validation for 'Age' failed on the 'lte' tag
    // Key: 'User.Addresses[0].City' Error:Field validation for 'City' failed on the 'required' tag  
}
```


### 自定义约束
除了使用`validator`提供的约束外，还可以定义自己的约束
例如现在有个需求，要求用户必须使用回文串作为用户名，我们可以自定义这个约束：

```go
package main

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type RegisterForm struct {
	Name string `validate:"palindrome"`
	Age  int    `validate:"min=18"`
}

func reverseString(s string) string {
	runes := []rune(s)
	for from, to := 0, len(runes)-1; from < to; from, to = from+1, to-1 {
		runes[from], runes[to] = runes[to], runes[from]
	}

	return string(runes)
}

func CheckPalindrome(fl validator.FieldLevel) bool {
    // fl.Field() 获取当前字段的反射的值(reflect.Value)
	value := fl.Field().String()
	return value == reverseString(value)
}

func main() {
	validate := validator.New()
    // 这边注册一个标签 "palindrome" 对应的验证函数CheckPalindrome
	validate.RegisterValidation("palindrome", CheckPalindrome)

	f1 := RegisterForm{
		Name: "djd",
		Age:  18,
	}
	err := validate.Struct(f1)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Printf("f1 success\n")
	}

	f2 := RegisterForm{
		Name: "dj",
		Age:  18,
	}
	err = validate.Struct(f2)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Printf("f2 success\n")
	}

    // 输出
    // f1 success
    // Key: 'RegisterForm.Name' Error:Field validation for 'Name' failed on the 'palindrome' tag
}

```


## 常见约束

### 范围约束
范围约束的字段类型有以下几种:
+ 对于数值，则约束其值
+ 对于字符串，则约束其长度
+ 对于切片、数组和map，则约束其长度

下面如未特殊说明，则是根据上面各个类型对应的值与参数值比较:
+ `len`：等于参数值，例如len=10；
+ `max`：小于等于参数值，例如max=10；
+ `min`：大于等于参数值，例如min=10；
+ `eq`：等于参数值，注意与len不同。对于字符串，eq约束字符串本身的值，而len约束字符串长度。例如eq=10；
+ `ne`：不等于参数值，例如ne=10；
+ `gt`：大于参数值，例如gt=10；
+ `gte`：大于等于参数值，例如gte=10；
+ `lt`：小于参数值，例如lt=10；
+ `lte`：小于等于参数值，例如lte=10；
+ `oneof`：只能是列举出的值其中一个，这些值必须是数值或字符串，以空格分隔，如果字符串中有空格，将字符串用单引号包围，例如oneof=red green

### 字符串约束

+ `contains`：包含参数子串，例如contains=email；
+ `containsany`：包含参数中任意的 UNICODE 字符，例如containsany=abcd；
+ `containsrune`：包含参数表示的 rune 字符，例如containsrune=☻；
+ `excludes`：不包含参数子串，例如excludes=email；
+ `excludesall`：不包含参数中任意的 UNICODE 字符，例如excludesall=abcd；
+ `excludesrune`：不包含参数表示的 rune 字符，excludesrune=☻；
+ `startswith`：以参数子串为前缀，例如startswith=hello；
+ `endswith`：以参数子串为后缀，例如endswith=bye


### 唯一性

使用`unqiue`来指定唯一性约束，对不同类型的处理如下：
+ 对于数组和切片，unique约束没有重复的元素；
+ 对于map，unique约束没有重复的**值**；
+ 对于元素类型为结构体的切片，unique约束结构体对象的某个字段不重复，通过unqiue=field指定这个字段名


### 特殊

+ `-` : 跳过该字段，不检验
+ `|` : 使用多个约束，只需要满足其中一个，例如`rgb|rgba`；
+ `required` : 字段必须设置，不能为默认值;对于数字，确保值不为零。对于字符串，确保值不为空字符串。对于布尔值，确保值不为 false;对于切片、映射、指针、接口、通道和函数，确保值不为 nil
+ `omitempty` : 如果字段为零值，则跳过后续约束；否则继续执行后续约束

### 跨字段约束

`validator`允许定义跨字段的约束，即该字段与其他字段之间的关系
这种约束实际上分为两种:
+ 参数字段就是同一个结构中的平级字段
+ 参数字段为结构中其他字段的字段

如果是约束同一个结构中的字段，使用`eqfield`，例如 eqfield=ConfirmPassword
如果是更深层次的字段，使用`eqcsfield`，例如 eqcsfield=InnerStructField.Field

例如:
```go
type RegisterForm struct {
  Name      string `validate:"min=2"`
  Age       int    `validate:"min=18"`
  Password  string `validate:"min=10"`
  ConfirmPassword string `validate:"eqfield=Password"` // ConfirmPassword必须和Password字段相等
}
```