# Casbin

## 一、PERM 元模型
在Casbin中，访问控制模型被抽象为基于PERM元模型（策略，效果，请求，匹配器）的CONF文件。 为项目切换或升级授权机制就像修改配置一样简单。 您可以通过组合可用模型来定制自己的访问控制模型。


PERM模型由四个基础部分组成：策略[Policy]，效果[Effect]，请求[Request]和匹配器[Matcher]。 这些基础部分描述了资源和用户之间的关系。
### Request
定义请求参数。 基本请求是一个元组对象，至少需要一个主体（被访问实体），对象（被访问资源）和动作（访问方法）。
例如，请求定义可能看起来像这样：`r={sub,obj,act}`
> 大致意思就是 主体[sub]发送了一个对某个资源[obj]实行[act]操作的请求
### Policy
定义访问策略的模型。 它指定了策略规则文档中字段的名称和顺序。
例如：`p={sub, obj, act}` 或 `p={sub, obj, act, eft}`
注意：如果未定义eft（策略结果），则不会读取策略文件中的结果字段，匹配策略结果将默认允许(allow)。
> 大致意思就是我们定义了一系列的规则，即某些主体[sub]是否可以[eft]对某些资源[obj]实行[act]操作
### Matcher
定义请求和策略的匹配规则。
例如：`m = r.sub == p.sub && r.act == p.act && r.obj == p.obj` 这个简单而常见的匹配规则意味着，如果请求的参数（实体，资源和方法）等于策略中找到的那些，那么返回策略结果（p.eft）。 策略的结果将保存在p.eft中。
> 这个意思就是，Matcher用于判断一个请求是否符合某条策略规则。当你发起一个访问请求时，Casbin 会把这个请求和所有的策略一一对比，通过 Matcher 判断是否有一条策略满足当前请求条件，
举个例子：
🏢 **公司权限控制系统：Matcher 例子讲解（优化版）**
在一家公司中，存在两个文件资源：
- `data1`：普通资料
- `data2`：敏感资料
✅ **权限策略如下（Policy）：**
**员工**（`employee`）可以查看 `data1`
**经理**（`manager`）可以查看 `data1` 
**经理**（`manager`）可以查看 `data2`
👩‍💼 **公司里有两个人：**
- **小明** 是员工（employee）
- **小红** 是经理（manager）
后来，**小红**出于业务需要，单独授权**小明**可以查看 `data2`（即添加了一个针对小明的特殊策略）
❓**现在的问题**
我们想判断请求：
> “小明可以查看 data2 吗？”
🧠 **结论**
**小明可以访问 data2，因为他被直接授权了这条权限策略。**
而这个匹配成功是因为：
- `r.sub == p.sub` 成立（小明 == 小明）
- `r.obj == p.obj` 成立（data2）
- `r.act == p.act` 成立（read）
### Effect
对匹配器的匹配结果进行逻辑组合判断。
例如：`e = some(where(p.eft == allow))`
这个语句意味着，如果匹配策略结果p.eft有（一些）允许的结果，那么最终结果为真。

那我们接着上面的例子
🧨 **如果加一条 deny 策略会怎样？**
**员工不能查看data2**
显然匹配了多条规则
- **员工不能查看data2**
- **小明可以查看data2**
假设我们使用这个`e = some(where(p.eft == allow))`对匹配器的匹配结果进行逻辑组合判断，即只要有一个规则是允许(allow)，我们就认为最终结果为真

显然匹配的规则中有一条是允许的，所以我们认为结果为**小明可以查看data2**

## 二、ACL：访问控制列表（Access Control List）
Casbin中最基本和最简单的模型是`ACL`。 ACL的模型CONF如下
```
# Request definition
[request_definition]
r = sub, obj, act

# Policy definition
[policy_definition]
p = sub, obj, act

# Policy effect
[policy_effect]
e = some(where (p.eft == allow))

# Matchers
[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```
ACL模型的一个示例策略为：
```
p, alice, data1, read
p, bob, data2, write
```
这意味着：
- alice可以读取data1
- bob可以写入data2


> 简单来说就是ACL直接从个体的角度来规定，哪些人可以有哪些权限
还是接着上面的例子，转换成ACL就是
- 小明可以访问data1
- 小红可以访问data2
- 小明不可以访问data2
- 小红可以访问data2
- 小明可以访问data2
就是去除了角色这一概念
## 三、RBAC：基于角色的访问控制模型（Role-Based Access Control）
在 Casbin 中，**RBAC 是在 ACL 基础上发展出来的一种模型**。
 它的核心思想是：
> 不再直接给“个体用户”分配权限，而是先定义“角色”，然后把权限分配给角色，再把用户分配到角色中。
其实基本就是我们例子那样，但还是有不同的

注意到我们例子中有一个特殊的地方，就是我们单独给小明写了一条规则
这是一个**直接给用户**的权限，即所谓的 **个体特权**
这种做法是 Casbin 支持的 `RBAC-with-ACL` 混合模型，所以我们的例子并不是严格意义上的RBAC模型
那我们直接看看我们之前的例子的严格定义
📄 **model.conf**
```
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) || r.sub == p.sub && r.obj == p.obj && r.act == p.act
```
✅ **说明：**
- `r = sub, obj, act`：请求包括：谁、访问什么、用什么操作。
- `p = sub, obj, act`：策略规则，sub 可以是用户或角色。
- `g = _, _`：用户和角色之间的关系。
- `e = some(where (p.eft == allow))`：只要匹配到一条允许规则，就通过。
- `matchers` 中 `(g(r.sub, p.sub) || r.sub == p.sub)`：
  - 支持 RBAC（用户通过角色）✅
  - 也支持 ACL（用户直接授权）✅
📄 **policy.csv（或 policy.csv 格式的数据）**
```
# 策略规则（角色级别）
p, employee, data1, read
p, manager, data1, read
p, manager, data2, read

# 个体特权（ACL方式）
p, 小明, data2, read

# 用户-角色绑定
g, 小明, employee
g, 小红, manager
```
其实RBAC有一些变种
- RBAC with Pattern
- RBAC with Domains
- RBAC with Conditions

这里我只简单讲讲，难免复制粘贴😋
### with Pattern
有时，您希望具有特定模式的某些主题、对象或域/租户自动被授予角色。 RBAC中的模式匹配函数可以帮助您做到这一点。

我们知道，通常RBAC在匹配器中表示为 `g(r.sub, p.sub)`。 然后我们可以使用像这样的策略：
```
p, alice, book_group, read
g, /book/1, book_group
g, /book/2, book_group
```
所以 `alice` 可以阅读所有书籍，包括 `book 1` 和 `book 2`。 但可能有数千本书，将每本书都添加到书籍角色（或组）中是非常繁琐的，每个 `g` 策略规则都需要添加一本书。
但是，使用模式匹配函数，您只需要用一行代码就可以编写策略：
```
g, /book/:id, book_group
```
> 这个总的来说就是使用模式匹配来归结一些相似的资源，比如上面类似的Path可以使用模式匹配归结为一组，其实上面也可以使用通配符，即/book/*，感觉更简单直观
### with Domains
Casbin中的RBAC角色可以是全局的或特定于域的。 特定于域的角色意味着当用户在不同的域/租户中时，用户的角色可以不同。 对于像云这样的大型系统，这非常有用，因为用户通常在不同的租户中。

> 这里要提及一下，Casbin中还有个概念叫域，其实就类似于namespace这种
与域/租户的角色定义应该如下所示：
```
[role_definition]
g = _, _, _
```
第三个`_`代表域/租户的名称，这部分不应该改变。 然后策略可以是：
```
p, admin, tenant1, data1, read
p, admin, tenant2, data2, read

g, alice, admin, tenant1
g, alice, user, tenant2
```
这意味着tenant1中的admin角色可以读取data1。 并且alice在tenant1中拥有admin角色，在tenant2中拥有user角色。 因此，她可以读取data1。 然而，由于alice在tenant2中不是admin，她无法读取data2。
然后，在匹配器中，你应该按照以下方式检查角色：
```
[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```
## 三、ABAC
> ABAC代表基于属性的访问控制。 它允许你通过使用主体、对象或行为的属性（属性）来控制访问，而不是使用字符串值本身。 你可能听说过一种复杂的ABAC访问控制语言，叫做XACML。 另一方面，Casbin的ABAC要简单得多。 在Casbin的ABAC中，你可以使用结构体或类实例代替模型元素的字符串。
让我们来看一下官方的ABAC示例：
```
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == r.obj.Owner
```
在匹配器中，我们使用r.obj.Owner代替r.obj。 传递给Enforce()函数的r.obj将是一个结构体或类实例，而不是一个字符串。 Casbin将使用反射来为你检索该结构体或类中的obj成员变量。
这是r.obj结构体或类的定义：
```go
type testResource struct {
    Name  string
    Owner string
}
```
✅ **场景还原一下**
你想让访问权限不是靠“预先设定的规则”，而是“资源本身的属性”来判断。
比如：
你不想写一堆：
```
p, alice, /doc/alice-doc, read
p, bob, /doc/bob-doc, read
```
而是直接根据资源里的属性判断：
如果某份资源的 owner == 当前请求人，就让他访问。

你传入的 obj 是一个结构体（或者类），而不是字符串！

## 四、规则存储
可以使用gorm，惊不惊喜😁

具体的使用可以去官网看https://casbin.org/zh/docs/overview
其实使用Casbin最大的障碍就是它的那些概念，理解后，使用反而很简单


