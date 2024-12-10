/* eslint-disable no-console */
import PropTypes from 'prop-types'
import React from 'react'
import {throwError} from 'rxjs'
import {catchError, tap} from 'rxjs/operators'

import {ceoLogin$, credentialsPosted,} from '~/ceo'
import {compose} from '~/compose'
import {msg} from '~/translate'
// import {validateCeoLogin$} from '~/ceo'
import {withActivatable} from '~/widget/activation/activatable'
import {withActivators} from '~/widget/activation/activator'
import {Button} from '~/widget/button'
import {Form} from '~/widget/form'
import {withForm} from '~/widget/form/form'
import {Layout} from '~/widget/layout'
// import {Notifications} from '~/widget/notifications'
import {Panel} from '~/widget/panel/panel'

// import {compose} from '~/compose'
import styles from './ceoLogin.module.css'

const fields = {
    email: new Form.Field()
        .notBlank('process.classification.panel.trainingData.form.ceo.login.email.required'),
    // .match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, 'user.userDetails.form.email.invalid'),
    password: new Form.Field()
        .notBlank('process.classification.panel.trainingData.form.ceo.login.password.required'),
}

// const mapStateToProps = state => ({
//     email: state.ceo.email,
//     password: state.ceo.password,
// })
// const mapStateToProps = () => ({
//     errors: invalidCredentials() ? {password: msg('landing.login.password.invalid')} : {}
// })

export class _CeoLogin extends React.Component {
    close() {
        
        // const {activator: {activatables: {ceoProjects, ceoLogin}}} = this.props
        const {activatable} = this.props

        activatable.deactivate()
    }

    render() {
        const {form} = this.props
        return (
            <Form.Panel
                className={styles.panel}
                applyLabel={'CEO Login'}
                form={form}
                isActionForm={true}
                modal
                onApply={values => this.login$(values)}
                onClose={() => this.close()}>
                <Panel.Header
                    icon='key'
                    title={msg('process.classification.panel.trainingData.form.ceo.login.title')}/>
                <Panel.Content>
                    {this.renderForm()}
                </Panel.Content>
                <Form.PanelButtons/>
            </Form.Panel>
        )

    }
    
    renderForm() {

        const {inputs} = this.props
        const {email, password} = inputs
    
        // const {email, password} = this.props
        return (
    
            <Layout>
                <Form.Input
                    label={msg('process.classification.panel.trainingData.form.ceo.login.email.label')}
                    autoFocus
                    input={email}
                    spellCheck={false}
                />
                <Form.Input
                    label={msg('process.classification.panel.trainingData.form.ceo.login.password.label')}
                    input={password}
                    type='password'
                    spellCheck={false}
                />
            </Layout>
        )
    }

    login$(credentials) {

        const {inputs: {password, email}} = this.props

        return ceoLogin$(credentials).pipe(
            tap(ceoSessionToken => {
                credentialsPosted(ceoSessionToken)
            }),
            catchError(() => {
                console.log('$$$$$$$$$Invalid credentials---')
                password.setInvalid(msg('user.changePassword.success'))
                email.setInvalid(msg('user.changePassword.success'))
                return throwError(() => new Error('Invalid credentials'))
            })
        )
    }
}

const policy = () => ({
    _: 'disallow',
})

export const CeoLogin = compose(
    _CeoLogin,
    withForm({fields}),
    withActivators('ceoProjects'),
    withActivatable({id: 'ceoLogin', policy, alwaysAllow: true})
)

class _CeoLoginButton extends React.Component {
    render() {
        const activate = this.props.activator.activatables.ceoLogin.activate
        return (
            <Button
                icon={'key'}
                label={msg('process.classification.panel.trainingData.form.ceo.login.connect.label')}
                disabled={false}
                onClick={activate}/>
        )
    }
}

export const CeoLoginButton = compose(
    _CeoLoginButton,
    withActivators('ceoLogin'),
    withForm({fields}),
)

CeoLogin.propTypes = {
    disabled: PropTypes.any
}
