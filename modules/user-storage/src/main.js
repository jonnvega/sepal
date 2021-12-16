require('sepal/log').configureServer(require('./log.json'))
const log = require('sepal/log').getLogger('main')

const _ = require('lodash')

const {initMessageQueue} = require('sepal/messageQueue')
const {amqpUri} = require('./config')
const {scheduleFullScan} = require('./scan')
const {scanComplete$, logStats} = require('./jobQueue')
const {messageHandler} = require('./messageHandler')

const main = async () => {
    await initMessageQueue(amqpUri, {
        publishers: [
            {key: 'userStorage.size', publish$: scanComplete$},
        ],
        subscribers: [
            {queue: 'userStorage.workerSession', topic: 'workerSession.#', handler: messageHandler},
            {queue: 'userStorage.files', topic: 'files.#', handler: messageHandler}
        ]
    })

    await scheduleFullScan()
    await logStats()
    log.info('Initialized')
}

main().catch(log.fatal)