import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {CenteredProgress} from 'widget/progress'
import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {compose} from 'compose'
import {history, query} from 'route'
import {msg} from 'translate'
import {resetPassword$, tokenUser, validateToken$} from 'user'
import Notifications from 'widget/notifications'
import PropTypes from 'prop-types'
import React from 'react'
import actionBuilder from 'action-builder'
import styles from './setPassword.module.css'

const fields = {
    username: null,
    password: new Form.Field()
        .notBlank('landing.reset-password.password.required')
        .match(/^.{8,100}$/, 'landing.reset-password.password.invalid'),
    password2: new Form.Field()
        .notBlank('landing.reset-password.password2.required')

}

const constraints = {
    passwordsMatch: new Form.Constraint(['password', 'password2'])
        .skip(
            ({password2}) => !password2
        )
        .predicate(
            ({password, password2}) => !password || password === password2,
            'landing.reset-password.password2.not-matching'
        )
}

const mapStateToProps = () => ({
    user: tokenUser()
})

class SetPassword extends React.Component {
    componentDidMount() {
        const {stream} = this.props
        const token = query().token
        stream('VALIDATE_TOKEN',
            validateToken$(token),
            user => actionBuilder('TOKEN_VALIDATED')
                .set('user.tokenUser', user)
                .dispatch(),
            () => {
                Notifications.error({
                    message: msg('landing.validate-token.error'),
                    timeout: 10
                })
                history().push('/process') // [TODO] fix this
            }
        )
    }

    componentDidUpdate(nextProps) {
        const {user, inputs: {username}} = nextProps
        username.set(user && user.username)
    }

    resetPassword({username, password}) {
        const {stream} = this.props
        const token = query().token
        stream('RESET_PASSWORD', resetPassword$({token, username, password}))
    }

    render() {
        const {stream} = this.props
        return stream('VALIDATE_TOKEN').active
            ? this.spinner()
            : this.form()
    }

    spinner() {
        return (
            <CenteredProgress title={msg('landing.reset-password.validating-link')}/>
        )
    }

    form() {
        const {form, inputs: {username, password, password2}, stream} = this.props
        const resettingPassword = stream('RESET_PASSWORD').active
        return (
            <Form className={styles.form} onSubmit={() => this.resetPassword(form.values())}>
                <Layout spacing='loose'>
                    <Form.Input
                        label={msg('landing.reset-password.username.label')}
                        input={username}
                        disabled={true}
                        errorMessage
                    />
                    <Form.Input
                        label={msg('landing.reset-password.password.label')}
                        input={password}
                        type='password'
                        placeholder={msg('landing.reset-password.password.placeholder')}
                        autoFocus
                        tabIndex={1}
                        errorMessage
                    />
                    <Form.Input
                        label={msg('landing.reset-password.password2.label')}
                        input={password2}
                        type='password'
                        placeholder={msg('landing.reset-password.password2.placeholder')}
                        tabIndex={2}
                        errorMessage={[password2, 'passwordsMatch']}
                    />
                    <ButtonGroup layout='horizontal-nowrap' alignment='right'>
                        <Button
                            type='submit'
                            look='apply'
                            size='x-large'
                            shape='pill'
                            icon={resettingPassword ? 'spinner' : 'check'}
                            label={msg('landing.reset-password.button')}
                            disabled={form.isInvalid() || resettingPassword}
                            tabIndex={3}
                        />
                    </ButtonGroup>
                </Layout>
            </Form>
        )
    }
}

SetPassword.propTypes = {
    type: PropTypes.oneOf(['reset', 'assign']).isRequired,
    user: PropTypes.object
}

export default compose(
    SetPassword,
    form({fields, constraints, mapStateToProps})
)
