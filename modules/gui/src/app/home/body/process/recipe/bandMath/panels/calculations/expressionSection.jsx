import PropTypes from 'prop-types'
import React from 'react'

import {compose} from '~/compose'
import {selectFrom} from '~/stateUtils'
import {msg} from '~/translate'
import {CodeEditor} from '~/widget/codeEditor/codeEditor'
import {eeAutoComplete} from '~/widget/codeEditor/eeAutoComplete'
import {eeLint} from '~/widget/codeEditor/eeLint'
import {Form} from '~/widget/form'
import {Layout} from '~/widget/layout'

import {withRecipe} from '../../../../recipeContext'
import styles from './calculation.module.css'

const mapRecipeToProps = recipe => ({
    images: selectFrom(recipe, 'model.inputImagery.images') || [],
    calculations: selectFrom(recipe, 'model.calculations.calculations') || [],
})

class _ExpressionSection extends React.Component {
    constructor(props) {
        super(props)
        this.updateUsedBands = this.updateUsedBands.bind(this)
    }

    render() {
        const {inputs: {usedBands}} = this.props
        return (
            <Layout type='vertical'>
                {this.renderName()}
                {this.renderExpression()}
                {usedBands.value.length === 1 && this.renderBandName()}
                {usedBands.value.length > 1 && this.renderBandNames()}
            </Layout>
        )
    }

    renderName() {
        const {inputs: {name}} = this.props
        return (
            <Form.Input
                className={styles.name}
                label={msg('process.bandMath.panel.calculations.form.calculationName.label')}
                placeholder={msg('process.bandMath.panel.calculations.form.calculationName.placeholder')}
                tooltip={msg('process.bandMath.panel.calculations.form.calculationName.tooltip')}
                input={name}
                autoComplete={false}
            />
        )
    }
    
    renderExpression() {
        const {images, calculations, inputs: {expression}} = this.props
        const allImages = [...images, ...calculations]
        return (
            <CodeEditor
                input={expression}
                autoComplete={eeAutoComplete(allImages, msg)}
                lint={eeLint(allImages, msg, this.updateUsedBands)}
            />
        )
    }
    
    // TODO: Allow data-type to be specified. Also for FUNCTION calculations
    
    renderBandName() {
        const {inputs: {bandName}} = this.props
        return (
            <Form.Input
                label={msg('process.bandMath.panel.calculations.form.bandName.label')}
                tooltip={msg('process.bandMath.panel.calculations.form.bandName.tooltip')}
                input={bandName}
                placeholder={msg('process.bandMath.panel.calculations.form.bandName.placeholder')}
                autoComplete={false}
            />
        )
    }

    renderBandNames() {
        const {inputs: {bandRenameStrategy, regex, bandRename}} = this.props
        const options = [
            {value: 'PREFIX', label: msg('process.bandMath.panel.calculations.form.bandRenameStrategy.PREFIX.label')},
            {value: 'SUFFIX', label: msg('process.bandMath.panel.calculations.form.bandRenameStrategy.SUFFIX.label')},
            {value: 'REGEX', label: msg('process.bandMath.panel.calculations.form.bandRenameStrategy.REGEX.label')},
        ]
        return (
            (<Layout type='horizontal' alignment='distribute'>
                <Form.Combo
                    label={msg('process.bandMath.panel.calculations.form.bandRenameStrategy.label')}
                    tooltip={msg('process.bandMath.panel.calculations.form.bandRenameStrategy.tooltip')}
                    input={bandRenameStrategy}
                    options={options}
                    placeholder={'Select a strategy...'}
                />
                {bandRenameStrategy.value === 'REGEX'
                    ? (
                        <Form.Input
                            label={msg('process.bandMath.panel.calculations.form.regex.label')}
                            tooltip={msg('process.bandMath.panel.calculations.form.bandRename.tooltip')}
                            input={regex}
                            placeholder={msg('process.bandMath.panel.calculations.form.regex.placeholder')}
                            autoComplete={false}
                        />
                    ) : null}

                <Form.Input
                    label={msg(`process.bandMath.panel.calculations.form.bandRename.${bandRenameStrategy.value}.label`)}
                    tooltip={msg(`process.bandMath.panel.calculations.form.bandRename.${bandRenameStrategy.value}.tooltip`)}
                    input={bandRename}
                    placeholder={msg(`process.bandMath.panel.calculations.form.bandRename.${bandRenameStrategy.value}.placeholder`)}
                    autoComplete={false}
                />
            </Layout>)
        )
    }

    updateUsedBands(bands) {
        const {inputs: {usedBands, bandName}} = this.props
        usedBands.set(bands)
        if (bands.length === 1) {
            bandName.set(bands[0])
        }
    }

    componentDidMount() {
        this.setBandRenameStrategy()
    }

    setBandRenameStrategy() {
        const {inputs: {bandRenameStrategy}} = this.props
        if (!bandRenameStrategy.value) {
            bandRenameStrategy.set('SUFFIX')
        }
    }
}

export const ExpressionSection = compose(
    _ExpressionSection,
    withRecipe(mapRecipeToProps)
)

ExpressionSection.propTypes = {
    inputs: PropTypes.object.isRequired
}
