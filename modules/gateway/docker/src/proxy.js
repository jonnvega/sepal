const {authMiddleware} = require('./auth')
const {createProxyMiddleware} = require('http-proxy-middleware')
const {rewriteLocation} = require('./rewrite')
const {endpoints} = require('./endpoints')
const {categories: {proxy: sepalLogLevel}} = require('./log.json')
const {modules, sepalHost} = require('./config')
const {get$} = require('sepal/httpClient')
const {EMPTY, map} = require('rxjs')
const proxyLog = require('sepal/log').getLogger('proxy')
const log = require('sepal/log').getLogger('gateway')

const currentUserUrl = `http://${modules.user}/current`
const proxyEndpoints = app => endpoints.map(proxy(app))

const logProvider = () => ({
    log: proxyLog.debug,
    debug: proxyLog.trace,
    info: proxyLog.info,
    warn: proxyLog.warn,
    error: proxyLog.error
})

const logLevel = sepalLogLevel === 'trace'
    ? 'debug'
    : sepalLogLevel

const proxy = app =>
    ({path, target, authenticate, cache, noCache, rewrite}) => {
        const proxyMiddleware = createProxyMiddleware(path, {
            target,
            logProvider,
            logLevel,
            proxyTimeout: 60 * 1000,
            timeout: 60 * 1000,
            pathRewrite: {[`^${path}`]: ''},
            onOpen: () => {
                log.trace('WebSocket opened')
            },
            onClose: () => {
                log.trace('WebSocket closed')
            },
            onProxyReq: (proxyReq, req) => {
                // Make sure the client doesn't inject the user header, and pretend to be another user.
                proxyReq.removeHeader('sepal-user')
                const user = req.session && req.session.user
                const username = user ? user.username : 'not-authenticated'
                req.socket.on('close', () => {
                    log.trace(`[${username}] [${req.originalUrl}] Response closed`)
                    proxyReq.destroy()
                })
                if (authenticate && user) {
                    log.trace(`[${username}] [${req.originalUrl}] Setting sepal-user header`, user)
                    proxyReq.setHeader('sepal-user', JSON.stringify(user))
                } else {
                    log.trace(`[${username}] [${req.originalUrl}] No sepal-user header set`)
                }
                if (cache) {
                    log.trace(`[${username}] [${req.originalUrl}] Enabling caching`)
                    proxyReq.setHeader('Cache-Control', 'public, max-age=31536000')
                }
                if (noCache) {
                    log.trace(`[${username}] [${req.originalUrl}] Disabling caching`)
                    proxyReq.removeHeader('If-None-Match')
                    proxyReq.removeHeader('If-Modified-Since')
                    proxyReq.removeHeader('Cache-Control')
                    proxyReq.setHeader('Cache-Control', 'no-cache')
                    proxyReq.setHeader('Cache-Control', 'max-age=0')
                }
            },
            onProxyRes: (proxyRes, req) => {
                if (rewrite) {
                    const location = proxyRes.headers['location']
                    if (location) {
                        const rewritten = rewriteLocation({path, target, location})
                        log.debug(() => `Rewriting location header from "${location}" to "${rewritten}"`)
                        proxyRes.headers['location'] = rewritten
                    }
                }
                if (proxyRes.headers['sepal-user-updated']) {
                    updateUserInSession(req)
                }
                proxyRes.headers['Content-Security-Policy'] = `connect-src 'self' https://${sepalHost} wss://${sepalHost} https://*.googleapis.com https://apis.google.com https://*.google.com https://*.planet.com https://registry.npmjs.org; frame-ancestors 'self' https://${sepalHost} https://*.googleapis.com https://apis.google.com https://*.google-analytics.com https://registry.npmjs.org`
            }
        })

        app.use(path, ...(authenticate
            ? [authMiddleware, proxyMiddleware]
            : [proxyMiddleware])
        )
        return {path, target, proxy: proxyMiddleware}
    }

const updateUserInSession = req => {
    if (req.session && req.session.user) {
        const user = req.session.user
        log.debug(`[${user.username}] [${req.url}] Updating user in session`)
        return get$(currentUserUrl, {
            headers: {'sepal-user': JSON.stringify(user)}
        }).pipe(
            map((({body}) => JSON.parse(body))),
        ).subscribe({
            next: user => {
                log.debug(() => `[${user.username}] [${req.url}] Updated user in session`)
                req.session.user = user
                req.session.save()
            },
            error: error => log.error(`[${user.username}] [${req.url}] Failed to load current user`, error)
        })
    } else {
        log.warn('[not-authenticated] Updated user, but no user in session')
        return EMPTY
    }
}

module.exports = {proxyEndpoints}
