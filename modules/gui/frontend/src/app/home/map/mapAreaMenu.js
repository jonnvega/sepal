import {Activator} from 'widget/activation/activator'
import {Button} from 'widget/button'
import {Buttons} from 'widget/buttons'
import {Combo} from 'widget/combo'
import {Item} from 'widget/item'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {getImageLayerSource} from './imageLayerSource/imageLayerSource'
import {msg} from 'translate'
import {recipePath} from '../body/process/recipe'
import {withLayers} from '../body/process/withLayers'
import {withRecipe} from '../body/process/recipeContext'
import FloatingBox from 'widget/floatingBox'
import PropTypes from 'prop-types'
import React from 'react'
import actionBuilder from 'action-builder'
import styles from './mapAreaMenu.module.css'

class _MapAreaMenuPanel extends React.Component {
    render() {
        const {element, activatable: {deactivate}} = this.props
        return (
            <FloatingBox
                element={element}
                alignment='center'
                placement='above-below'
                onBlur={deactivate}
            >
                <Panel className={styles.panel} type='normal'>
                    <Panel.Header>
                        {this.renderImageLayerSourceDescription()}
                    </Panel.Header>
                    <Panel.Content>
                        <Layout>
                            {this.renderImageLayerForm()}
                            {this.renderFeatureLayers()}
                        </Layout>
                    </Panel.Content>
                    <Panel.Buttons onEscape={deactivate} shown={false}/>
                </Panel>
            </FloatingBox>

        )
    }

    renderImageLayerSourceDescription() {
        const {imageLayerSources, layers: {areas}, area, recipe} = this.props
        const {imageLayer} = areas[area]

        const source = imageLayerSources.find(({id}) => id === imageLayer.sourceId)
        const {description} = getImageLayerSource({recipe, source})
        return description
    }

    renderImageLayerForm() {
        const {form} = this.props
        return form
    }

    renderFeatureLayers() {
        const {area, featureLayerSources, layers: {areas}} = this.props
        const {featureLayers} = areas[area]
        const selectedSourceIds = featureLayers
            .filter(({disabled}) => disabled !== true)
            .map(({sourceId}) => sourceId)

        const options = featureLayerSources.map(({id, type, description}) => ({
            value: id,
            label: msg(`featureLayerSources.${type}.type`),
            tooltip: description
        }))

        return (
            <Buttons
                alignment='fill'
                multiple
                selected={selectedSourceIds}
                options={options}
                onChange={sourceIds =>
                    this.setFeatureLayers(sourceIds.map(sourceId => ({sourceId})))
                }
            />
        )
    }

    setFeatureLayers(enabledSourceIds) {
        const {recipeId, area, featureLayerSources} = this.props
        actionBuilder('SET_FEATURE_LAYERS', {sourceIds: enabledSourceIds, area})
            .set(
                [recipePath(recipeId), 'layers.areas', area, 'featureLayers'],
                featureLayerSources.map(({id}) => ({
                    sourceId: id,
                    disabled: !enabledSourceIds.map(({sourceId}) => sourceId).includes(id)
                }))
            )
            .dispatch()
    }

    selectImageLayer(sourceId) {
        const {recipeId, area} = this.props
        actionBuilder('SELECT_IMAGE_LAYER', {sourceId, area})
            .set(recipePath(recipeId, ['layers.areas', area, 'imageLayer']), {sourceId})
            .dispatch()
    }
}

const policy = () => ({
    _: 'allow'
})

export const MapAreaMenuPanel = compose(
    _MapAreaMenuPanel,
    withLayers(),
    withRecipe(recipe => ({recipe})),
    activatable({
        id: ({area}) => `mapAreaMenu-${area}`,
        policy,
        alwaysAllow: true
    })

)

export class MapAreaMenu extends React.Component {
    ref = React.createRef()

    render() {
        return (
            <div className={styles.container}>
                {this.renderPanel()}
                {this.renderButton()}
            </div>
        )
    }

    renderButton() {
        const {area} = this.props
        return (
            <Activator id={`mapAreaMenu-${area}`}>
                {activator => {
                    const {activate, deactivate, active, canActivate} = activator
                    return (
                        <div className={styles.buttonContainer} ref={this.ref}>
                            <Button
                                look='default'
                                shape='pill'
                                icon='bars'
                                disabled={!canActivate && !active}
                                onClick={() => active ? deactivate() : activate()}
                            />
                        </div>
                    )
                }}
            </Activator>
        )
    }

    renderPanel() {
        const {area, form} = this.props
        return (
            <MapAreaMenuPanel area={area} form={form} element={this.ref.current}/>
        )
    }
}

MapAreaMenu.propTypes = {
    area: PropTypes.string,
    form: PropTypes.object
}
