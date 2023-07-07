module.exports = {
    email: '', // 登录邮箱
    password: '', // 登录地址
    projectId: '', // 项目id
    timeline: 'update', // 比对更新时间线。create: 文件创建时间后 | update：文件最后修改时间后
    yapiUrl: 'http://yapi.nat.jxlcit.com', // yapi地址
    loginPath: '/api/user/login', // yapi登录路径
    requestFuncName: 'axios', // 请求方法名称
    requestFuncPath: '@/utils/request', // 请求方法的导入路径
    outputPath: '/src/api/modules/', // 生成文件存储地址
    reqBodyCol: '名称,类型,必填,备注', // 请求负载注释列，可选项：名称 类型 必填 默认值 备注
    reqQueryCol: '名称,必填,备注', // 请求参数注释列，可选项同上
    resBodyCol: '名称,类型,备注', // 响应对象注释列，可选项同上
    include: '', // 需要转换的部分模块名称，不传为所有，逗号分割多个模块名称 如果两个都传则先过滤 include 项再过滤 exclude 项
    exclude: '', // 不需要转换的部分模板名称, 同上
}