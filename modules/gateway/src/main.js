require('sepal/log').configureServer(require('./log.json'))
const {redisUri, port, secure} = require('./config')
const {isMatch} = require('micromatch')
const express = require('express')
const Redis = require('ioredis')
const session = require('express-session')
const {logout} = require('./logout')
const {proxyEndpoints} = require('./proxy')
const {v4: uuid} = require('uuid')
const url = require('url')
const log = require('sepal/log').getLogger('gateway')

const redis = new Redis(redisUri)
const RedisSessionStore = require('connect-redis')(session)

const getSecret = async () => {
    const secret = await redis.get('secret')

    if (secret) {
        log.info('Reusing saved secret')
        return secret
    } else {
        const secret = uuid()
        log.info('Creating new secret')
        redis.set('secret', secret)
        return secret
    }
}

const main = async () => {
    const app = express()
    const secret = await getSecret()

    const sessionParser = session({
        store: new RedisSessionStore({client: redis}),
        secret,
        name: 'SEPAL-SESSIONID',
        cookie: {
            httpOnly: true,
            sameSite: secure,
            secure
        },
        proxy: true,
        resave: false,
        saveUninitialized: false,
        unset: 'destroy'
    })
    
    app.use(sessionParser)
    app.use('/api/user/logout', logout)
    const proxies = proxyEndpoints(app)
    const server = app.listen(port)

    // avoid MaxListenersExceededWarning
    server.setMaxListeners(30)
    
    server.on('upgrade', (req, socket, head) => {
        sessionParser(req, {}, () => { // Make sure we have access to session for the websocket
            const requestPath = url.parse(req.url).pathname
            const user = req.session.user
            const username = user ? user.username : 'not-authenticated'
            if (user) {
                log.trace(`[${username}] [${requestPath}] Setting sepal-user header`)
                req.headers['sepal-user'] = JSON.stringify(user)
            } else {
                log.warn(`[${username}] Websocket upgrade without a user`)
            }
            const {proxy, target} = proxies.find(({path}) => !path || requestPath === path || isMatch(requestPath, `${path}/**`)) || {}
            if (proxy) {
                log.debug(`[${username}] Requesting WebSocket upgrade for "${requestPath}" to target "${target}"`)
                proxy.upgrade(req, socket, head)
            } else {
                log.warn(`[${username}] No proxy found for WebSocket upgrade "${requestPath}"`)
            }
        })
    })
    
    process.on('uncaughtException', error => {
        log.fatal('Uncaught exception', error)
    })
}

main().catch(error => {
    log.fatal(error)
    process.exit(1)
})