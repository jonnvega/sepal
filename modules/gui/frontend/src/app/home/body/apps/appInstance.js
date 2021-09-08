import {ContentPadding} from 'widget/sectionLayout'
import {compose} from 'compose'
import {connect} from 'store'
import {forkJoin, timer} from 'rxjs'
import {msg} from 'translate'
import {runApp$} from 'apps'
import {withTabContext} from 'widget/tabs/tabContext'
import Notifications from 'widget/notifications'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './appInstance.module.css'

class AppInstance extends React.Component {
    state = {
        appState: 'REQUESTED'
    }

    constructor(props) {
        super(props)
        this.runApp(props.app)
    }

    runApp(app) {
        this.props.stream('RUN_APP',
            forkJoin([
                runApp$(app.path),
                timer(500)
            ]),
            () => this.onInitialized(),
            () => Notifications.error({message: msg('apps.run.error', {label: app.label || app.alt})})
        )
    }

    onInitialized() {
        this.setState(({appState}) =>
            appState === 'READY'
                ? null
                : {appState: 'INITIALIZED'}
        )
    }

    componentDidMount() {
        const {busy$} = this.props
        busy$.next(true)
    }

    render() {
        const {app: {label, alt}} = this.props
        return (
            <ContentPadding
                menuPadding
                className={styles.appInstance}>
                <div className={styles.content}>
                    <div className={styles.backdrop}>
                        {label || alt}
                    </div>
                    <div className={styles.status}>
                        {this.renderStatus()}
                    </div>
                    {this.renderIFrame()}
                </div>
            </ContentPadding>
        )
    }

    renderIFrame() {
        const {app: {path, label, alt}} = this.props
        const {appState} = this.state
        return this.props.stream('RUN_APP').completed
            ? (
                <iframe
                    width='100%'
                    height='100%'
                    frameBorder='0'
                    src={`/api${path}`}
                    title={label || alt}
                    style={{display: appState === 'READY' ? 'block' : 'none'}}
                    onLoad={() => this.ready()}
                />
            )
            : null
    }

    renderStatus() {
        const {appState} = this.state
        return appState === 'REQUESTED'
            ? msg('apps.initializing')
            : appState !== 'READY'
                ? msg('apps.loading.progress')
                : null
    }

    ready() {
        const {busy$} = this.props
        busy$.next(false)
        this.setState({appState: 'READY'})
    }
}

AppInstance.propTypes = {
    app: PropTypes.shape({
        alt: PropTypes.string,
        label: PropTypes.string,
        path: PropTypes.string
    })
}

AppInstance.contextTypes = {
    active: PropTypes.bool,
    focus: PropTypes.func
}

export default compose(
    AppInstance,
    connect(),
    withTabContext()
)
