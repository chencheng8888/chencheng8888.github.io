# 滑动窗口通用思路

滑动数组主要针对关于子数组的相关问题

## 定长滑动窗口

### 模板
```go
// 比如求长度为k的子数组的最大和
func solve(nums []int,k int){
    // 数组长度
    n := len(nums)

    // 定义当前窗口的总和以及答案
    var sum,ans int
    ans = math.MinInt
    // 定义窗口左右边界
    l,r := 0,0
    for r<n {
        // 右边界进入
        sum += nums[r]
        // 如果窗口达到定长，可以移动左边界
        if r-l+1==k {
            // 计算ans
            ans = max(ans,sum)
            
            // 左边界出
            sum -= nums[l]
            // 左边界向右移动
            l++
        }
        // 右边界向右移动
        r++
    }
    return ans
}
```