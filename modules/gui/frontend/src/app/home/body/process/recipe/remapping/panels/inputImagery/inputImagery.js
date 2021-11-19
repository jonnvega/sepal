import {CrudItem} from 'widget/crudItem'
import {Form} from 'widget/form/form'
import {ListItem} from 'widget/listItem'
import {MosaicPreview} from '../../../mosaic/mosaicPreview'
import {NoData} from 'widget/noData'
import {Panel} from 'widget/panel/panel'
import {RecipeActions} from '../../remappingRecipe'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {activator} from 'widget/activation/activator'
import {compose} from 'compose'
import {connect} from 'store'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import InputImage from './inputImage'
import React from 'react'
import guid from 'guid'
import styles from './inputImagery.module.css'

const mapRecipeToProps = recipe => ({
    images: selectFrom(recipe, 'model.inputImagery.images') || []
})

const mapStateToProps = (state, ownProps) => {
    const {images} = ownProps
    const recipeNameById = {}
    images
        .filter(image => image.type === 'RECIPE_REF')
        .map(image => selectFrom(state, ['process.recipes', {id: image.id}]))
        .filter(recipe => recipe)
        .forEach(recipe => recipeNameById[recipe.id] = recipe.name)
    return {recipeNameById}
}

class InputImagery extends React.Component {
    constructor(props) {
        super(props)
        const {recipeId} = props
        this.preview = MosaicPreview(recipeId)
    }

    render() {
        const {images} = this.props
        return (
            <React.Fragment>
                <RecipeFormPanel
                    className={styles.panel}
                    placement='bottom-right'
                    onClose={() => this.preview.show()}>
                    <Panel.Header
                        icon='image'
                        title={msg('process.remapping.panel.inputImagery.title')}/>
                    <Panel.Content>
                        {this.renderContent()}
                    </Panel.Content>
                    <Form.PanelButtons invalid={!images.length}>
                        <Panel.Buttons.Add onClick={() => this.addImage()}/>
                    </Form.PanelButtons>
                </RecipeFormPanel>
                <InputImage/>
            </React.Fragment>
        )
    }

    renderContent() {
        const {images = []} = this.props
        return images.length
            ? this.renderImages(images)
            : this.renderNoImageryMessage()
    }

    renderImages(images) {
        return images.map(image => this.renderImage(image))
    }

    renderImage(image) {
        const {recipeNameById} = this.props
        const name = image.type === 'RECIPE_REF'
            ? recipeNameById[image.id]
            : image.id
        if (!name)
            return null
        return (
            <ListItem
                key={`${image.type}-${image.id}`}
                onClick={() => this.editImage(image)}>
                <CrudItem
                    title={msg(`process.remapping.panel.inputImagery.form.type.${image.type}`)}
                    description={name}
                    // removeTooltip={msg('process.remapping.panel.inputImagery.form.remove.tooltip')}
                    onRemove={() => this.removeImage(image)}
                />
            </ListItem>
        )
    }

    renderNoImageryMessage() {
        return (
            <NoData message={msg('process.remapping.panel.inputImagery.form.noImagery')}/>
        )
    }

    addImage() {
        const {activator: {activatables: {inputImage}}} = this.props
        inputImage.activate({imageId: guid()})
    }

    editImage(image) {
        const {activator: {activatables: {inputImage}}} = this.props
        inputImage.activate({imageId: image.imageId})
    }

    componentDidMount() {
        this.preview.hide()
    }

    removeImage(imageToRemove) {
        const {recipeId} = this.props

        RecipeActions(recipeId).removeInputImage(imageToRemove)
    }
}

InputImagery.propTypes = {}
const additionalPolicy = () => ({_: 'allow'})
// [HACK] This actually isn't a form, and we don't want to update the model. This prevents the selected images from
// being overridden.
const valuesToModel = null

export default compose(
    InputImagery,
    connect(mapStateToProps),
    recipeFormPanel({id: 'inputImagery', mapRecipeToProps, valuesToModel, additionalPolicy}),
    activator('inputImage')
)
