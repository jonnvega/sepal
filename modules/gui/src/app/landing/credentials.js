import {AnimateReplacement} from 'widget/animate'
import {isPathInLocation} from 'route'
import ForgotPassword from './forgot-password'
import Login from './login'
import React from 'react'
import SetPassword from './setPassword'
import styles from './credentials.module.css'

export default class Credentials extends React.Component {
    state = {
        forgotPassword: false
    }

    switchToLogin() {
        this.setState({
            forgotPassword: false
        })
    }

    switchToForgotPassword() {
        this.setState({
            forgotPassword: true
        })
    }

    renderForgotPassword() {
        return (
            <ForgotPassword onCancel={() => this.switchToLogin()}/>
        )
    }

    renderLogin() {
        return (
            <Login onForgotPassword={() => this.switchToForgotPassword()}/>
        )
    }

    renderPanel() {
        if (isPathInLocation('/reset-password')) {
            return <SetPassword type='reset'/>
        }
        if (isPathInLocation('/setup-account')) {
            return <SetPassword type='assign'/>
        }
        return this.state.forgotPassword
            ? this.renderForgotPassword()
            : this.renderLogin()
    }

    render() {
        const {forgotPassword} = this.state
        const ANIMATION_DURATION_MS = 500
        return (
            <React.Fragment>
                <div className={styles.container}>
                    <AnimateReplacement
                        currentKey={forgotPassword}
                        timeout={ANIMATION_DURATION_MS}
                        classNames={{enter: styles.formEnter, exit: styles.formExit}}
                        style={{height: '100%', '--animation-duration': `${ANIMATION_DURATION_MS}ms`}}>
                        <div className={styles.form}>
                            {this.renderPanel()}
                        </div>
                    </AnimateReplacement>
                </div>
            </React.Fragment>
        )
    }
}

Credentials.propTypes = {}
