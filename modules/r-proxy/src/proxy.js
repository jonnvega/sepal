const log = require('sepal/log').getLogger('proxy')
const http = require('http')
const {httpPort} = require('./config')

const {serveCran} = require('./proxy-cran')
const {serveGitHub} = require('./proxy-github')

const initProxy = () => {
    const handleRequest = async (req, res) =>
        req.url.startsWith('/github/')
            ? await serveGitHub(req, res)
            : await serveCran(req, res)

    if (httpPort) {
        http.createServer((req, res) =>
            handleRequest(req, res).catch(error => log.error(error))
        ).listen(httpPort)
        log.info(`Listening on port ${httpPort}`)
    } else {
        log.fatal('No listening port configured.')
    }
}

module.exports = {initProxy}
