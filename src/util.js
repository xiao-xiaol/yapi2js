const fs = require('fs')
const util = require('util')
const defaultConfig = require('../config/default.config')
const { allConfig, configDefault } = require('../config/allConfig')
const path = require('path')
const { Command } = require('commander');

const globalConfigPath = path.join(__dirname, '../config/global.config.json')
const projectConfigPath = path.join(__dirname, '../config/project.config.json')

module.exports.projectConfigPath = projectConfigPath
module.exports.globalConfigPath = globalConfigPath

// module.exports.QueryComment = class QueryComment {
//     requiredOption = {
//         '1': '是',
//         '0': '否',
//     }
//     generate(query, { tableHeader, tableDataTemp }) {
//         if (!Array.isArray(query)) return ''
//         if (!query.length) return ''

//         let tableStr = tableHeader
//         query.forEach(item => {
//             tableStr += replaceTableData(tableDataTemp, {
//                 ...item,
//                 required: this.requiredOption[item.required],
//                 description: item.desc
//             })
//         })

//         return tableStr
//     }
// }
module.exports.getQueryComment = (() => {
    const requiredOption = {
        '1': '是',
        '0': '否',
    }
    /**
     * @description: 
     * @param {Array} query
     * @return {string}
     */
    return (query, { tableHeader, tableDataTemp }) => {
        if (!Array.isArray(query)) return ''
        if (!query.length) return ''

        let tableStr = tableHeader
        query.forEach(item => {
            tableStr += replaceTableData(tableDataTemp, {
                ...item,
                required: requiredOption[item.required],
                description: item.desc
            })
        })

        return tableStr
    }
})()

/**
 * @description: 替换comment表格数据
 * @param {string} temp 数据模板字符串
 * @param {object} data 当前行数据对象
 * @return {string} 将模板字符串的模板替换成数据后的字符串
 */
const replaceTableData = (temp, data) => {
    return replacePropList
    .reduce(
        (str, item) =>
            str.replace(
                item.dataTemp.trim(),
                () => padString(
                    typeof data[item.prop] === 'function' ? data[item.prop]() : data[item.prop],
                    item.divider.trim().length
                )
            )
        , temp
    )
}

const tableColOptions = {
    '名称': {
        name    : ' 名称            ',
        divider : ' :--------------- ',
        dataTemp: ' {NAME} ',
        prop: 'name'
    },
    '类型': {
        name    : ' 类型       ',
        divider : ' :---------- ',
        dataTemp: ' {TYPE} ',
        prop: 'type'
    },
    '必填': {
        name    : ' 必填    ',
        divider : ' :---------- ',
        dataTemp: ' {REQUIRED} ',
        prop: 'required'
    },
    '默认值': {
        name    : ' 默认值           ',
        divider : ' :--------------- ',
        dataTemp: ' {DEFAULT} ',
        prop: 'default'
    },
    '备注': {
        name    : ' 备注                 ',
        divider : ' :-------------------- ',
        dataTemp: ' {DESCRIPTION} ',
        prop: 'description'
    },
}

/**
 * @description: 替换数据列表
 * @return {*}
 */
const replacePropList = [
    { prop: 'prefixer', dataTemp: '{PREFIXER}', divider: '' },
    ...Object.values(tableColOptions)
]

/**
 * @description: 根据传入的headers生成表格头部和表格数据模板
 * @param {*} cols
 * @return {*}
 */
module.exports.getTempByHeaders = (cols) => {
    // 表头
    const tableHeader = []
    // 表头分割线
    const tableDivider = []
    // 每行数据的模板
    const tableDataTemp = []

    for (const key of module.exports.strToArr(cols)) {
        // 如果可选项内没有就跳过执行
        if (!tableColOptions.hasOwnProperty(key)) continue

        const { name, divider, dataTemp } = tableColOptions[key]
        tableHeader.push(name)
        tableDivider.push(divider)
        tableDataTemp.push(dataTemp)
    }

    return {
        tableHeader: `
 * |${tableHeader.join('|')}|
 * |${tableDivider.join('|')}|`,
        tableDataTemp: `\n * |{PREFIXER}${tableDataTemp.join('|')}|`
    }
}

/**
 * @description: 
 * @param {JSONString} bodyJson
 * @return {*}
 */
module.exports.getJSONBodyComment = (() => {

    // 必填字段
    let requiredList = []

    // 表格数据模板
    let tableDataTemp = ''

    // 表格子级数据标识
    const childSign = ` -`

    /**
     * @description: 获取备注表格数据
     * @param {*} item
     * @param {*} name
     * @param {*} prefixer
     * @return {*}
     */
    function getTableData(item, name, prefixer='') {
        return replaceTableData(tableDataTemp, {
            ...item,
            name: name,
            prefixer: prefixer,
            type: () => getPropType(item),
            required: () => getRequired(name)
        })
    }

    /**
     * @description: 获取必填
     * @param {*} name
     * @return {*}
     */
    function getRequired (name) {
        return requiredList.includes(name) ? '是' : '否'
    }

    
    /**
     * @description: 获取数据类型
     * @param {*} item
     * @return {*}
     */
    function getPropType(item) {
        if (Array.isArray(item.type)) return item.type.join('|')
        if (item.type !== 'array') return item.type
        return item.items.type + '[]'
    }
    
    /**
     * @description: 处理object类型数据
     * @param {*} properties
     * @param {*} prefixer
     * @return {*}
     */
    function getTableDataByObject(properties, prefixer = '') {
        let tableData = ''
        for (const key in properties) {
            if (Object.hasOwnProperty.call(properties, key)) {
                const { type, items, properties: prop } = properties[key];
    
                tableData += getTableData(properties[key], key, prefixer)
                if (type === 'object') {
                    tableData += getTableDataByObject(prop, prefixer + childSign)
                } else if (type === 'array') {
                    tableData += getTableDataByArray(items, prefixer)
                }
            }
        }
    
        return tableData
    }
    
    /**
     * @description: 处理array类型数据
     * @param {*} items
     * @param {*} prefixer
     * @return {*}
     */
    function getTableDataByArray(items, prefixer = '') {
        let tableData = ''
        if (items.type === 'object') tableData += getTableDataByObject(items.properties, prefixer + childSign)
        if (items.type === 'array')  {
            tableData += getTableData(items, '', prefixer)
            tableData += getTableDataByArray(items.items, prefixer + childSign)
        }
        return tableData
    }

    return (bodyJson, { tableHeader, tableDataTemp: _tableDataTemp }) => {
        try {
            const { properties, type, required } = JSON.parse(bodyJson)
            // console.log(properties)
            const keys = Object.keys(properties)
            if (type !== 'object' || !keys.length) return ''
            // 为了捕获以下无用数据生成无用的返回数据注释
            // '{"type":"object","properties":{"key":{"type":"object","properties":{}}},"$schema":"http://json-schema.org/draft-04/schema#","description":"AjaxResult"}'
            if (keys.length === 1 && !Object.keys(keys[0]?.properties || {}).length) return ''

            requiredList = required || []

            tableDataTemp = _tableDataTemp
            let tableStr = tableHeader
            tableStr += getTableDataByObject(properties)
            return tableStr
        } catch (error) {
            console.log(error)
            return ''
        }
    }
})()

/**
 * @description: 字符串长度未到填充长度就使用填充字符串进行填充
 * @param {string | undefined} str 需要填充的字符串
 * @param {number} len 填充后长度
 * @param {string} padStr 填充的字符串
 * @return {*}
 */
function padString(str, len = 15, padStr=' ') {
    try {
        return (str || '').padEnd(len, padStr)
    } catch (error) {
        console.log(error.message)
        console.log(str)
    }
}

/**
 * @description: 获取config
 * @return {*}
 */
module.exports.getConfig = () => {
    const config = {}
    const projectName = module.exports.getCwdProjectName()
    
    // 读取配置文件数据
    Object.assign(
        config,
        defaultConfig,
        module.exports.getGlobalConfig(),
        module.exports.getProjectConfig(projectName),
        module.exports.getConfigFile(),
        module.exports.getArgvToObj()
    )

    return config
}

/**
 * @description: 获取当前执行目录名-即项目名称
 * @return {*}
 */
module.exports.getCwdProjectName = () => {
    return path.basename(process.cwd())
}

/**
 * @description: 获取项目配置json
 * @param {*} projectName 如果传入就返回该项目名的配置
 * @return {*}
 */
module.exports.getProjectConfig = (projectName) => {
    const fileStr = fs.readFileSync(projectConfigPath, { encoding: 'utf-8' })
    const fileValue = JSON.parse(fileStr)
    if (projectName) return fileValue[projectName] || {}
    return fileValue
}

/**
 * @description: 获取全局配置json
 * @return {*}
 */
module.exports.getGlobalConfig = () => {
    const fileStr = fs.readFileSync(globalConfigPath, { encoding: 'utf-8' })
    return JSON.parse(fileStr)
}

/**
 * @description: 获取执行环境下的配置文件 yapi2js.config.json
 * @return {*}
 */
module.exports.getConfigFile = () => {
    const config = {}
    // 读取配置文件信息，即判断文件是否存在
    const configPath = path.join(process.cwd(), '/yapi2js.config.json')
    const configFileStat = fs.statSync(configPath, { throwIfNoEntry: false })
    
    if (configFileStat) {
        // 读取项目下配置文件
        let configFile = fs.readFileSync(configPath, { encoding: 'utf-8' })
        if (typeof configFile === 'string') {
            configFile = JSON.parse(configFile)
        }

        Object.assign(config, configFile)
    }
    return config
}


/**
 * @description: 获取命令行运行参数,返回对象
 * @param {object}  扩展命令行参数  
        abridge: '',// 缩写  
        desc: '', // 描述  
        required: false, // 选项是否必传  
        type: 'string', // 类型  
        valueRequired: true, // 值是否必传，设为非必传的选项如果没有传值只传了选项，如：pnpm yapi2js --test，那么选项test值为true   
 * @return {object}
 */
module.exports.getArgvToObj = (exProgram = {}) => {
    
    const program = new Command();

    const config = Object.assign({}, allConfig, exProgram)

    Object.keys(config).forEach(configKey => {
        const configItem = { ...configDefault, ...config[configKey] }
        
        const method = configItem.required ? 'requiredOption' : 'option'
        const value = configItem.valueRequired ? '<value>' : '[value]'
        const valueType = configItem.type === 'string' ? ' ' + value : ''

        const abridge = configItem.abridge ? `-${configItem.abridge}, ` : ''
        const flags = `${abridge}--${configKey}${valueType}`
        program[method](flags, configItem.desc)
    })

    program.parse(process.argv);
    const obj = program.opts()
    
    return obj
}


/**
 * @description: 获取文件夹绝对路径，如果没有将在执行目录下逐级创建
 * @param {*} dirPath
 * @return {*}
 */
module.exports.getAndCreateDir = (dirPath) => {
    let currentDirPath = process.cwd()
    const dirPathList = dirPath.split('/').map(i => i.split('\\')).flat().filter(Boolean)

    for (const dirname of dirPathList) {
        currentDirPath = path.join(currentDirPath, '/' + dirname)

        if (!fs.existsSync(currentDirPath)) {
            fs.mkdirSync(currentDirPath);
        }
    }
    return currentDirPath
}

/**
 * @description: 将字符串按分隔符分割为数组,分隔符默认为 ','
 * @param {*} str
 * @param {*} splitSign
 * @return {*}
 */
module.exports.strToArr = (str, splitSign=',') => {
    if (typeof str !== 'string') return str
    return str.split(splitSign).map(i => i.trim()).filter(Boolean)
}

// 过滤html标签
module.exports.filterHtmlTag = (value) => {
    if (!value) return ''
    return value.trim().replaceAll(/<[^<>]+>/g, '')
        .replaceAll('<br>', '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll(/\n\n/g, '')
}