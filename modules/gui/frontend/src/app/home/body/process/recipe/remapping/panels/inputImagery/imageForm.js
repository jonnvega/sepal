import * as PropTypes from 'prop-types'
import {BandSpec} from './bandSpec'
import {Layout} from 'widget/layout'
import {bandsAvailableToAdd, defaultBand} from 'app/home/body/process/recipe/remapping/remappingRecipe'
import {compose} from 'compose'
import {withScrollable} from 'widget/scrollable'
import React, {Component} from 'react'
import _ from 'lodash'
import styles from './inputImage.module.css'

class ImageForm extends Component {
    state = {
        loadedRecipe: null,
        selected: undefined,
    }

    render() {
        return (
            <Layout>
                {this.renderImageSelector()}
                {this.renderIncludedBands()}
            </Layout>
        )
    }

    renderImageSelector() {
        const {input, inputComponent, inputs: {includedBands, bands}} = this.props
        return <div ref={this.element} className={styles.inputComponent}>
            {React.createElement(inputComponent, {
                input,
                onLoading: () => {
                    includedBands.set([])
                    bands.set({})
                },
                onLoaded: ({
                    id,
                    bands,
                    metadata,
                    visualizations,
                    recipe
                }) => this.onLoaded(id, bands, metadata, visualizations, recipe)
            })}
        </div>
    }

    renderIncludedBands() {
        const {inputs: {bands, includedBands}} = this.props
        const {loadedRecipe, selected} = this.state
        const availableBands = bandsAvailableToAdd(bands.value, includedBands.value)
        return (
            <div>
                {(includedBands.value || []).map(bandSpec =>
                    <BandSpec
                        key={bandSpec.band}
                        bands={_.omit(bands.value, Object.keys(bands.value)
                            .filter(b => ![bandSpec.band, ...availableBands].includes(b))) || {}
                        }
                        recipe={loadedRecipe}
                        spec={bandSpec}
                        selected={selected === bandSpec.id}
                        onClick={id => this.selectBandSpec(id)}
                        onUpdate={spec => this.updateSpec(spec)}
                        onRemove={id => this.removeBandSpec(id)}
                    />
                )}
            </div>
        )
    }

    componentDidUpdate(prevProps) {
        const {inputs: {includedBands: prevIncludedBands}} = prevProps
        const {inputs: {includedBands}} = this.props
        if ((includedBands.value || []).length > (prevIncludedBands.value || []).length) {
            // A band was added - select last
            this.selectBandSpec(includedBands.value[includedBands.value.length - 1].id)
        }
    }

    updateSpec(updatedSpec) {
        const {inputs: {includedBands}} = this.props
        includedBands.set(includedBands.value
            .map(spec => spec.id === updatedSpec.id
                ? updatedSpec
                : spec
            ))
    }

    selectBandSpec(bandSpecId) {
        this.setState(({selected}) => ({
            selected: selected === bandSpecId ? null : bandSpecId
        }))
    }

    removeBandSpec(bandSpecId) {
        const {inputs: {includedBands}} = this.props
        includedBands.set(
            includedBands.value.filter(spec => spec.id !== bandSpecId)
        )
    }

    onLoaded(id, loadedBands, loadedMetadata, loadedVisualizations, loadedRecipe) {
        const {form, inputs: {bands, metadata, visualizations, recipe}} = this.props
        if (!id || !form.isDirty()) {
            return
        }
        bands.set(loadedBands)
        metadata.set(loadedMetadata)
        visualizations.set(loadedVisualizations)
        recipe.set(loadedRecipe.id)
        this.setState({loadedRecipe})
        this.addFirstBand(loadedBands)
    }

    addFirstBand(loadedBands) {
        const {inputs: {includedBands}} = this.props
        const availableBands = bandsAvailableToAdd(loadedBands, includedBands.value)
        const bandSpec = defaultBand(availableBands[0], loadedBands)
        includedBands.set([bandSpec])
        this.setState({selected: bandSpec.id})
    }
}

ImageForm.propTypes = {
    children: PropTypes.any,
    inputComponent: PropTypes.any,
    inputs: PropTypes.any
}

export default compose(
    ImageForm,
    withScrollable()
)
