import {Subject, takeUntil} from 'rxjs'
import {connect as connectToRedux} from 'react-redux'
import {isEqual} from 'hash'
import {isMobile} from 'widget/userAgent'
import {selectFrom} from 'stateUtils'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'
import guid from 'guid'

let storeInstance = null
const storeInitListeners = []

export const initStore = store => {
    storeInstance = store
    storeInitListeners.forEach(listener => listener(store))
}

export const subscribe = (path, listener) => {
    const subscribe = () => storeInstance.subscribe(() => listener(select(path)))
    if (storeInstance)
        subscribe()
    else
        storeInitListeners.push(subscribe)
}

export const state = () =>
    storeInstance.getState() || {}

export const dispatch = action =>
    storeInstance.dispatch(action)

export const select = (...path) =>
    selectFrom(state(), path)
    // _.cloneDeep(selectFrom(state(), path))

const includeDispatchingProp = mapStateToProps =>
    (state, ownProps) => {
        if (ownProps.enabled === false)
            return {}
        return {
            ...mapStateToProps(state, ownProps),
            actions: state.actions || {},
            streams: state.stream && state.stream[ownProps.componentId]
        }
    }

export const connect = mapStateToProps => {
    mapStateToProps = mapStateToProps ? mapStateToProps : () => ({})

    // Component hierarchy:
    // Wrapper
    // ConnectedComponent
    // ReduxConnectedComponent
    // PreventUpdateWhenDisabled
    // WrappedComponent

    return WrappedComponent => {
        const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

        class Wrapper extends React.PureComponent {
            id = `${displayName}:${guid()}`

            constructor() {
                super()
                this.renderEnabled = this.renderEnabled.bind(this)
            }
            
            render() {
                return (
                    <EnabledContext.Consumer>
                        {this.renderEnabled}
                    </EnabledContext.Consumer>
                )
            }

            renderEnabled(enabled) {
                return React.createElement(ConnectedComponent, {
                    ...this.props,
                    enabled,
                    componentId: this.id
                })
            }
        }

        class PreventUpdateWhenDisabled extends React.Component {
            render() {
                return React.createElement(WrappedComponent, this.props)
            }

            shouldComponentUpdate(nextProps) {
                return nextProps.enabled !== false
            }
        }

        const ReduxConnectedComponent = connectToRedux(
            includeDispatchingProp(mapStateToProps), null, null, {
                areStatePropsEqual: isEqual
            }
        )(PreventUpdateWhenDisabled)

        class ConnectedComponent extends React.PureComponent {
            constructor(props) {
                super(props)
                this.id = props.componentId
                this.componentWillUnmount$ = new Subject()
                this.action = this.action.bind(this)
                this.setDisableListener = this.setDisableListener.bind(this)
                this.setEnableListener = this.setEnableListener.bind(this)
                this.stream = stream(this)
            }

            componentWillUnmount() {
                this.componentWillUnmount$.next()
                this.componentWillUnmount$.complete()
            }

            action(type) {
                const actions = select('actions') || {}
                const componentActions = actions[this.props.componentId] || {}
                const undispatched = !componentActions[type]
                const dispatching = componentActions[type] === 'DISPATCHING'
                const completed = componentActions[type] === 'COMPLETED'
                const failed = componentActions[type] === 'FAILED'
                const dispatched = completed || failed
                return {undispatched, dispatching, completed, failed, dispatched}
            }

            setDisableListener(listener) {
                this.onDisable = listener
            }

            setEnableListener(listener) {
                this.onEnable = listener
            }

            render() {
                return React.createElement(ReduxConnectedComponent, {
                    ...this.props,
                    action: this.action,
                    stream: this.stream,
                    onEnable: this.setEnableListener,
                    onDisable: this.setDisableListener,
                    componentWillUnmount$: this.componentWillUnmount$
                })
            }

            componentDidUpdate(prevProps) {
                const wasEnabled = prevProps.enabled
                const isEnabled = this.props.enabled
                if (this.onEnable && wasEnabled !== true && isEnabled === true) {
                    this.onEnable()
                } else if (this.onDisable && wasEnabled !== false && isEnabled === false) {
                    this.onDisable()
                }
            }
        }

        ConnectedComponent.displayName
            = PreventUpdateWhenDisabled.displayName
            = `Store(${WrappedComponent.displayName})`

        return Wrapper
    }
}

export const dispatchable = action => ({
    ...action,
    dispatch: () => dispatch(action)
})

const EnabledContext = React.createContext()

export class Enabled extends React.PureComponent {
    ref = React.createRef()

    constructor() {
        super()
        this.renderEnabled = this.renderEnabled.bind(this)
    }

    render() {
        return (
            <EnabledContext.Consumer>
                {this.renderEnabled}
            </EnabledContext.Consumer>
        )
    }

    renderEnabled(parentValue) {
        const {value} = this.props
        return this.renderChildren(value !== false && parentValue !== false)
    }

    renderChildren(enabled) {
        const {className, enabledClassName, disabledClassName, children} = this.props
        return (
            <div
                style={{
                    height: '100%',
                    width: '100%'
                }}
                className={[
                    className,
                    enabled ? enabledClassName : disabledClassName,
                ].join(' ')}>
                <EnabledContext.Provider value={enabled}>
                    {children}
                </EnabledContext.Provider>
            </div>
        )
    }

    componentDidUpdate(prevProps) {
        const prevValue = prevProps.value
        const value = this.props.value
        if (!value && value !== prevValue && document.activeElement && isMobile()) {
            document.activeElement && document.activeElement.blur()
        }
    }
}

Enabled.propTypes = {
    children: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
    className: PropTypes.string,
    disabledClassName: PropTypes.string,
    enabledClassName: PropTypes.string
}

const stream = component => {
    const streamStatus = status => ({
        active: status === 'ACTIVE',
        failed: status === 'FAILED',
        completed: status === 'COMPLETED'
    })

    const f = ({name, stream$, onNext, onError, onComplete}) => {
        const componentPath = `stream.${component.id}`
        const statePath = `${componentPath}.${name}`

        if (!stream$) {
            return streamStatus(select(statePath))
        }

        const setStatus = status =>
            actionBuilder('SET_STREAM_STATUS', {statePath, status})
                .set(statePath, status)
                .dispatch()

        setStatus('ACTIVE')

        let unmounted = false
        component.componentWillUnmount$.subscribe(() => {
            unmounted = true
            select(componentPath) && actionBuilder('REMOVE_STREAM_STATUS', {componentPath, name})
                .del(componentPath)
                .dispatch()
        })

        stream$
            .pipe(
                takeUntil(component.componentWillUnmount$)
            ).subscribe(
                next => {
                    onNext && onNext(next)
                },
                error => {
                    unmounted || setStatus('FAILED')
                    if (onError) {
                        onError(error)
                    } else {
                        throw error
                    }
                },
                () => {
                    unmounted || setStatus('COMPLETED')
                    onComplete && onComplete()
                }
            )
    }

    return (...args) => {
        if (args.length === 1 && _.isObject(args[0])) {
            return f(args[0])
        } else {
            const [name, stream$, onNext, onError, onComplete] = args
            return f({name, stream$, onNext, onError, onComplete})
        }
    }
}
