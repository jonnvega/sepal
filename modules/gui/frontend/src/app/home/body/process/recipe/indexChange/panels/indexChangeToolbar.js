import {Legend} from './legend/legend'
import {Mapping} from './mapping/mapping'
import {Retrieve} from './retrieve/retrieve'
import {Toolbar} from 'widget/toolbar/toolbar'
import {compose} from 'compose'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {setInitialized} from 'app/home/body/process/recipe'
import {withRecipe} from 'app/home/body/process/recipeContext'
import FromImage from './inputImage/fromImage'
import Options from './options/options'
import PanelWizard from 'widget/panelWizard'
import React from 'react'
import ToImage from './inputImage/toImage'
import styles from './indexChangeToolbar.module.css'

const mapRecipeToProps = recipe => ({
    recipeId: recipe.id,
    initialized: selectFrom(recipe, 'ui.initialized')
})

class IndexChangeToolbar extends React.Component {
    render() {
        const {recipeId, initialized} = this.props
        return (
            <PanelWizard
                panels={['fromImage', 'toImage']}
                initialized={initialized}
                onDone={() => setInitialized(recipeId)}>

                <Retrieve/>

                <FromImage/>
                <ToImage/>
                <Legend/>
                <Mapping/>
                <Options/>

                <Toolbar
                    vertical
                    placement="top-right"
                    panel
                    className={styles.top}>

                    <Toolbar.ActivationButton
                        id="retrieve"
                        icon="cloud-download-alt"
                        tooltip={msg('process.retrieve.tooltip')}
                        disabled={!initialized}
                    />
                </Toolbar>
                <Toolbar
                    vertical
                    placement="bottom-right"
                    panel
                    className={styles.bottom}>
                    <Toolbar.ActivationButton
                        id="fromImage"
                        label={msg('process.indexChange.panel.inputImage.from.button.label')}
                        tooltip={msg('process.indexChange.panel.inputImage.from.button.tooltip')}
                        disabled={!initialized}/>
                    <Toolbar.ActivationButton
                        id="toImage"
                        label={msg('process.indexChange.panel.inputImage.to.button.label')}
                        tooltip={msg('process.indexChange.panel.inputImage.to.button.tooltip')}
                        disabled={!initialized}/>
                    <Toolbar.ActivationButton
                        id="legend"
                        label={msg('process.indexChange.panel.legend.button.label')}
                        tooltip={msg('process.indexChange.panel.legend.button.tooltip')}/>
                    <Toolbar.ActivationButton
                        id="mapping"
                        label={msg('process.indexChange.panel.mapping.button.label')}
                        tooltip={msg('process.indexChange.panel.mapping.button.tooltip')}/>
                    <Toolbar.ActivationButton
                        id="options"
                        label={msg('process.indexChange.panel.options.button.label')}
                        tooltip={msg('process.indexChange.panel.options.button.tooltip')}/>
                </Toolbar>
            </PanelWizard>
        )
    }
}

export default compose(
    IndexChangeToolbar,
    withRecipe(mapRecipeToProps)
)
