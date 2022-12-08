import {Browse} from './browse/browse'
import {CenteredProgress} from 'widget/progress'
import {Maps} from 'app/home/map/maps'
import {Section} from './section'
import {StaticMap} from '../map/staticMap'
import {Users} from './users/users'
import {compose} from 'compose'
import {connect, select} from 'store'
import {history, location} from 'route'
import {msg} from 'translate'
import Apps from './apps/apps'
import Notifications from 'widget/notifications'
import Process from './process/process'
import PropTypes from 'prop-types'
import React from 'react'
import Tasks from './tasks/tasks'
import Terminal from './terminal/terminal'
import styles from './body.module.css'

const mapStateToProps = () => ({
    location: location(),
    budgetExceeded: select('user.budgetExceeded'),
})

class Body extends React.Component {
    componentDidUpdate() {
        const {budgetExceeded, location} = this.props
        if (this.props.location.pathname === '/' || budgetExceeded && !['/process', '/browse', '/users'].includes(location.pathname)) {
            history().replace('/process')
        }
    }

    renderSections() {
        const {className} = this.props
        return (
            <div className={className}>
                <div className={styles.sections}>
                    <StaticMap/>
                    <Section path='/process'>
                        <Process/>
                    </Section>
                    <Section path='/browse'>
                        <Browse tabId='foo'/>
                    </Section>
                    <Section path='/app-launch-pad'>
                        <Apps/>
                    </Section>
                    <Section path='/terminal'>
                        <Terminal/>
                    </Section>
                    <Section path='/tasks'>
                        <Tasks/>
                    </Section>
                    <Section path='/users'>
                        <Users/>
                    </Section>
                </div>
            </div>
        )
    }

    renderProgress() {
        const {className} = this.props
        return <CenteredProgress title={msg('body.starting-sepal')} className={className}/>
    }

    render() {
        return (
            <Maps onError={() => Notifications.error({message: msg('body.starting-sepal-failed'), timeout: -1})}>
                {(initialized, error) => error
                    ? null
                    : initialized
                        ? this.renderSections()
                        : this.renderProgress()
                }
            </Maps>
        )
    }
}

Body.propTypes = {
    className: PropTypes.string,
    location: PropTypes.object
}

export default compose(
    Body,
    connect(mapStateToProps)
)
