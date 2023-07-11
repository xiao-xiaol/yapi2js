
const fs = require('fs')
const path = require('path')
const request = require('request');
const dayjs = require('dayjs')
const { getQueryComment, getJSONBodyComment, getAndCreateDir, getTempByHeaders, strToArr, filterHtmlTag } = require('./util')


// 请求方法函数
class RequestMethod {
    config;
    yapiAddress;
    commentsTemplate;

    constructor(config, yapiAddress) {
        this.config = config
        this.yapiAddress = yapiAddress
    }

    // 生成接口
    generate(data) {
        let { path, method, req_params } = data
        path = path.replace(/\/\//g, '/')
        if (path == '') return ''
        let funcName = ''
        const requestFunc = this.getFunctionTemplate()
            .replace('{__COMMENT__}', () => this._getComments(data))
            .replaceAll('{__FUNCTION_NAME}', () => {
                funcName = this._getFunctionName(path, method)
                return funcName
            })
            .replace('{__PATH_PARAMS__}', () => this._getPathParams(req_params))
            .replace('{__URL__}', () => this._getPath(path))
            // .replace('{__METHOD__}', () => method)
            .replace('{PARAMS_OBJECT_PROPERTY}', () => this._getParamsObjectProperty(method))
            .replace('{HTTP_FUNCTION}', () => this.config.requestFuncName)
            .replace('{METHOD_MODE}', () => this.getMethodMode(data.method))
            .replace('{OTHER_OPTIONS}', () => this.getOtherOptions(data))

        return {
            requestFunc,
            funcName,
            title: data.title,
            method
        }
    }

    // 方法模板
    // method: '{__METHOD__}',
    getFunctionTemplate() {
        return `

// {__FUNCTION_NAME} start
{__COMMENT__}
export function {__FUNCTION_NAME}({__PATH_PARAMS__}data) {
    return {HTTP_FUNCTION}{METHOD_MODE}({
        url: '{__URL__}',
        {PARAMS_OBJECT_PROPERTY}: data{OTHER_OPTIONS}
    })
}
// {__FUNCTION_NAME} end`
    }

    // 是否是响应blob数据,tag列表内有blob标签就表示是返回blob数据
    getResBlob(item) {
        if ((item.tag || []).includes('blob') || ['导出', '下载'].includes(item.title || '')) {
            return `responseType: 'blob'`
        }
    }

    // 获取http请求方法 get/post/put/delete
    getMethod(method) {
        return (method || '').toLowerCase()
    }

    getMethodMode(method) {
        const { methodMode } = this.config
        if (methodMode === 'options') return ''
        if (methodMode === 'method') return `.${this.getMethod(method)}`
    }

    // 除url、(params/data)以外的非必须方法选项(method、responseType)
    getOtherOptions(item) {
        const { methodMode } = this.config
        const options = [
            this.getResBlob(item),
            // 如果是options模式就把方法添加到选项内
            methodMode === 'options' ? `method: '${this.getMethod(item.method)}'` : ''
        ]
        const joinSign = `,\n        `
        const str = options.filter(Boolean).join(joinSign)
        return str ? joinSign + str : str
    }

    // 获取请求路径
    _getPath(path) {
        return path.replace(/{/g, '${')
    }

    // 获取传值方式
    _getParamsObjectProperty(method) {
        return method.toLowerCase() === 'get' ? 'params' : 'data'
    }

    // 获取方法参数
    _getPathParams(pathParams) {
        // 替换路径的中的参数
        return pathParams.length ? pathParams.map(v => v.name).join(', ') + ', ' : ''
    }

    // 生成方法名字: (请求方法: get | post) + 请求路径
    _getFunctionName(path, method) {
        return (method.toLowerCase() + this._filter(path))
            .replace(/\_|-/g, '/')
            .split('/')
            .filter(Boolean)
            .map(item => this._letterToUpper(item))
            .join('')
    }

    // 首字母转大写
    _letterToUpper(value) {
        if (value === '') return value
        return value.replace(value[0], value[0].toUpperCase())
    }

    // 过滤方法 过滤掉一些奇奇怪怪的东西
    _filter(value) {
        return value.replace(/\{|\}|\./g, '')
    }

    // 生成方法注释
    _getComments(item) {

        let str = `/**
 * ${item.title}  
 * YAPI: ${this.yapiAddress}/interface/api/${item._id}  `

        const remark = filterHtmlTag((item.desc || '').trim()).replace(/\n/g, `\n$  * `)
        if (remark) str += `\n * 备注：${remark}  `
        // const remark =  * 备注: ${filterHtmlTag((item.desc || '').trim()).replace(/\n/g, `\n$  * `)}  

        const obj = {
            req_query: '请求参数 - query: ',
            req_body_other: '请求参数 - body - json: ',
            req_body_form: '请求参数 - body - formData: ',
            res_body: '返回数据 - body: ',
        }

        for (let i in obj) {
            let commentItem = item[i]
            if (commentItem && commentItem.length) {
                // 扁平对象
                if (i === 'req_query' || i === 'req_body_form') {
                    commentItem = getQueryComment(
                        commentItem,
                        this.getCommentsTemplate('reqQueryCol')
                    )
                }

                // 复杂多层级对象
                if (i === 'req_body_other') {
                    commentItem = getJSONBodyComment(
                        commentItem,
                        this.getCommentsTemplate('reqBodyCol')
                    )
                }

                // 处理json返回数据转换为表格
                if (i === 'res_body' && item.res_body_type === 'json') {
                    commentItem = getJSONBodyComment(
                        commentItem,
                        this.getCommentsTemplate('resBodyCol')
                    )
                }

                if (!commentItem) continue
                if (typeof commentItem === 'string') {
                    str += `\n * --- \n * ${obj[i]}` + commentItem
                } else {
                    str += `\n * --- \n * ${obj[i]}` + JSON.stringify(commentItem, null, 2)
                }
            }
        }

        return str + '\n */'
    }

    /**
     * @description: 获取方法请求参数和返回参数的注释模板
     * @param {string} type 'reqQueryCol' | 'reqBodyCol' | 'resBodyCol'
     * @return {*}
     */
    getCommentsTemplate(type) {
        const tempObj = this.commentsTemplate || {}
        if (tempObj[type]) return tempObj[type]

        const res = getTempByHeaders(this.config[type])
        tempObj[type] = res
        this.commentsTemplate = tempObj
        return res
    }

}

class YAPI {
    // 登录域名
    host;
    // 项目ID
    pid;
    // 根据host和pid生成的yapi地址
    yapiAddress;
    // 登录请求后获取的cookie
    cookie;
    // 配置项
    config;
    requestMethod;

    /**
     * 构造函数
     * @param host yapi的地址 主要用于生成mock地址和快速链接到浏览器
     * @param pid 项目ID
     * @param options
     */
    constructor(config) {
        this.config = config
        this.host = config.yapiUrl
        this.pid = config.projectId
        // `${config.yapiUrl}/project/${pid}`
        this.yapiAddress = config.yapiUrl + path.join('/project/', String(config.projectId));
        this.requestMethod = new RequestMethod(config, this.yapiAddress)
    }

    /**
     * 登录参数 {email: '', password: ''}
     * @param params
     */
    login(params) {
        console.log('开始登录...')
        console.time('登录使用时间')
        const config = {
            url: this.host + path.join(this.config.loginPath),
            method: 'POST',
            headers: {},
            form: params,
        };
        return new Promise((resolve, reject) => {
            request(config, (e, r) => {
                if (e) return reject(e)
                this.cookie = r.headers['set-cookie']
                resolve(r)
            });
        }).finally(() => {
            console.timeEnd('登录使用时间')
        })
    }

    // 写文件内容
    parseContent(content) {
        console.time('生成文件使用时间')
        // 生成文件
        for (let i of content) {
            i.name = i.name.replace(/\//g, '_')
            const filePath = path.join(getAndCreateDir(this.config.outputPath), `/${i.name}.js`)

            // 判断文件是否存在
            const fileStat = fs.statSync(filePath, { throwIfNoEntry: false })
            if (fileStat) {
                // this.createFile(i, filePath)
                // 文件存在，更新文件
                this.updateFile(i, fileStat, filePath)
            } else {
                // 文件不存在，创建新文件
                this.createFile(i, filePath)
            }

        }

        console.timeEnd('生成文件使用时间')
    }

    // 创建新文件
    createFile(data, filePath) {
        const list = data.list
        const funcList = []
        const fileContent = this._getTemplateFile()
            .replace(
                '{REQUEST_FUNCTIONS}',
                list.map(_item => {
                    // 生成请求函数
                    const { requestFunc, funcName, title, method } = this.requestMethod.generate(_item)
                    funcList.push({ funcName, title, method })
                    return requestFunc
                }).join('')
            )
            .replace(
                '{FUNC_INTRODUCTION}',
                this.createIntroduction(funcList, data.name)
            )
        // 写文件
        fs.writeFileSync(filePath, fileContent)
    }

    // 文件模板
    _getTemplateFile() {
        const { requestFuncName, requestFuncPath } = this.config
        return `import ${requestFuncName} from '${requestFuncPath}'
{FUNC_INTRODUCTION}
{REQUEST_FUNCTIONS}
`
    }

    // 生成文件的接口简介
    createIntroduction(funcList, fileName) {
        const comment = `
/**
 * ${fileName} 接口简介：
{CONTENT}
 */`

        return comment.replace(
            '{CONTENT}',
            this.createIntroducByList(funcList)
        )
    }

    createIntroducByList(funcList) {
        return funcList.map((item) => {
            return ` * ${item.title}-${item.funcName}`
        })
        .join('\n')
    }

    // 开始任务
    startTask() {
        if (!this.cookie) {
            throw new Error('还未登录或登录失败')
        } else {
            console.log('开始获取接口列表...')
            console.time('获取接口列表使用时间')
            const opts = {
                url: this.host + path.join(`/api/plugin/export?type=json&pid=${this.pid}&status=all`),
                headers: {
                    Cookie: this.cookie,
                }
            };
            request(opts, (e, r) => {
                try {
                    console.timeEnd('获取接口列表使用时间')
                    const data = JSON.parse(r.body)
                    // if (!data.data) throw new Error('接口获取错误，请确认项目id是否存在')
                    const filterData = this.filterData(data)
                    if (filterData.length) this.parseContent(filterData)
                } catch (e) {
                    console.error(e)
                }
            });
        }
    }

    /**
     * @description: 过滤转换的文件数据
     * @param {array} data 
     * @return {array}
     */
    filterData(data) {
        const { include, exclude } = this.config
        let resList = data

        if (include) {
            const includeArr = strToArr(include || '')
            resList = resList.filter(item => {
                const index = includeArr.findIndex(k => k === item.name)
                if (index !== -1) {
                    includeArr.splice(index, 1)
                    return true
                }
            })
            if (includeArr.length) console.log('include匹配失败模块：', includeArr)
        }

        if (exclude) {
            const excludeArr = strToArr(exclude || '')
            resList = resList.filter(item => !excludeArr.includes(item.name))
        }

        return resList
    }

    // 更新文件
    updateFile(data, fileStat, filePath) {
        const { timeline } = this.config
        const fileTime = fileStat[timeline === 'update' ? 'mtimeMs' : 'birthtimeMs']

        let fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' })

        const updateNameList = []
        const addNameList = []
        data.list.forEach(_item => {
            // 接口是否更新-判断接口是否在时间线之后
            const methodTime = _item.up_time || _item.add_time
            if (dayjs.unix(methodTime).isAfter(dayjs(fileTime))) {
                // 更新接口
                const { requestFunc, funcName, title } = this.requestMethod.generate(_item)
                // 替换函数
                const [replaceRes, _fileContent] = this.replaceFunction(funcName, fileContent, requestFunc)
                if (replaceRes) {
                    // 如果替换成功就将替换后的文件内容复制到 fileContent
                    fileContent = _fileContent
                    updateNameList.push(title)
                } else {
                    // 替换不成功就将函数添加到文件尾部
                    fileContent += requestFunc
                    addNameList.push({ title, funcName })
                }
            }
        })

        if (updateNameList.length) console.log(`${data.name} 模块更新函数：`, updateNameList)
        if (addNameList.length) {
            console.log(`${data.name} 模块新增函数：`, addNameList)
            fileContent = this.addIntroduction(addNameList, fileContent, data.name)
        }
        // 写回文件
        fs.writeFileSync(filePath, fileContent)
    }

    // 把新增的接口添加到接口简介
    addIntroduction(funcList, fileContent, fileName) {
        const regStr = `\\/\\*\\*\\s*\\*\\s*${fileName}\\s+接口简介\\s*(?:\\：|\\:)(?:(?!\\n\\s?\\*\\/)[\\s\\S])*(?=\\n\\s?\\*\\/)`
        const regex = new RegExp(regStr, 'g')

        const match = regex.exec(fileContent)
        if (match) {
            const newIntroduc = this.createIntroducByList(funcList)
            return fileContent.slice(0, regex.lastIndex) + '\n' + newIntroduc + fileContent.slice(regex.lastIndex)
        } else {
            return fileContent
        }
    }

    // 查找并替换原函数
    replaceFunction(funcName, fileContent, newFuncContent) {

        // 正则：/(?:\/\/\s+\b函数名\b\s+start\b)(?:[\s\S])*(?:\/\/\s+\b函数名\b\s+end\b)/g
        // 该正则匹配以下内容：
        // // 函数名 start
        // 任何函数内容
        // // 函数名 end
        const regStr = `(?:\\n\/\/\\s+\\b${funcName}\\b\\s+start\\b)(?:[\\s\\S])*(?:\/\/\\s+\\b${funcName}\\b\\s+end\\b)`
        const regex = new RegExp(regStr, 'g')

        const match = regex.exec(fileContent);
        if (match) {
            const [oldFunc] = match
            let replaceFileContent = fileContent.slice(0, match.index-1) + newFuncContent + fileContent.slice(regex.lastIndex)
            return [true, replaceFileContent]
        } else {
            return [false, newFuncContent]
        }
    }

}

module.exports = YAPI