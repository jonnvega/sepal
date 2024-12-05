import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import { map, Subject, switchMap, takeUntil } from 'rxjs'

import api from '~/apiRegistry'
import { recipeAccess } from '~/app/home/body/process/recipeAccess'
import { withRecipe } from '~/app/home/body/process/recipeContext'
import { getRecipeType } from '~/app/home/body/process/recipeTypeRegistry'
import { compose } from '~/compose'
import { connect } from '~/connect'
import { select } from '~/store'
import { msg } from '~/translate'
import { Buttons } from '~/widget/buttons'
import styles from './ceo.module.css'

import { Form } from './form'
import { withForm } from '~/widget/form/form'

import { Panel } from '~/widget/panel/panel'

const fields = {
    email: new Form.Field()
        .notBlank('landing.login.email.required'),
    password: new Form.Field()
        .notBlank('landing.login.password.required'),
    institution: new Form.Field(),
    project: new Form.Field()
}


const fakeCeoInstitutions$ = new Observable(subscriber => {
    // Emit dummy data
    const dummyData = [
        { id: '1', label: 'Project 1' },
        { id: '2', label: 'Project 2' }
    ];
    subscriber.next(dummyData);
    subscriber.complete();
});

const loadProjects$ = instituionId => {
    return fakeCeoInstitutions$.pipe(
        map(institutions => institutions.map(({id, label}) => ({value: id, label}))),
        map(areas =>
            actionBuilder('SET_PROJECTS', {instituionId, projects})
                .set(['projectsByInstitution', instituionId], projects)
                .dispatch()
        )
    )
}

mapStateToProps = () => ({
    errors: {}
})

class _CeoInput extends React.Component {

    state = {
        initialized: false,
        institutions: [],
        projects: [],
        step: "login"
    }

    constructor() {
        super()

        this.login = this.login.bind(this)

        this.renderLogin = this.renderLogin.bind(this)
        this.renderProjectSelection = this.renderProjectSelection.bind(this)
    }

    login() {
        const { form } = this.props
        this.setState({
            step: "project"
        })
        // api.ceo.login$({ email, password })
        //     .pipe(
        //         switchMap(token => 
        //             api.ceo.getUserInstitutions$(token)
        //         )
        //     )
        //     .subscribe({
        //         next: token => {
        //             this.setState({result})
        //         },
        //         error: err => {
        //             console.error('Login failed:', err);
        //         }
        //     });
    }

    loadProjects(countryId) {
        if (!select(['projectsByInstitution', instituionId]))
            this.props.stream('LOAD_PROJECTS',
                loadProjects$(instituionId).pipe(
                    takeUntil(this.aoiChanged$)
                ))
    }
    
    renderProjectSelection() {
        const { inputs: { project, institution } } = this.props
        return (
            <>
                <Form.Combo
                    className={styles.input}
                    label={"Institution Selection"}
                    input={institution}
                    options={[
                        { value: '123123', label: "Institution 1" }
                    ]}
                    onChange={() => {
                        this.loadProjects(institution.value)
                    }}
                />
                <Form.Combo
                    className={styles.input}
                    label={"Project Selection"}
                    // className={styles.bandSelection}
                    input={project}
                    options={[
                        { value: '123123', label: "Project 1" }
                    ]}
                />
            </>
        )
    }

    renderLogin() {

        const { inputs: { email, password } } = this.props

        return (
            <>
                <Form.Input
                    className={styles.input}
                    label={"CEO Email"}
                    input={email}
                />
                <Form.Input
                    className={styles.input}
                    label={"CEO Password"}
                    input={password}
                />
                <Panel.Buttons.Next
                    className={styles.input}
                    onClick={this.login}
                />
            </>
        )
    }

    render() {
        const { step } = this.state;

        const stepRenderer = {
            login: this.renderLogin,
            project: this.renderProjectSelection
        };

        const renderStep = stepRenderer[step] || this.renderLogin; // Default to login

        return renderStep();
    }
}


export const CeoInput = compose(
    _CeoInput,
    withForm({ fields })
    // connect(mapStateToProps),
)

_CeoInput.propTypes = {
    form: PropTypes.object,
    inputs: PropTypes.object
}
