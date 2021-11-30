import {Form, form} from 'widget/form/form'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {initValues} from 'app/home/body/process/recipe'
import {selectFrom} from 'stateUtils'
import {withPanelWizardContext} from 'widget/panelWizard'
import {withRecipe} from 'app/home/body/process/recipeContext'
import PropTypes from 'prop-types'
import React from 'react'
import actionBuilder from 'action-builder'

const Context = React.createContext()

const defaultPolicy = ({values, wizardContext: {wizard}}) =>
    wizard || selectFrom(values, 'dirty')
        ? {_: 'disallow'}
        : {_: 'allow-then-deactivate'}

export const recipeFormPanel = (
    {
        id,
        fields,
        constraints,
        path,
        mapRecipeToProps = () => ({}),
        modelToValues = model => ({...model}),
        valuesToModel = values => ({...values}),
        policy = defaultPolicy,
        additionalPolicy = () => ({})
    }) => {
    path = path || (() => id)
    const createMapRecipeToProps = mapRecipeToProps =>
        (recipe, props) => {
            const evaluatedPath = path(props)
            if (!evaluatedPath) {
                return null
            }
            const additionalProps = mapRecipeToProps(recipe)
            const model = selectFrom(recipe, ['model', evaluatedPath])
            const values = selectFrom(recipe, ['ui', evaluatedPath])
            return {recipeId: recipe.id, model, values, ...additionalProps}
        }

    const valuesSpec = {
        getModel: props => props.model,
        getValues: props => props.values,
        modelToValues,
        onInitialized: ({model, values, props}) => {
            const {recipeContext: {statePath}} = props
            const evaluatedPath = path(props)
            setModelAndValues({evaluatedPath, statePath, model, values})
        }
    }

    return WrappedComponent => {
        class HigherOrderComponent extends React.Component {
            constructor(props) {
                super(props)
                const {values, recipeContext: {statePath}, form} = props
                this.prevValues = values

                form.onDirtyChanged(dirty => setDirty({evaluatedPath: path(props), statePath, dirty}))
            }

            render() {
                const {form, recipeContext: {statePath}, activatable: {deactivate}} = this.props
                return (
                    <Context.Provider value={{
                        id,
                        evaluatedPath: path(this.props),
                        form,
                        statePath,
                        valuesToModel,
                        deactivate,
                        prevValues: this.prevValues
                    }}>
                        {React.createElement(WrappedComponent, {...this.props, form})}
                    </Context.Provider>
                )
            }
        }

        const policyToApply = props => ({...policy(props), ...additionalPolicy(props)})
        // [HACK] Using withRecipe() twice.
        // activatable() is dependent on recipe for its policy -> withRecipe() before activatable()
        // withRecipe() is dependent on activatable props -> activatable() before withRecipe()
        return compose(
            HigherOrderComponent,
            form({fields, constraints}),
            initValues(valuesSpec),
            withRecipe(createMapRecipeToProps(mapRecipeToProps)),
            activatable({id, policy: policyToApply}),
            withRecipe(createMapRecipeToProps(mapRecipeToProps)),
            withPanelWizardContext()
        )
    }
}

export const RecipeFormPanel = ({className, placement, isActionForm, onApply, onCancel, onClose, children}) =>
    <Context.Consumer>
        {({id, evaluatedPath, form, statePath, valuesToModel, deactivate, prevValues}) => {
            const wrappedOnApply = values => {
                if (isActionForm) {
                    setValues({evaluatedPath, statePath, values})
                    onApply && onApply(values)
                } else if (valuesToModel) {
                    const model = valuesToModel(values)
                    setModelAndValues({evaluatedPath, statePath, model, values})
                    onApply && onApply(values, model, prevValues)
                }
            }
            return (
                <Form.Panel
                    id={id}
                    className={className}
                    form={form}
                    isActionForm={isActionForm}
                    placement={placement}
                    onApply={values => {
                        wrappedOnApply(values)
                    }}
                    onCancel={() => {
                        onCancel && onCancel()
                    }}
                    onClose={() => {
                        deactivate()
                        onClose && onClose()
                    }}
                >
                    {children}
                </Form.Panel>
            )
        }}
    </Context.Consumer>

RecipeFormPanel.propTypes = {
    children: PropTypes.any.isRequired,
    className: PropTypes.string,
    isActionForm: PropTypes.any,
    placement: PropTypes.oneOf(['modal', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'center', 'inline']),
    onApply: PropTypes.func,
    onCancel: PropTypes.func,
    onClose: PropTypes.func
}

const setModelAndValues = ({evaluatedPath, statePath, model, values}) => {
    if (!evaluatedPath)
        return
    return actionBuilder('SET_MODEL_AND_VALUES', {evaluatedPath, model, values})
        .set([statePath, 'ui', evaluatedPath], values)
        .set([statePath, 'model', evaluatedPath], model)
        .dispatch()
}

const setValues = ({evaluatedPath, statePath, values}) => {
    if (!evaluatedPath)
        return
    actionBuilder('SET_VALUES', {evaluatedPath, values})
        .set([statePath, 'ui', evaluatedPath], values)
        .dispatch()
}

const setDirty = ({evaluatedPath, statePath, dirty}) => {
    if (!evaluatedPath)
        return
    actionBuilder('SET_DIRTY', {evaluatedPath, dirty})
        .set([statePath, 'ui', evaluatedPath, 'dirty'], dirty)
        .dispatch()
}
