# 建造者模式

[编程中什么是 Context（上下文）](https://www.zhihu.com/question/26387327/answer/3158798538?utm_campaign=shareopn&utm_medium=social&utm_psn=1881487883325658106&utm_source=wechat_session)

## 正文
这篇文章引起我对上下文的思考，首先我们先聊聊，上下文是什么，这里我引用其中的一句话
> 在做决策的步骤中，一个关键的步骤就是根据足够多的信息做决策。所有必要的信息统称为【上下文】。

比如说，你现在要查询一个用户，那么ID就可以是上下文，我们根据ID来去数据库中查询数据，这个就是我们做出决策的上下文，而如果这个上下文一旦变得复杂，繁多，维护这个上下文就变得困难，甚至低效。而很多场景，我们的上下文不是像上面的简单，它可以变得很多，而且他的数量也可以不固定，比如说，查询一个用户一定只能用ID吗，phone行吗，难道我们又去编写getuserByPhone(phone string)吗，又比如说，个数很多怎么办，难道要将这个函数参数列表撑爆吗？这样的写法既不美观，也很低效。

文章里讲了一些解决办法，这里我主要讲这个：**要利用对象来构造一套上下文，支撑相关的所有业务逻辑**。

我们就一边改造一边学习
开始我们只有一个函数`GetUser`
```go
type Dao struct{
     db *gorm.DB
}

func (d *Dao) GetUser(ctx context.Context,id uint64) (User,error)
```
现在我们加需求，除了精确查询，这个还要支持模糊查询，比如说根据name,gender等，模糊查询还要支持联合查询，比如name = "123" and gender = "man"

那我们来利用对象来构造上下文,来改造一下
```go
type SearchCtx struct{
    ByPrimaryKey bool //是否根据主键查询
    ID uint64
    Name string
    Gender string
}

func (d *Dao) GetUser(ctx context.Context, searchCtx SearchCtx) ([]User,error) {
   panic("implement me")
}
```
我们现在想一下SearchCtx怎么构造？

既然我们在学习建造者模式，我们来用建造者模式来构建`SearchCtx` ,所以我们添加下列代码
```go
type SearchCtxBuilder struct {
    SearchCtx
}

func NewSearchCtxBuilder() *SearchCtxBuilder {
    return &SearchCtxBuilder{}
}

func (b *SearchCtxBuilder) WithByPrimaryKey(id uint64) *SearchCtxBuilder {
    b.ByPrimaryKey = true
    b.ID = id
    return b
}

func (b *SearchCtxBuilder) WithName(name string) *SearchCtxBuilder {
    b.Name = name
    return b
}

func (b *SearchCtxBuilder) WithGender(gender string) *SearchCtxBuilder {
    b.Gender = gender
    return b
}
func (b *SearchCtxBuilder) Build() SearchCtx {
    return SearchCtx{
       ByPrimaryKey: b.ByPrimaryKey,
       ID:           b.ID,
       Name:         b.Name,
       Gender:       b.Gender,
    }
}
```
因此，我们的`GetUser` 可以这样调用
```go
users,err := dao.GetUser(context.Background(),NewSearchCtxBuilder().
    WithByPrimaryKey(1).Build())

//或者这样
users,err := dao.GetUser(context.Background(), NewSearchCtxBuilder().
    WithName("123").WithGender("man").Build())
```
看起来很有条理，在构建的时候，就不必关心一些可选字段了，而且这样链式调用，也使得代码流畅，符合自然思维

接下来我们再把实现完成下
```go
func (d *Dao) GetUser(ctx context.Context, searchCtx SearchCtx) ([]User, error) {
    db := d.db.WithContext(ctx)
    var users []User
    if searchCtx.ByPrimaryKey {
       var user User
       err := db.Model(&User{}).Where("id = ?",searchCtx.ID).First(&user).Error
       if err!=nil {
          return nil,err
       }
       users = append(users, user)
    }else {
        //两个条件可以叠加
       if searchCtx.Name != "" {
          db = db.Where("name = ?", searchCtx.Name)
       }
       if searchCtx.Gender != "" {
          db = db.Where("gender = ?", searchCtx.Gender)
       }
       err := db.Model(&User{}).Find(&users).Error
       if err!=nil {
          return nil,err
       }
    }
    return users, nil
}
```

## 补充 options 模式

接下来给大家介绍另一种建造者模式的实现思路，这是我个人更加推崇的一种编程风格：Options 模式，当然上面也很不错

`SearchCtx` 不变
添加新的类，可供大家参考
```go
type SearchCtxOpts struct {
    SearchCtx
}

type SearchCtxOpt func(*SearchCtxOpts)

func WithByPrimaryKey(id uint64) SearchCtxOpt {
    return func(opts *SearchCtxOpts) {
       opts.ByPrimaryKey = true
       opts.ID = id
    }
}
func WithName(name string) SearchCtxOpt {
    return func(opts *SearchCtxOpts) {
       opts.Name = name
    }
}
func WithGender(gender string) SearchCtxOpt {
    return func(opts *SearchCtxOpts) {
       opts.Gender = gender
    }
}
func NewSearchCtx(opts ...SearchCtxOpt) SearchCtx {
    opt := &SearchCtxOpts{}
    for _, o := range opts {
       o(opt)
    }
    return SearchCtx{
       ByPrimaryKey: opt.ByPrimaryKey,
       ID:           opt.ID,
       Name:         opt.Name,
       Gender:       opt.Gender,
    }
}
```
同样的，给出如何构造
```go
users,err := dao.GetUser(context.Background(), 
    NewSearchCtx(WithByPrimaryKey(1)))
users,err := dao.GetUser(context.Background(), 
    NewSearchCtx(WithName("123"), WithGender("man")))
```

**小问题：如果模糊查询的字段增多了怎么办，难道还一个一个if吗？**

原始的：
```go
func (d *Dao) GetUser(ctx context.Context, searchCtx SearchCtx) ([]User, error) {
    db := d.db.WithContext(ctx)
    var users []User
    if searchCtx.ByPrimaryKey {
       var user User
       err := db.Model(&User{}).Where("id = ?",searchCtx.ID).First(&user).Error
       if err!=nil {
          return nil,err
       }
       users = append(users, user)
    }else {
        //两个条件可以叠加
       if searchCtx.Name != "" {
          db = db.Where("name = ?", searchCtx.Name)
       }
       if searchCtx.Gender != "" {
          db = db.Where("gender = ?", searchCtx.Gender)
       }
       err := db.Model(&User{}).Find(&users).Error
       if err!=nil {
          return nil,err
       }
    }
    return users, nil
}
```
改造：
```go
type QueryOption func(db *gorm.DB)

type SearchCtx struct {
    ByPrimaryKey bool //是否根据主键查询
    ID           uint64
    QueryOptions []QueryOption
}

func QueryName(name string) QueryOption {
    return func(db *gorm.DB) {
       db.Where("name = ?", name)
    }
}
func QueryGender(gender string) QueryOption {
    return func(db *gorm.DB) {
       db.Where("gender = ?", gender)
    }
}




type SearchCtxOpts struct {
    SearchCtx
}

type SearchCtxOpt func(*SearchCtxOpts)

func WithByPrimaryKey(id uint64) SearchCtxOpt {
    return func(opts *SearchCtxOpts) {
       opts.ByPrimaryKey = true
       opts.ID = id
    }
}
func WithQueryOptions(qopts ...QueryOption) SearchCtxOpt {
    return func(opts *SearchCtxOpts) {
       opts.QueryOptions = qopts
    }
}
func NewSearchCtx(opts ...SearchCtxOpt) SearchCtx {
    opt := &SearchCtxOpts{}
    for _, o := range opts {
       o(opt)
    }
    return SearchCtx{
       ByPrimaryKey: opt.ByPrimaryKey,
       ID:           opt.ID,
       QueryOptions: opt.QueryOptions,
    }
}



func (d *Dao) GetUser(ctx context.Context, searchCtx SearchCtx) ([]User, error) {
    db := d.db.WithContext(ctx)
    var users []User
    if searchCtx.ByPrimaryKey {
       var user User
       err := db.Model(&User{}).Where("id = ?", searchCtx.ID).First(&user).Error
       if err != nil {
          return nil, err
       }
       users = append(users, user)
    } else {
       for _, opt := range searchCtx.QueryOptions {
          opt(db)
       }
       err := db.Model(&User{}).Find(&users).Error
       if err != nil {
          return nil, err
       }
    }
    return users, nil
}


user,err := dao.GetUser(context.Background(),NewSearchCtx(
    WithQueryOptions(QueryName("123",
            QueryGender("man"))),
))
```
所以我们会发现，设计模式会让我们代码变得很优雅，少写冗余代码，我们只用一个函数，而且并不复杂的逻辑，以及可扩展性非常好，就完成了精准查询和模糊查询，而不是类似函数的重复堆砌
