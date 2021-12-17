import {AppItem} from './appItem'
import {Markdown} from 'widget/markdown'
import {Panel} from 'widget/panel/panel'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './appDetails.module.css'

export const AppDetails = props => {
    const {app, onClose} = props
    return (
        <Panel className={styles.panel} type='modal'>
            <Panel.Header>
                <AppItem app={app}/>
            </Panel.Header>
            <Panel.Content
                scrollable
                className={styles.panelContent}>
                <Markdown source={app.description}/>
                <div className={styles.footer}>
                    {app.author ? <Author app={app}/> : null}
                    {app.projectLink ? <ProjectLink app={app}/> : null}
                </div>
            </Panel.Content>
            <Panel.Buttons onEnter={onClose} onEscape={onClose}>
                <Panel.Buttons.Main>
                    <Panel.Buttons.Close onClick={onClose}/>
                </Panel.Buttons.Main>
            </Panel.Buttons>
        </Panel>
    )
}

const Author = ({app}) =>
    <div className={styles.author}>
        {msg('apps.developedBy', {author: app.author})}
    </div>

const ProjectLink = ({app}) =>
    <div className={styles.projectLink}>
        <a href={app.projectLink} rel='noopener noreferrer' target='_blank'>{app.projectLink}</a>
    </div>

AppDetails.propTypes = {
    app: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired
}
