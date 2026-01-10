# 滑动窗口通用思路

滑动数组主要针对关于子数组的相关问题

## 定长滑动窗口

### 模板
```go
func solve(){
    
    // windows是用来维护随着滑动窗口变化的而产生变化的值或者数据结构
    var windows any

    // 答案
    var ans any

    // 定义窗口左右边界
    l,r := 0,0
    for r=0;r<n;r++ {
        // 右边界进入给windows带来的影响
        changeR(windows)
        // 如果窗口达到定长，可以移动左边界
        if r-l+1==k {
            // 当当前滑动窗口合法时
            if checkValid() {
                // 计算ans
                ans = max(ans,sum)
            }
            
            // 左边界移除给windows带来的影响
            changeL(windows)

            // 左边界向右移动
            l++
        }
    }
    return ans
}
```

## 不定长的滑动窗口

```go
func solve() {
    l,r := 0,0

    // windows是用来维护随着滑动窗口变化的而产生变化的值或者数据结构
    var windows any

    // 答案
    var ans any

    for r=0;r<n;r++ {
        // 右边界进入给windows带来的影响
        changeR(windows)

        // checkInvalidAboutL表示检查当前滑动窗口是否不合法，如果随着l的右移，不合法会转变为合法，则该条件应该被写上；
        // 否则随着l的右移，不合法不会转变为合法，甚至情况更糟，则该条件不该被写上
        
        // checkCouldBetterAboutL表示检查当前滑动窗口维护的值是否可以更优
        // 如果满足某些条件时,l右移会更优，该条件应该被写上
        // 否则如果l右移是否更优并不确定，则不该被写上

        // 所以 checkInvalidAboutL 和 checkCouldBetterAboutL 不一定都需要写
        // 这里只是写出了包含他们都可以写的情况
        for l<=r && (checkInvalidAboutL() || checkCouldBetterAboutL()) {
            // 左边界移除给windows带来的影响
            changeL(windows)

            // 左边界向右移动
            l++
        }

        // 该窗口合法
        if checkValid() {
            // 统计答案
            ans = getAns(ans)
        }

    }

}
```

