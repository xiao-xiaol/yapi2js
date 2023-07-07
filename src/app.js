const API = require('./api')


module.exports = (config) => {

    // 初始化
    const YAIPI_INSTANCE = new API(config)

    // 登录，完成后进行生成
    YAIPI_INSTANCE.login({
        email: config.email,
        password: config.password
    })
    .then(() => {
        YAIPI_INSTANCE.startTask()
    })
    .catch((e) => {
        console.log('登录失败:',e)
    })
}