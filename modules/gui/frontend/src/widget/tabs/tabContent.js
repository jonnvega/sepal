import {Enabled} from 'store'
import {PortalContainer, PortalContext} from 'widget/portal'
import {TabContext} from './tabContext'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import styles from './tabContent.module.css'

export class TabContent extends React.PureComponent {
    render() {
        const {id, busy$, type, selected, children} = this.props
        const portalContainerId = `portal_tab_${id}`
        const tabContext = {id, busy$}
        return (
            <div className={[
                styles.tabContent,
                selected && styles.selected
            ].join(' ')}>
                <Enabled value={selected}>
                    <PortalContainer id={portalContainerId}/>
                    <TabContext.Provider value={tabContext}>
                        <PortalContext id={portalContainerId}>
                            {children({id, type})}
                        </PortalContext>
                    </TabContext.Provider>
                </Enabled>
            </div>
        )
    }
}

TabContent.propTypes = {
    busy$: PropTypes.any,
    children: PropTypes.any,
    id: PropTypes.string,
    selected: PropTypes.any,
    type: PropTypes.string,
    onDisable: PropTypes.func,
    onEnable: PropTypes.func
}
