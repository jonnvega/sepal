import {CrudItem} from 'widget/crudItem'
import {Form} from 'widget/form/form'
import {ListItem} from 'widget/listItem'
import {MosaicPreview} from '../../../mosaic/mosaicPreview'
import {NoData} from 'widget/noData'
import {Panel} from 'widget/panel/panel'
import {RecipeActions} from '../../classificationRecipe'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {Subject} from 'rxjs'
import {activator} from 'widget/activation/activator'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import PropTypes from 'prop-types'
import React from 'react'
import TrainingDataSet from './trainingDataSet'
import guid from 'guid'
import styles from './trainingData.module.css'

const mapRecipeToProps = recipe => ({
    dataSets: selectFrom(recipe, 'model.trainingData.dataSets') || []
})

class TrainingData extends React.Component {
    constructor(props) {
        super(props)
        this.eeTableChanged$ = new Subject()
        const {recipeId} = props
        this.preview = MosaicPreview(recipeId)
        this.recipeActions = RecipeActions(recipeId)
    }
    render() {
        const {dataSets, dataCollectionManager} = this.props
        return (
            <React.Fragment>
                <RecipeFormPanel
                    className={styles.panel}
                    placement='bottom-right'
                    onClose={() => this.preview.show()}>
                    <Panel.Header
                        icon='table'
                        title={msg('process.classification.panel.trainingData.title')}/>
                    <Panel.Content>
                        {this.renderContent()}
                    </Panel.Content>
                    <Form.PanelButtons invalid={!dataSets.length}>
                        <Panel.Buttons.Add onClick={() => this.addDataSet()}/>
                    </Form.PanelButtons>
                </RecipeFormPanel>
                <TrainingDataSet dataCollectionManager={dataCollectionManager}/>
            </React.Fragment>
        )
    }

    renderContent() {
        const {dataSets = []} = this.props
        return dataSets.length
            ? this.renderDataSets(dataSets)
            : this.renderNoDataSetMessage()
    }

    renderDataSets(dataSets) {
        return dataSets
            .filter(dataSet => dataSet)
            .map(dataSet => this.renderDataSet(dataSet))
    }

    renderDataSet(dataSet) {
        const {dataCollectionManager} = this.props
        const name = dataSet.name
        if (!name)
            return null
        const collected = dataSet.type === 'COLLECTED'
        const disabled = collected
        return (
            <ListItem
                key={`${dataSet.type}-${dataSet.dataSetId}`}
                disabled={disabled}
                onClick={() => this.editDataSet(dataSet)}>
                <CrudItem
                    title={msg(`process.classification.panel.trainingData.type.${dataSet.type}.label`)}
                    description={collected ? msg('process.classification.panel.trainingData.type.COLLECTED.label') : name}
                    removeMessage={msg('process.classification.panel.trainingData.remove.confirmationMessage', {name})}
                    removeTooltip={msg('process.classification.panel.trainingData.remove.tooltip')}
                    onRemove={() => {
                        this.removeDataSet(dataSet)
                        setTimeout(() => dataCollectionManager.updateAll())
                    }}
                />
            </ListItem>
        )
    }

    renderNoDataSetMessage() {
        return (
            <NoData message={msg('process.classification.panel.trainingData.noDataSet')}/>
        )
    }

    addDataSet() {
        const {activator: {activatables: {trainingDataSet}}} = this.props
        trainingDataSet.activate({dataSetId: guid()})
    }

    editDataSet(dataSet) {
        const {activator: {activatables: {trainingDataSet}}} = this.props
        trainingDataSet.activate({dataSetId: dataSet.dataSetId})
    }

    componentDidMount() {
        this.preview.hide()
    }

    removeDataSet(dataSetToRemove) {
        this.recipeActions.removeTrainingDataSet(dataSetToRemove)
    }
}

TrainingData.propTypes = {
    dataCollectionManager: PropTypes.object.isRequired
}

const additionalPolicy = () => ({'trainingDataSet': 'allow'})
// [HACK] This actually isn't a form, and we don't want to update the model. This prevents the selected data sets from
// being overridden.
const valuesToModel = null

export default compose(
    TrainingData,
    recipeFormPanel({id: 'trainingData', mapRecipeToProps, valuesToModel, additionalPolicy}),
    activator('trainingDataSet')
)
