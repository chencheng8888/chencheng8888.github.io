# 接雨水



## 题目描述

给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。



## 初步思路

![](/img1.png)

这里我们只关注2号柱子可以接的雨水，可以看到它接的雨水的大小为 `在它之前的柱子的最高高度`与`在它之后的柱子的最高高度`的`最小值`减去`它的高度`

这里初步的思路就已经形成了

记 `lmax[i]`为 [0,i] 的最高高度，`rmax[i]`为 [i,n-1] 的最高高度

则 对于某一处`i`所能接的雨水的大小为`min(lmax[i-1],rmax[i+1])-height[i]`

特别的，对于`i==0`和`i==n-1`的情况，它俩所能接的雨水固定为0，不用考虑

所以可写出代码

```go
func trap(height []int) int {
    n := len(height)

    lmax,rmax := make([]int,n),make([]int,n)

    lmax[0],rmax[n-1] = height[0],height[n-1]

    for i:=1;i<n;i++ {
        lmax[i] = max(lmax[i-1],height[i])
    }

    for i:=n-2;i>=0;i-- {
        rmax[i] = max(rmax[i+1],height[i])
    }

    ans := 0
    for i:=1;i<n-1;i++ {
        if height[i]<min(lmax[i-1],rmax[i+1]) {
            ans += min(lmax[i-1],rmax[i+1])-height[i]
        }
    }

    return ans
}
```



## 优化空间复杂度



考虑这么一件事，如果`lmax[i-1]`小于`rmax[i+1]`，那么`i`处所能接的雨水为`lmax[i-1]-height[i]`，

那如果`lmax[i-1]`小于`rmax[j]`（**i+1 <= j <= n-1**）,还可以推出`i`处所能接的雨水为`lmax[i-1]-height[i]`吗？

其实是可以的，因为如果`lmax[i-1]`小于`rmax[j]`，则一定可以推出`lmax[i-1]`小于`rmax[i+1]`，所以是可以的；那么同理如果`rmax[i+1]`小于`lmax[j]`（**0 <= j <= i-1**）可以推出`i`处能接的雨水为`rmax[i+1]-height[i]`

所以我们其实可以设置`双指针` **l 和 r**，分别指向0和n-1，同时设置两个变量`lmax`和`rmax`分别记录[0,l]和[r,n-1]的高度的最大值。如果`lmax < rmax`，则可以确定**l**处所能接的雨水为`lmax-height[l]`，同时右移l；如果`rmax < lmax`，则可以确定r处所能接的雨水为`rmax-height[r]`。

ok,我们就可以写出代码

```go
func trap(height []int) int {
    n := len(height)

    l,r := 0,n-1

    lmax,rmax := height[0],height[n-1]


    ans := 0 

    for l<r {
        lmax = max(lmax,height[l])
        rmax = max(rmax,height[r])

        if lmax<rmax {
            ans += lmax-height[l]
            l++
        }else {
            ans += rmax-height[r]
            r--
        }
    }

    return ans


}
```



