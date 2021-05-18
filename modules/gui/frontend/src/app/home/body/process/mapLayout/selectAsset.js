import {Form, form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {Subject} from 'rxjs'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {msg} from 'translate'
import {takeUntil} from 'rxjs/operators'
import {toVisualizations} from 'app/home/map/imageLayerSource/assetVisualizationParser'
import {v4 as uuid} from 'uuid'
import {withRecipe} from '../recipeContext'
import React from 'react'
import api from 'api'
import guid from 'guid'
import styles from './selectAsset.module.css'

const fields = {
    asset: new Form.Field().notBlank()
}

class _SelectAsset extends React.Component {
    state = {}
    assetChanged$ = new Subject()

    render() {
        const {activatable: {deactivate}} = this.props
        const {validatedAsset} = this.state
        return (
            <Panel type='modal' className={styles.panel}>
                <Panel.Header title={msg('map.layout.addImageLayerSource.types.Asset.description')}/>
                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>
                <Panel.Buttons onEnter={() => this.add()} onEscape={deactivate}>
                    <Panel.Buttons.Main>
                        <Panel.Buttons.Cancel onClick={deactivate}/>
                        <Panel.Buttons.Add
                            disabled={!validatedAsset}
                            onClick={() => this.add()}
                        />
                    </Panel.Buttons.Main>
                </Panel.Buttons>
            </Panel>
        )
    }

    renderContent() {
        const {inputs: {asset}} = this.props
        return (
            <Layout>
                <Form.Input
                    label={msg('map.layout.addImageLayerSource.types.Asset.form.asset.label')}
                    input={asset}
                    spellCheck={false}
                    autoFocus
                    onChangeDebounced={asset => this.loadMetadata(asset)}
                    busyMessage={this.props.stream('VALIDATE_ASSET').active && msg('widget.loading')}
                    errorMessage
                />
            </Layout>
        )
    }

    loadMetadata(asset) {
        this.assetChanged$.next()
        this.setState({validatedAsset: null},
            this.props.stream('VALIDATE_ASSET',
                api.gee.imageMetadata$({asset}).pipe(
                    takeUntil(this.assetChanged$)
                ),
                metadata => this.setState({validatedAsset: asset, metadata}),
                () => {
                    this.props.inputs.asset.setInvalid(
                        msg('map.layout.addImageLayerSource.types.Asset.form.loadError')
                    )
                }
            )
        )
    }

    add() {
        const {validatedAsset: asset, metadata} = this.state
        const {recipeActionBuilder, activatable: {deactivate}} = this.props
        const visualizations = toVisualizations(metadata.properties, metadata.bands)
            .map(visualization => ({...visualization, id: guid()}))
        recipeActionBuilder('ADD_ASSET_IMAGE_LAYER_SOURCE')
            .push('layers.additionalImageLayerSources', {
                id: uuid(),
                type: 'Asset',
                sourceConfig: {
                    description: asset,
                    asset,
                    metadata,
                    visualizations
                }
            })
            .dispatch()
        deactivate()
    }

}

const policy = () => ({
    _: 'allow'
})

export const SelectAsset = compose(
    _SelectAsset,
    form({fields}),
    withRecipe(),
    activatable({id: 'selectAsset', policy})
)
