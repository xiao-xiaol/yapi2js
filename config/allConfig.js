
// 全部的配置项

// example: {
//     desc: '', // string
//     required: false, // boolean
//     type: 'string', // 'string' | 'boolean'
//     valueRequired: true, // boolean
// },
module.exports = {
    configDefault: {
        abridge: '', // 缩写
        desc: '', // 描述
        required: false, // 选项是否必传
        type: 'string', // 类型
        valueRequired: true, // 值是否必传，设为非必传的选项如果没有传值只传了选项，如：pnpm yapi2js --test，那么选项test值为true
    },
    allConfig: {
        email: {
            desc: '登录邮箱'
        },
        password: {
            desc: '登录地址'
        },
        projectId: {
            desc: '项目id'
        },
        forceUpdate: {
            desc: '是否强制更新所有模块',
            type: 'boolean', // 类型
        },
        timeline: {
            desc: '比对更新时间线。create: 文件创建时间后 | update：文件最后修改时间后'
        },
        yapiUrl: {
            desc: 'yapi地址'
        },
        loginPath: {
            desc: 'yapi登录路径'
        },
        requestFuncName: {
            desc: '请求方法名称'
        },
        requestFuncPath: {
            desc: '请求方法的导入路径'
        },
        methodMode: {
            desc: `http请求方法的模式。'options' | 'method'`
        },
        outputPath: {
            desc: '输出文件存储地址'
        },
        reqBodyCol: {
            desc: '请求负载注释列，逗号分割，可选项：名称 类型 必填 默认值 备注'
        },
        reqQueryCol: {
            desc: '请求参数注释列，逗号分割，可选项：名称 类型 必填 默认值 备注'
        },
        resBodyCol: {
            desc: '响应对象注释列，逗号分割，可选项：名称 类型 必填 默认值 备注'
        },
        include: {
            desc: '需要转换的部分模块名称。不传则为所有模块，逗号分割多个模块名称'
        },
        exclude: {
            desc: '排除转换的模块名称'
        },
    }
}