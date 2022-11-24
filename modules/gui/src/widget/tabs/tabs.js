import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {Content, SectionLayout, TopBar} from 'widget/sectionLayout'
import {Scrollable, ScrollableContainer} from 'widget/scrollable'
import {Subject, delay, filter} from 'rxjs'
import {TabContent} from './tabContent'
import {TabHandle} from './tabHandle'
import {compose} from 'compose'
import {connect, select} from 'store'
import {isMobile} from 'widget/userAgent'
import {msg} from 'translate'
import {withSubscriptions} from 'subscription'
import Keybinding from 'widget/keybinding'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'
import guid from 'guid'
import styles from './tabs.module.css'

const CLOSE_ANIMATION_DURATION_MS = 250

const close$ = new Subject()

export const addTab = statePath => {
    const id = guid()
    const tab = {id, placeholder: msg('widget.tabs.newTab')}
    actionBuilder('ADD_TAB')
        .push([statePath, 'tabs'], tab)
        .set([statePath, 'selectedTabId'], id)
        .dispatch()
    return tab
}

export const closeTab = (id, statePath, nextId) => {
    close$.next({id, statePath, nextId})
    actionBuilder('CLOSING_TAB')
        .set([statePath, 'tabs', {id}, 'ui.closing'], true)
        .dispatch()
}

export const renameTab = (title, tabPath, onTitleChanged) => {
    actionBuilder('RENAME_TAB')
        .set([tabPath, 'title'], title)
        .dispatch()
    setTimeout(() => onTitleChanged && onTitleChanged(select(tabPath)), 0)
}

export const selectTab = (id, statePath) => {
    actionBuilder('SELECT_TAB')
        .set([statePath, 'selectedTabId'], id)
        .dispatch()
}

export const getTabsInfo = statePath => {
    const tabs = select([statePath, 'tabs'])
    const selectedId = select([statePath, 'selectedTabId'])
    if (tabs && selectedId) {
        const selectedIndex = tabs.findIndex(tab => tab.id === selectedId)
        const first = selectedIndex === 0
        const last = selectedIndex === tabs.length - 1
        const single = first && last
        const previousId = !first && tabs[selectedIndex - 1].id
        const nextId = !last && tabs[selectedIndex + 1].id
        return {
            tabs,
            selectedId,
            selectedIndex,
            first,
            last,
            single,
            previousId,
            nextId
        }
    }
    return {}
}

const nextSelectedTabId = (id, statePath) => {
    const tabs = select([statePath, 'tabs'])
    const tabIndex = tabs.findIndex(tab => tab.id === id)
    const first = tabIndex === 0
    const last = tabIndex === tabs.length - 1
    if (!last) {
        return tabs[tabIndex + 1].id
    }
    if (!first) {
        return tabs[tabIndex - 1].id
    }
    return null
}

const finalizeCloseTab = (id, statePath, nextId) => {
    actionBuilder('CLOSE_TAB')
        .set([statePath, 'selectedTabId'], nextId || nextSelectedTabId(id, statePath))
        .del([statePath, 'tabs', {id}])
        .dispatch()
}

const mapStateToProps = (state, ownProps) => ({
    tabs: select([ownProps.statePath, 'tabs']) || [],
    selectedTabId: select([ownProps.statePath, 'selectedTabId'])
})

class _Tabs extends React.Component {
    constructor(props) {
        super(props)
        this.renderTab = this.renderTab.bind(this)
        const {tabs, statePath} = props
        if (tabs.length === 0) {
            addTab(statePath)
        }
    }

    busy$ = new Subject()

    renderTab(tab) {
        const {selectedTabId, statePath, onTitleChanged} = this.props
        return (
            <TabHandle
                key={tab.id}
                id={tab.id}
                title={tab.title}
                placeholder={tab.placeholder}
                selected={tab.id === selectedTabId}
                busy$={this.busy$}
                closing={tab.ui && tab.ui.closing}
                statePath={statePath}
                onTitleChanged={onTitleChanged}
                onClose={() => this.onClose(tab)}
            />
        )
    }

    renderTabContent(tab) {
        const {selectedTabId, children} = this.props
        return (
            <TabContent
                key={tab.id}
                id={tab.id}
                type={tab.type}
                selected={tab.id === selectedTabId}
                busy$={this.busy$}
            >
                {children}
            </TabContent>
        )
    }

    renderTabs() {
        const {tabs, selectedTabId, tabActions} = this.props
        return (
            <Keybinding keymap={{
                'Ctrl+Shift+W': () => this.closeTab(selectedTabId),
                'Ctrl+Shift+T': () => this.addTab(),
                'Ctrl+Shift+ArrowLeft': () => this.selectPreviousTab(),
                'Ctrl+Shift+ArrowRight': () => this.selectNextTab()
            }}>
                <ScrollableContainer>
                    <Scrollable direction='x' className={styles.tabs}>
                        {tabs.map(this.renderTab)}
                    </Scrollable>
                </ScrollableContainer>
                <div className={styles.tabActions}>
                    {isMobile() || this.renderNavigationButtons()}
                    {this.renderAddButton()}
                    {tabActions && tabActions(selectedTabId)}
                </div>
            </Keybinding>
        )
    }

    onClose(tab) {
        const {onClose} = this.props
        onClose ? onClose(tab, () => this.closeTab(tab.id)) : this.closeTab(tab.id)
    }

    selectPreviousTab() {
        const {statePath} = this.props
        const previousId = getTabsInfo(statePath).previousId
        if (previousId) {
            selectTab(previousId, statePath)
        }
    }

    selectNextTab() {
        const {statePath} = this.props
        const nextId = getTabsInfo(statePath).nextId
        if (nextId) {
            selectTab(nextId, statePath)
        }
    }

    isFirstTab() {
        const {statePath} = this.props
        return getTabsInfo(statePath).first
    }

    isLastTab() {
        const {statePath} = this.props
        return getTabsInfo(statePath).last
    }

    renderNavigationButtons() {
        return (
            <ButtonGroup layout='horizontal-nowrap'>
                <Button
                    chromeless
                    look='transparent'
                    size='large'
                    shape='circle'
                    icon='chevron-left'
                    onClick={() => this.selectPreviousTab()}
                    disabled={this.isFirstTab()}/>
                <Button
                    chromeless
                    look='transparent'
                    size='large'
                    shape='circle'
                    icon='chevron-right'
                    onClick={() => this.selectNextTab()}
                    disabled={this.isLastTab()}/>
            </ButtonGroup>
        )
    }

    isAddDisabled() {
        const {tabs, selectedTabId, isLandingTab} = this.props
        const selectedTab = tabs.find(tab => tab.id === selectedTabId)
        return selectedTab && isLandingTab && isLandingTab(selectedTab)
    }

    renderAddButton() {
        const {onAdd} = this.props
        return (
            <Button
                chromeless
                look='transparent'
                size='large'
                shape='circle'
                icon='plus'
                tooltip={msg('widget.tabs.addTab.tooltip')}
                tooltipPlacement='bottom'
                disabled={this.isAddDisabled() && !onAdd}
                onClick={() => this.addTab()}/>
        )
    }

    addTab() {
        const {onAdd} = this.props
        const {statePath, tabs, isLandingTab} = this.props
        if (!this.isAddDisabled()) {
            if (isLandingTab) {
                const tab = tabs.find(tab => isLandingTab(tab))
                if (tab) {
                    return selectTab(tab.id, statePath)
                }
            }
            addTab(statePath)
        } else {
            onAdd && onAdd()
        }
    }

    closeTab(id) {
        const {statePath} = this.props
        closeTab(id, statePath)
    }

    render() {
        const {label} = this.props
        return (
            <SectionLayout className={styles.container}>
                <TopBar
                    padding={false}
                    label={label}>
                    {this.renderTabs()}
                </TopBar>
                <Content>
                    <div className={styles.tabContents}>
                        {this.props.tabs.map(tab => this.renderTabContent(tab))}
                    </div>
                </Content>
            </SectionLayout>
        )
    }

    handleCloseTab() {
        const {addSubscription, statePath} = this.props
        addSubscription(
            close$.pipe(
                filter(tab => tab.statePath === statePath),
                delay(CLOSE_ANIMATION_DURATION_MS * 1.2),
            ).subscribe(
                ({id, statePath, nextId}) => finalizeCloseTab(id, statePath, nextId)
            )
        )
    }

    componentDidMount() {
        this.handleCloseTab()
    }

    componentDidUpdate() {
        const {tabs, statePath} = this.props
        if (tabs.length === 0) {
            addTab(statePath)
        }
    }
}

export const Tabs = compose(
    _Tabs,
    connect(mapStateToProps),
    withSubscriptions()
)

Tabs.propTypes = {
    label: PropTypes.string.isRequired,
    statePath: PropTypes.string.isRequired,
    children: PropTypes.any,
    isDirty: PropTypes.func,
    isLandingTab: PropTypes.func,
    selectedTabId: PropTypes.string,
    tabActions: PropTypes.func,
    tabs: PropTypes.array,
    onAdd: PropTypes.func,
    onClose: PropTypes.func,
    onTitleChanged: PropTypes.func
}
