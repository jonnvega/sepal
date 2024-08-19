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

import { Form } from './form'
import { Layout } from './layout'

class _CeoInput extends React.Component {

    state = {
        authenticated: false,
        token: ""
    }



    renderLogin() {
        const {inputs: {email, password}} = this.props
        return (
            <Layout>
                <Form.Input
                    label={msg('widget.ceoInput.username')}
                    input={email}
                />
                <Form.Input
                    label={msg('widget.ceoInput.password')}
                    input={password}
                />
            </Layout>
        )

    }

    renderSelectInstitution() {
        const {images, inputs: {}} = this.props
        return(
            <Layout>
                <Form.Combo
                    className={styles.bandSelection}
                    input={selectedBand}
                    options={options} />
            </Layout>
        )
    }

    renderSelectProject() {
        const project = this.getProjects()
        reaturn(
            <Layout>
                <Form.Combo
                    className={styles.bandSelection}
                    input={selectedBand}
                    options={options} />
            </Layout>
        )
    }

    render() {
        const { inputs: { login, password } } = this.PropTypes
        return (
            <></>
        )
    }
}