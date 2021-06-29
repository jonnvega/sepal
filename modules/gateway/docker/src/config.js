const program = require('commander')
const log = require('sepal/log').getLogger('config')
const {readFileSync} = require('fs')

const DEFAULT_PORT = 8001

program
    .option('--port <number>', 'Port', DEFAULT_PORT)
    .option('--modules <value>', 'Modules', '/etc/sepal/module.d/gateway/modules.json')
    .parse(process.argv)

const {
    port,
    modules
} = program.opts()

const readModules = () => {
    try {
        return JSON.parse(readFileSync(modules, {encoding: 'utf8'}))
    } catch (error) {
        log.error(`Cannot read modules file: ${modules}`)
        throw error
    }
}

log.info('Configuration loaded')

module.exports = {
    port,
    modules: readModules()
}
