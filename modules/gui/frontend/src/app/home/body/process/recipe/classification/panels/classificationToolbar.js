import {Legend} from '../legend/legend'
import {RecipeActions} from '../classificationRecipe'
import {Retrieve} from './retrieve/retrieve'
import {Toolbar} from 'widget/toolbar/toolbar'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {setInitialized} from 'app/home/body/process/recipe'
import {withRecipe} from 'app/home/body/process/recipeContext'
import AuxiliaryImagery from './auxiliaryImagery/auxiliaryImagery'
import Classifier from './classifier/classifier'
import InputImagery from './inputImagery/inputImagery'
import PanelWizard from 'widget/panelWizard'
import PropTypes from 'prop-types'
import React from 'react'
import TrainingData from './trainingData/trainingData.js'
import styles from './classificationToolbar.module.css'

const mapRecipeToProps = recipe => ({
    recipeId: recipe.id,
    collecting: selectFrom(recipe, 'ui.collect.collecting'),
    initialized: selectFrom(recipe, 'ui.initialized'),
})

class ClassificationToolbar extends React.Component {
    render() {
        const {recipeId, collecting, dataCollectionManager, initialized} = this.props
        return (
            <PanelWizard
                panels={['inputImagery', 'legend']}
                initialized={initialized}
                onDone={() => setInitialized(recipeId)}>
                <Retrieve/>
                <InputImagery/>
                <Legend dataCollectionManager={dataCollectionManager}/>
                <TrainingData dataCollectionManager={dataCollectionManager}/>
                <AuxiliaryImagery/>
                <Classifier/>

                <Toolbar
                    vertical
                    placement='top-right'
                    panel
                    className={styles.top}>
                    <Toolbar.ToolbarButton
                        selected={collecting}
                        onClick={() => RecipeActions(recipeId).setCollecting(!collecting)}
                        icon={'map-marker'}
                        tooltip={msg(collecting
                            ? 'process.classification.collect.disable.tooltip'
                            : 'process.classification.collect.enable.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='retrieve'
                        icon='cloud-download-alt'
                        tooltip={msg('process.retrieve.tooltip')}
                        disabled={!initialized}/>
                </Toolbar>
                <Toolbar
                    vertical
                    placement='bottom-right'
                    panel
                    className={styles.bottom}>
                    <Toolbar.ActivationButton
                        id='inputImagery'
                        label={msg('process.classification.panel.inputImagery.button')}
                        tooltip={msg('process.classification.panel.inputImagery.tooltip')}
                        disabled={!initialized}/>

                    <Toolbar.ActivationButton
                        id='legend'
                        label={msg('process.classification.panel.legend.button')}
                        tooltip={msg('process.classification.panel.legend.tooltip')}
                        disabled={!initialized}/>

                    <Toolbar.ActivationButton
                        id='trainingData'
                        label={msg('process.classification.panel.trainingData.button')}
                        tooltip={msg('process.classification.panel.trainingData.tooltip')}/>

                    <Toolbar.ActivationButton
                        id='auxiliaryImagery'
                        label={msg('process.classification.panel.auxiliaryImagery.button')}
                        tooltip={msg('process.classification.panel.auxiliaryImagery.tooltip')}/>

                    <Toolbar.ActivationButton
                        id='classifier'
                        label={msg('process.classification.panel.classifier.button')}
                        tooltip={msg('process.classification.panel.classifier.tooltip')}/>
                </Toolbar>
            </PanelWizard>
        )
    }
}

ClassificationToolbar.propTypes = {
    dataCollectionManager: PropTypes.object.isRequired,
    recipeId: PropTypes.string.isRequired,
}

export default compose(
    ClassificationToolbar,
    withRecipe(mapRecipeToProps)
)
