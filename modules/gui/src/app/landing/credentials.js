import {AnimateReplacement} from 'widget/animate'
import {ForgotPassword} from './forgot-password'
import {Login} from './login'
import {Recaptcha} from 'widget/recaptcha'
import {SetPassword} from './setPassword'
import {SignUp} from './signup'
import {isPathInLocation} from 'route'
import React from 'react'
import styles from './credentials.module.css'

export default class Credentials extends React.Component {
    state = {
        mode: 'login'
    }

    constructor(props) {
        super(props)
        this.switchToLogin = this.switchToLogin.bind(this)
        this.switchToSignUp = this.switchToSignUp.bind(this)
        this.switchToForgotPassword = this.switchToForgotPassword.bind(this)
    }

    switchToLogin() {
        this.setState({mode: 'login'})
    }

    switchToSignUp() {
        this.setState({mode: 'signUp'})
    }

    switchToForgotPassword() {
        this.setState({mode: 'forgotPassword'})
    }

    renderLogin() {
        return (
            <Login
                onForgotPassword={this.switchToForgotPassword}
                onSignUp={this.switchToSignUp}
            />
        )
    }

    renderSignUp() {
        return (
            <SignUp
                onCancel={this.switchToLogin}
            />
        )
    }

    renderForgotPassword() {
        return (
            <ForgotPassword
                onCancel={this.switchToLogin}
            />
        )
    }

    renderPanel() {
        const {mode} = this.state
        if (isPathInLocation('/reset-password')) {
            return <SetPassword type='reset'/>
        }
        if (isPathInLocation('/setup-account')) {
            return <SetPassword type='assign'/>
        }
        switch (mode) {
        case 'login': return this.renderLogin()
        case 'signUp': return this.renderSignUp()
        case 'forgotPassword': return this.renderForgotPassword()
        }
    }

    render() {
        const {mode} = this.state
        const ANIMATION_DURATION_MS = 500
        return (
            <Recaptcha siteKey={window.googleRecaptchaSiteKey}>
                <div className={styles.container}>
                    <AnimateReplacement
                        currentKey={mode}
                        timeout={ANIMATION_DURATION_MS}
                        classNames={{enter: styles.formEnter, exit: styles.formExit}}
                        style={{height: '100%', '--animation-duration': `${ANIMATION_DURATION_MS}ms`}}>
                        <div className={styles.form}>
                            {this.renderPanel()}
                        </div>
                    </AnimateReplacement>
                </div>
            </Recaptcha>
        )
    }
}

Credentials.propTypes = {}
