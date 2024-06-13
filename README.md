## 安装

1.下载tgz文件到本地
2.执行命令安装到全局: npm install <文件路径> -g

-------------------------------------------------------------------------
## 使用

### 基本使用
在项目目录下执行以下命令并且传入用户名和密码以及yapi的项目id：
npm yapi2js --email 用户名 --password 密码 --projectId xx

### 传参方式
1.命令行参数: 在执行命令时通过在命令后传入 --key value 格式的参数
2.配置文件:   在项目下创建yapi2js.config.json文件，json数据就是传的参数

### 设置配置
1.设置全局配置
    npm yapi2js-config-g --email xxx --password xxx
2.设置项目配置-按执行环境的项目名，如果项目名相同会使用同一个配置
    npm yapi2js-config-p --projectId xxx

### 更新部分模块内容
npm yapi2js --include "模块名1,模块名2"

### 排除部分模块
npm yapi2js --exclude "模块名3,模块名4"

-------------------------------------------------------------------------
## 配置项

### 配置项作用层级-每次执行转换时都会从上至下获取各层级的配置项然后向下覆盖
1. ⬇ 命令行参数
2. ⬇ 执行目录下的 yapi2js.config.json文件
3. ⬇ 之前保存的项目配置-根据项目名保存
4. ⬇ 设置的全局配置
5. ⬇ 默认配置   

### 配置项注释和默认值
json的value值就是默认值，必传项：email、password、projectId
```json
{
    "email": "", // 登录邮箱
    "password": "", // 登录地址
    "projectId": "", // 项目id
    "yapiUrl": "http://yapi.nat.jxlcit.com", // yapi地址
    "loginPath": "/api/user/login", // yapi登录路径
    "requestFuncName": "axios", // 请求方法名称
    "requestFuncPath": "@/utils/request", // 请求方法的导入路径
    "outputPath": "/src/api/modules/", // 生成文件存储地址
    "reqBodyCol": "名称,类型,必填,备注", // 请求负载注释列，可选项：名称,类型,必填,默认值,备注
    "reqQueryCol": "名称,必填,备注", // 请求参数注释列，可选项同上
    "resBodyCol": "名称,类型,备注", // 响应对象注释列，可选项同上
    "include": "", // 需要转换的部分模块名称，不传为所有，逗号分割多个模块名称 如果两个都传则先过滤 include 项再过滤 exclude 项
    "exclude": "", // 不需要转换的部分模板名称, 同上
}
```
-------------------------------------------------------------------------
## 待完善功能

1.重构代码：
    将模块数据解析和接口代码生成解耦拆分进行优化
    对模块数据解析提供钩子函数进行数据更正
    对生成模块需要的数据格式进行整理规范
    生成接口代码支持 JsDoc 注释
    优化 bin 指令
2.支持删除配置项
3.支持指定接口写到指定旧文件内
4.整理comment生成函数成class，分离代码到独立文件专门处理comment的
