import {FormPanelContext} from './panel'
import {Panel} from 'widget/panel/panel'
import PropTypes from 'prop-types'
import React from 'react'

export class FormPanelButtons extends React.Component {
    render() {
        return (
            <FormPanelContext.Consumer>
                {props => {
                    const renderProps = {...props, ...this.props}
                    const inWizard = renderProps.wizard && renderProps.wizard.includes(renderProps.id)
                    return inWizard ? this.renderWizard(renderProps) : this.renderForm(renderProps)
                }}
            </FormPanelContext.Consumer>
        )
    }

    renderForm({isActionForm, dirty, invalid, onOk, onCancel}) {
        const {applyLabel} = this.props
        const canSubmit = isActionForm || dirty
        return (
            <Panel.Buttons>
                <Panel.Buttons.Main>
                    <Panel.Buttons.Cancel
                        hidden={!canSubmit}
                        keybinding='Escape'
                        onClick={onCancel}/>
                    <Panel.Buttons.Apply
                        type={'submit'}
                        label={applyLabel}
                        hidden={!canSubmit}
                        disabled={invalid}
                        keybinding='Enter'
                        onClick={onOk}/>
                    <Panel.Buttons.Close
                        type={'submit'}
                        label={applyLabel}
                        hidden={canSubmit}
                        keybinding={['Enter', 'Escape']}
                        onClick={onOk}/>
                </Panel.Buttons.Main>
                {this.renderExtraButtons()}
            </Panel.Buttons>
        )
    }

    renderWizard({closable, isActionForm, dirty, invalid, first, last, onBack, onNext, onDone, onCancel}) {
        const {applyLabel} = this.props
        const canSubmit = isActionForm || dirty
        return (
            <Panel.Buttons>
                <Panel.Buttons.Main>
                    <Panel.Buttons.Cancel
                        hidden={!closable || !canSubmit}
                        keybinding='Escape'
                        onClick={onCancel}/>
                    <Panel.Buttons.Close
                        type={'submit'}
                        label={applyLabel}
                        hidden={!closable || canSubmit}
                        keybinding='Enter'
                        onClick={onDone}/>
                    <Panel.Buttons.Back
                        hidden={!closable && first}
                        disabled={first}
                        onClick={onBack}/>
                    <Panel.Buttons.Done
                        hidden={!last}
                        disabled={invalid}
                        keybinding='Enter'
                        onClick={onDone}/>
                    <Panel.Buttons.Next
                        hidden={last}
                        disabled={invalid}
                        keybinding='Enter'
                        onClick={onNext}/>
                </Panel.Buttons.Main>
                {this.renderExtraButtons()}
            </Panel.Buttons>
        )
    }

    renderExtraButtons() {
        const {children} = this.props
        return children ? (
            <Panel.Buttons.Extra>
                {children}
            </Panel.Buttons.Extra>
        ) : null
    }
}

FormPanelButtons.propTypes = {
    applyLabel: PropTypes.string,
    children: PropTypes.any
}
