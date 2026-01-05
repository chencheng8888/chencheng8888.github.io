# 最大子段和

## 问题描述

给定一个由 **N 个整数** 构成的序列：

a[1], a[2], a[3], ... , a[n]

求该序列的所有 **连续子段和**：

a[i] + a[i+1] + ... + a[j]

中的 **最大值**。

- 若所有整数均为负数，则最大连续子段和定义为 **0**


## 思路

**1. 状态定义**

设置一个一维 dp 数组。
dp[i] 表示**以第 i 个数（即 nums[i]）结尾的连续子数组的最大和**。

**2. 状态转移方程**

对于 dp[i]，只有两种情况可能产生以 nums[i] 结尾的最大子段和：
1.  **接上**前一个子段：将 nums[i] 加到以 nums[i-1] 结尾的最大子段和 dp[i-1] 上，即 dp[i-1] + nums[i]。
2.  **重新开始**新的子段：单独以 nums[i] 作为新的子段的起点，即 nums[i]。

因此，状态转移方程为：
> dp[i] = max(dp[i-1] + nums[i], nums[i])

由于 i 位置的状态只和 i-1 位置的状态有关，我们可以使用一个变量来记录当前的最大子段和，从而将空间复杂度优化到 O(1)


## 代码
使用golang实现是

```go
func solve(nums []int) int {
    n := len(nums)
    if n==0 {
        return 0
    }

    currentMax := nums[0]

    ans := dp[0]

    for i:=1;i<n;i++ {
        currentMax = max(currentMax + nums[i], nums[i])
        ans = max(ans, currentMax)
    }

    // 这里注意题目要求如果都是负数则返回0
    if ans<0 {
        return 0
    }

    return ans
}
```

---
##  扩展问题：循环数组最大子段和

给定一个由 **N 个整数** 构成的 **循环序列**：

a[1], a[2], ..., a[n]

其中循环序列表示这 \(n\) 个数围成一个圈，因此必须考虑跨越末尾与开头的连续子段，例如：

a[n-1], a[n], a[1], a[2]


要求该序列的所有连续子段和：


a[i] + a[i+1] + ... + a[j] 中的 **最大值**。

- 若所有整数均为负数，则最大连续子段和的值定义为 **0**。

### 思路

- 如果最大字段和不跨越边界，问题转化为**非循环最大子段和**，可以直接使用上面的代码求解
- 如果最大字段和跨越边界，则可以将问题转化为**总和减去最小子段和**


* **非循环最大子段和 (MaxSum1)**：

设置 dp1 数组，dp1[i] 表示以第 i 个数结尾的**最大子段和**（至少选一个），
状态转移方程为：
> dp1[i] = max(A[i], dp1[i-1] + A[i])

* **非循环最小子段和 (MinSum)**：用于计算环形最大子段和的**补集**。

设置 dp2 数组，dp2[i] 表示以第 i 个数结尾的**最小子段和**（至少选一个），
状态转移方程为：
> dp2[i] = min(A[i], dp2[i-1] + A[i])


设数组的总和为 total。

1.  **非循环最大子段和 (MaxSum1)**：
    `MaxSum1 = max(dp1[i])`
2.  **环形最大子段和 (MaxSum2)**：
    如果最大子段和是环形的，那么它必然不包含数组中某一连续的一段（即最小子段和）。因此，环形最大子段和等于**总和减去最小子段和**。
    首先求出最小子段和 `MinSum`：
    `MinSum = min(dp2[i])`
    然后计算环形最大子段和：
    `MaxSum2 = total - MinSum`
3.  **最终答案**：
    最终的循环数组最大子段和为上述两种情况中的较大值：
    `Result = max(MaxSum1, MaxSum2)`


### 代码
```go
func solve(A []int) int {
	if len(A) == 0 {
		return 0
	}
	total := 0
	
	currentMax := math.MinInt32 
	MaxSum1 := math.MinInt32   
	
	
	currentMin := math.MaxInt32 
	MinSum := math.MaxInt32    

	for _, val := range A {
		total += val

		currentMax = max(val, currentMax+val)
		MaxSum1 = max(MaxSum1, currentMax)

		currentMin = min(val, currentMin+val)
		MinSum = min(MinSum, currentMin)
	}
	MaxSum2 := total - MinSum

	ans =  max(MaxSum1, MaxSum2)

    if ans<0 {
        return 0
    }
    return ans
}
```

