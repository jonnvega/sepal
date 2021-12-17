const program = require('commander')
const fs = require('fs')
const log = require('sepal/log').getLogger('config')
const _ = require('lodash')

const DEFAULT_PORT = 5001

program
    .option('--gee-email <value>')
    .option('--gee-key-path <value>')
    .option('--gee-key <value>')
    .option('--sepal-host <value>')
    .option('--sepal-username <value>')
    .option('--sepal-password <value>')
    .option('--port <number>', 'Port', DEFAULT_PORT)
    .parse(process.argv)

const {geeEmail,
    geeKey,
    geeKeyPath,
    sepalHost,
    sepalUsername,
    sepalPassword,
    port
} = program.opts()

const readFile = path => {
    try {
        return fs.readFileSync(path, {encoding: 'utf8'})
    } catch (error) {
        log.warn(`Cannot read GEE key: ${path}`)
        return null
    }
}

const serviceAccountCredentials = {
    client_email: geeEmail,
    private_key: geeKey
        ? _.replace(geeKey, /\\n/g, '\n')
        : readFile(geeKeyPath)
}

log.info('Configuration loaded')

module.exports = {
    serviceAccountCredentials,
    sepalHost,
    sepalUsername,
    sepalPassword,
    port
}
