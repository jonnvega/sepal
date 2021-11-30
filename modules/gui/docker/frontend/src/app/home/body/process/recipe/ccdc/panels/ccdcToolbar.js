import {RecipeActions} from '../ccdcRecipe'
import {Retrieve} from 'app/home/body/process/recipe/ccdc/panels/retrieve/retrieve'
import {Toolbar} from 'widget/toolbar/toolbar'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {setInitialized} from 'app/home/body/process/recipe'
import {withRecipe} from 'app/home/body/process/recipeContext'
import Aoi from 'app/home/body/process/recipe/mosaic/panels/aoi/aoi'
import ChartPixel from './chartPixel'
import ChartPixelButton from './chartPixelButton'
import Dates from 'app/home/body/process/recipe/ccdc/panels/dates/dates'
import OpticalPreprocess from './opticalPreprocess/opticalPreprocess'
import Options from './options/options'
import PanelWizard from 'widget/panelWizard'
import RadarPreprocess from 'app/home/body/process/recipe/mosaic/panels/radarMosaicOptions/options'
import React from 'react'
import Sources from 'app/home/body/process/recipe/ccdc/panels/sources/sources'
import _ from 'lodash'
import styles from './ccdcToolbar.module.css'

const mapRecipeToProps = recipe => ({
    recipeId: recipe.id,
    initialized: selectFrom(recipe, 'ui.initialized'),
    sources: selectFrom(recipe, 'model.sources'),
})

class CcdcToolbar extends React.Component {
    constructor(props) {
        super(props)
        this.recipeActions = RecipeActions(props.recipeId)
    }

    render() {
        const {recipeId, initialized, sources} = this.props
        return (
            <PanelWizard
                panels={['aoi', 'dates', 'sources']}
                initialized={initialized}
                onDone={() => setInitialized(recipeId)}>

                {initialized ? <ChartPixel/> : null}
                <Retrieve/>
                <Aoi allowWholeEETable={true} layerIndex={2}/>
                <Dates/>
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
                        disabled={!initialized}
                        showGoogleSatellite
                        onPixelSelected={latLng => this.recipeActions.setChartPixel(latLng)}/>
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
                        id='aoi'
                        label={msg('process.mosaic.panel.areaOfInterest.button')}
                        tooltip={msg('process.mosaic.panel.areaOfInterest.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='dates'
                        label={msg('process.ccdc.panel.dates.button')}
                        tooltip={msg('process.ccdc.panel.dates.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='sources'
                        label={msg('process.ccdc.panel.sources.button')}
                        tooltip={msg('process.ccdc.panel.sources.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='options'
                        label={msg('process.ccdc.panel.preprocess.button')}
                        tooltip={msg('process.ccdc.panel.preprocess.tooltip')}/>
                    <Toolbar.ActivationButton
                        id='ccdcOptions'
                        label={msg('process.ccdc.panel.options.button')}
                        tooltip={msg('process.ccdc.panel.options.tooltip')}/>
                </Toolbar>
            </PanelWizard>
        )
    }
}

CcdcToolbar.propTypes = {}

export default compose(
    CcdcToolbar,
    withRecipe(mapRecipeToProps)
)
