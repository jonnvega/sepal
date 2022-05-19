import {RecipeActions} from '../changeAlertsRecipe'
import {Retrieve} from './retrieve/retrieve'
import {Toolbar} from 'widget/toolbar/toolbar'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {setInitialized} from 'app/home/body/process/recipe'
import {withRecipe} from 'app/home/body/process/recipeContext'
import ChartPixel from './chartPixel'
import ChartPixelButton from '../../ccdc/panels/chartPixelButton'
import Date from './date/date'
import OpticalPreprocess from './preProcessingOptions/preProcessingOptions'
import Options from './options/options'
import PanelWizard from 'widget/panelWizard'
import RadarPreprocess from 'app/home/body/process/recipe/mosaic/panels/radarMosaicOptions/options'
import React from 'react'
import Reference from './reference/reference'
import Sources from './sources/sources'
import _ from 'lodash'
import styles from './changeAlertsToolbar.module.css'

const mapRecipeToProps = recipe => ({
    initialized: selectFrom(recipe, 'ui.initialized'),
    baseBands: selectFrom(recipe, 'model.reference.baseBands'),
    sources: selectFrom(recipe, 'model.sources'),
})

class ChangeAlertsToolbar extends React.Component {
    constructor(props) {
        super(props)
        this.recipeActions = RecipeActions(props.recipeId)
    }

    render() {
        const {recipeId, initialized, baseBands, sources} = this.props

        return (
            <PanelWizard
                panels={['reference', 'date', 'sources']}
                initialized={initialized}
                onDone={() => setInitialized(recipeId)}>
                {initialized && baseBands ? <ChartPixel/> : null}
                <Retrieve/>
                <Reference/>
                <Date/>
                <Sources/>
                {_.isEmpty(sources.dataSets['SENTINEL_1'])
                    ? <OpticalPreprocess/>
                    : <RadarPreprocess/>
                }
                <Options/>

                <Toolbar
                    vertical
                    placement='top-right'
                    className={styles.top}>
                    <ChartPixelButton
                        disabled={!initialized || !baseBands}
                        onPixelSelected={latLng => this.recipeActions.setChartPixel(latLng)}
                    />
                    <Toolbar.ActivationButton
                        id='retrieve'
                        icon='cloud-download-alt'
                        tooltip={msg('process.changeAlerts.panel.retrieve.tooltip')}
                        disabled={!initialized || !baseBands}/>
                </Toolbar>
                <Toolbar
                    vertical
                    placement='bottom-right'
                    panel
                    className={styles.bottom}>
                    <Toolbar.ActivationButton
                        id='reference'
                        label={msg('process.changeAlerts.panel.reference.button')}
                        tooltip={msg('process.changeAlerts.panel.reference.tooltip')}
                        disabled={!initialized}/>
                    <Toolbar.ActivationButton
                        id='date'
                        label={msg('process.changeAlerts.panel.date.button')}
                        tooltip={msg('process.changeAlerts.panel.date.tooltip')}
                        disabled={!initialized}/>
                    <Toolbar.ActivationButton
                        id='sources'
                        label={msg('process.changeAlerts.panel.sources.button')}
                        tooltip={msg('process.changeAlerts.panel.sources.tooltip')}
                        disabled={!initialized}/>
                    <Toolbar.ActivationButton
                        id='options'
                        label={msg('process.timeSeries.panel.preprocess.button')}
                        tooltip={msg('process.timeSeries.panel.preprocess.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='changeAlertsOptions'
                        label={msg('process.changeAlerts.panel.options.button')}
                        tooltip={msg('process.changeAlerts.panel.options.tooltip')}/>
                </Toolbar>
            </PanelWizard>
        )
    }
}

ChangeAlertsToolbar.propTypes = {}

export default compose(
    ChangeAlertsToolbar,
    withRecipe(mapRecipeToProps)
)
