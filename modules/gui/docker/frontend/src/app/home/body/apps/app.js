import {AppList} from './appList/appList'
import {closeTab} from 'widget/tabs/tabs'
import {compose} from 'compose'
import {connect} from 'store'
import {selectFrom} from 'stateUtils'
import AppInstance from './appInstance'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'

const mapStateToProps = state => ({
    runningApps: selectFrom(state, 'apps.tabs')
})

class App extends React.Component {
    state = {
        app: null
    }

    render() {
        const {app} = this.state
        return app
            ? <AppInstance app={app}/>
            : <AppList onSelect={app => this.runApp(app)}/>
    }

    runApp(app) {
        const {id, runningApps} = this.props
        const runningApp = _.find(runningApps, runningApp => runningApp.path === app.path)
        if (app.single && runningApp) {
            closeTab(id, 'apps', runningApp.id)
        } else {
            this.setState({app})
            actionBuilder('SET_TAB_PLACEHOLDER', {id, app})
                .assign(['apps.tabs', {id}], {
                    placeholder: app.label,
                    title: app.label,
                    path: app.path
                })
                .dispatch()
        }
    }
}

export default compose(
    App,
    connect(mapStateToProps)
)

App.propTypes = {
    id: PropTypes.string.isRequired,
}
