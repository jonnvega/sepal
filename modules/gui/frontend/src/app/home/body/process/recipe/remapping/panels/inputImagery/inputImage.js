import {Form} from 'widget/form/form'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {SectionSelection} from './sectionSelection'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import AssetSection from './assetSection'
import ButtonSelect from 'widget/buttonSelect'
import ImageForm from './imageForm'
import PanelSections from 'widget/panelSections'
import React from 'react'
import RecipeSection from './recipeSection'
import guid from 'guid'
import styles from './inputImage.module.css'

const fields = {
    imageId: new Form.Field(),
    section: new Form.Field()
        .notBlank('process.remapping.panel.inputImagery.form.section.required'),
    recipe: new Form.Field()
        .skip((value, {section}) => section !== 'RECIPE_REF')
        .notBlank('process.remapping.panel.inputImagery.form.recipe.required'),
    asset: new Form.Field()
        .skip((value, {section}) => section !== 'ASSET')
        .notBlank('process.remapping.panel.inputImagery.form.asset.required'),
    bands: new Form.Field()
        .notEmpty('process.remapping.panel.inputImagery.form.bands.required'),
    metadata: new Form.Field(),
    visualizations: new Form.Field()
}

const mapRecipeToProps = recipe => ({
    recipeId: recipe.id
})

class InputImage extends React.Component {
    constructor(props) {
        super(props)
        this.updateImageLayerSources = this.updateImageLayerSources.bind(this)
    }

    render() {
        const {inputs} = this.props
        const sections = [
            {
                component: <SectionSelection section={inputs.section}/>
            },
            {
                value: 'RECIPE_REF',
                label: msg('process.remapping.panel.inputImagery.recipe.title'),
                title: msg('SEPAL RECIPE'),
                component: <ImageForm ${...this.props} inputComponent={RecipeSection} input={inputs.recipe}/>
            },
            {
                value: 'ASSET',
                label: msg('process.remapping.panel.inputImagery.asset.title'),
                title: msg('EARTH ENGINE ASSET'),
                component: <ImageForm ${...this.props} inputComponent={AssetSection} input={inputs.asset}/>
            }
        ]

        return (
            <RecipeFormPanel
                className={styles.panel}
                placement='modal'
                onApply={this.updateImageLayerSources}>
                <PanelSections
                    inputs={inputs}
                    sections={sections}
                    selected={inputs.section}
                    icon='image'
                    label={msg('IMAGE TO CLASSIFY')}
                    defaultButtons={
                        <Form.PanelButtons/>
                    }
                />
            </RecipeFormPanel>
        )
    }

    componentDidUpdate() {
        const {inputs, activatable: {imageId}} = this.props
        inputs.imageId.set(imageId)
    }

    updateImageLayerSources({section, asset, recipe: recipeId, metadata, visualizations}) {
        const {recipeActionBuilder} = this.props

        const toImageLayerSource = () => {
            switch (section) {
            case 'RECIPE_REF':
                return {
                    id: recipeId,
                    type: 'Recipe',
                    sourceConfig: {
                        recipeId
                    }
                }
            case 'ASSET':
                return {
                    id: asset,
                    type: 'Asset',
                    sourceConfig: {
                        description: asset,
                        asset,
                        metadata,
                        visualizations
                    }
                }
            default:
                throw Error(`Unexpected section: ${section}`)
            }
        }

        const source = toImageLayerSource()

        recipeActionBuilder('UPDATE_INPUT_IMAGE_LAYER_SOURCE', {source})
            .set(['layers.additionalImageLayerSources', {id: source.id}], source)
            .dispatch()
    }

    addImage() {
        const {onAdd, activatable: {deactivate}} = this.props
        onAdd(this.getSelectedImage())
        deactivate()
    }

    getSelectedImage() {
        const {inputs: {section, recipe, asset}} = this.props
        switch (section.value) {
        case 'ASSET':
            return {
                type: 'ASSET',
                id: asset.value
            }
        case 'RECIPE_REF':
            return {
                type: 'RECIPE_REF',
                id: recipe.value
            }
        default:
            throw Error(`Unexpected image section: ${section.value}`)
        }
    }
}

const modelToValues = model => {
    const values = {
        imageId: model.imageId,
        section: model.type || 'SELECTION',
        bands: model.bands,
    }
    switch (model.type) {
    case 'RECIPE_REF':
        return {...values, recipe: model.id}
    case 'ASSET':
        return {...values, asset: model.id}
    default:
        return values
    }
}

const valuesToModel = values => {
    const model = {
        imageId: values.imageId,
        type: values.section,
        bands: values.bands,
    }
    switch (values.section) {
    case 'RECIPE_REF':
        return {...model, id: values.recipe}
    case 'ASSET':
        return {...model, id: values.asset}
    default:
        return null
    }
}

const policy = () => ({_: 'allow'})
const panelOptions = {
    id: 'inputImage',
    path: props => {
        const imageId = selectFrom(props, 'activatable.imageId')
        return imageId ? ['inputImagery.images', {imageId}] : null
    },
    fields,
    valuesToModel,
    modelToValues,
    mapRecipeToProps,
    policy
}

export default compose(
    InputImage,
    recipeFormPanel(panelOptions)
)

InputImage.propTypes = {}
