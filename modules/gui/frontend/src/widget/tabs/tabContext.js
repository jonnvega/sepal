import {Subject} from 'rxjs'
import {compose} from 'compose'
import {finalize} from 'rxjs/operators'
import {v4 as uuid} from 'uuid'
import {withContext} from 'context'
import React from 'react'
import withSubscriptions from 'subscription'

export const TabContext = React.createContext()

export const withTabContext = () =>
    WrappedComponent => compose(
        class HigherOrderComponent extends React.Component {
            constructor(props) {
                super(props)
                this.busy$ = this.createBusy$()
            }

            render() {
                const props = {
                    ...this.props,
                    busy$: this.busy$
                }
                return React.createElement(WrappedComponent, props)
            }

            createBusy$() {
                const {tabContext: {id, busy$}, addSubscription} = this.props
                const label = uuid()
                const busyTab$ = new Subject()
                const setBusy = busy => busy$.next({id, label, busy})
        
                addSubscription(
                    busyTab$.pipe(
                        finalize(() => setBusy(false))
                    ).subscribe({
                        next: busy => setBusy(busy)
                    })
                )
        
                return busyTab$
            }
        },
        withContext(TabContext, 'tabContext')(),
        withSubscriptions()
    )
