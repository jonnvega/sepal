import {AssetInput} from 'widget/assetInput'
import {Form, form} from 'widget/form/form'
import {Panel} from 'widget/panel/panel'
import {Subject} from 'rxjs'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {msg} from 'translate'
import {v4 as uuid} from 'uuid'
import {withRecipe} from '../recipeContext'
import React from 'react'
import styles from './selectAsset.module.css'

const fields = {
    asset: new Form.Field().notBlank()
}

class _SelectAsset extends React.Component {
    state = {
        loadedAsset: false,
        asset: null,
        metadata: null,
        visualizations: null
    }
    assetChanged$ = new Subject()

    render() {
        const {activatable: {deactivate}} = this.props
        const {loadedAsset} = this.state
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
                            disabled={!loadedAsset}
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
            <AssetInput
                input={asset}
                label={msg('map.layout.addImageLayerSource.types.Asset.form.asset.label')}
                autoFocus
                onLoading={() => this.setState({
                    loadedAsset: false,
                    asset: null,
                    metadata: null,
                    visualizations: null
                })}
                onLoaded={({asset, metadata, visualizations}) => this.setState({
                    loadedAsset: true,
                    asset,
                    metadata,
                    visualizations
                })}
            />
        )
    }

    add() {
        const {asset, metadata, visualizations} = this.state
        const {recipeActionBuilder, activatable: {deactivate}} = this.props
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
    activatable({id: 'selectAsset', policy, alwaysAllow: true})
)
