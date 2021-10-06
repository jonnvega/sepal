const {Subject, ReplaySubject, defer, zip, concat, of} = require('rxjs')
const {debounceTime, delay, filter, finalize, first, map, mapTo, scan, tap} = require('rxjs/operators')
const {v4: uuid} = require('uuid')
const _ = require('lodash')
const {tag} = require('sepal/tag')
const log = require('sepal/log').getLogger('tokenLimiter')

const tokenLimiterTag = name => tag('TokenLimiter', name)
const tokenTag = ({requestId, rateToken, concurrencyToken}) => tag('Token', requestId, rateToken ? `R${rateToken}` : null, concurrencyToken ? `C${concurrencyToken}` : null)

const DEFAULT_RATE_WINDOW_MS = 1000
const DEFAULT_IDLE_MS = 5000

const TokenLimiter$ = ({name, rateWindowMs = DEFAULT_RATE_WINDOW_MS, maxRate, maxConcurrency, idleMs = DEFAULT_IDLE_MS}, onIdle) => {

    const requestId$ = new Subject()
    const rateToken$ = new Subject()
    const concurrencyToken$ = new Subject()
    const responseToken$ = new Subject()
    const count$ = new Subject()

    const msg = msg =>
        `${tokenLimiterTag(name)} ${msg}`

    const initialToken$ = count =>
        of(...(_.range(1, count + 1)))

    const rateLimit$ = maxRate
        ? concat(initialToken$(maxRate), rateToken$)
        : requestId$.pipe(mapTo())

    const concurrencyLimit$ = maxConcurrency
        ? concat(initialToken$(maxConcurrency), concurrencyToken$)
        : requestId$.pipe(mapTo())

    const token$ = zip(
        requestId$,
        rateLimit$,
        concurrencyLimit$
    ).pipe(
        map(([requestId, rateToken, concurrencyToken]) =>
            ({requestId, rateToken, concurrencyToken})
        )
    )

    const serveToken = token =>
        responseToken$.next(token)

    const assertToken = token => {
        if (!token) {
            throw new Error('Token is required')
        }
    }

    const recycleRateToken = token => {
        assertToken(token)
        if (maxRate) {
            log.debug(() => msg(`recycling rate token from ${tokenTag(token)}`))
            rateToken$.next(token.rateToken)
        }
    }

    const recycleConcurrencytoken = (token, cancelled) => {
        assertToken(token)
        if (maxConcurrency) {
            log.debug(() => msg(`recycling ${cancelled ? 'cancelled concurrency token' : 'concurrency token'} from ${tokenTag(token)}`))
            concurrencyToken$.next(token.concurrencyToken)
        }
    }

    token$.pipe(
        tap(token => serveToken(token)),
        delay(rateWindowMs)
    ).subscribe({
        next: token => recycleRateToken(token),
        error: error => log.fatal(msg('token stream failed:'), error),
        complete: () => log.fatal(msg('token stream completed'))
    })

    count$.pipe(
        scan((count, current) => count + current, 0),
        map(count => count === 0),
        debounceTime(idleMs)
    ).subscribe(
        idle => {
            if (idle) {
                log.debug(() => msg('idle'))
                onIdle && onIdle()
            }
        }
    )

    const CurrentToken = () => {
        const current = {}
        count$.next(1)
        return {
            set(token) {
                current.token = token
            },
            recycleOrCancel() {
                if (current.token) {
                    count$.next(-1)
                    recycleConcurrencytoken(current.token, false)
                } else {
                    current.cancel = true
                }
            },
            recycleCancelled() {
                if (current.token && current.cancel) {
                    count$.next(-1)
                    recycleConcurrencytoken(current.token, true)
                }
            }
        }
    }

    return (requestId = uuid()) => {
        log.debug(() => msg(`requesting ${tokenTag({requestId})}`))
        const response$ = new ReplaySubject()
        const currentToken = CurrentToken()

        responseToken$.pipe(
            filter(({requestId: currentRequestId}) => currentRequestId === requestId),
            tap(token => currentToken.set(token)),
            first(),
            finalize(() => currentToken.recycleCancelled()),
        ).subscribe({
            next: token => {
                log.debug(() => msg(`serving ${tokenTag(token)}`))
                response$.next()
            },
            error: error => log.fatal(msg('token stream failed:'), error)
            // stream is allowed to complete
        })

        return defer(() => {
            requestId$.next(requestId)
            return response$.pipe(
                finalize(() => currentToken.recycleOrCancel()),
            )
        })
    }
}

module.exports = {TokenLimiter$}
