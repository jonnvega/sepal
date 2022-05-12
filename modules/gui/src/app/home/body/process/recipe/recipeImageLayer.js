import {CCDCSliceImageLayer} from './ccdcSlice/ccdcSliceImageLayer'
import {ChangeAlertsImageLayer} from './changeAlerts/changeAlertsImageLayer'
import {ClassChangeImageLayer} from './classChange/classChangeImageLayer'
import {ClassificationImageLayer} from './classification/classificationImageLayer'
import {CursorValue} from 'app/home/map/cursorValue'
import {IndexChangeImageLayer} from './indexChange/indexChangeImageLayer'
import {OpticalMosaicImageLayer} from './opticalMosaic/opticalMosaicImageLayer'
import {PlanetMosaicImageLayer} from './planetMosaic/planetMosaicImageLayer'
import {RadarMosaicImageLayer} from './radarMosaic/radarMosaicImageLayer'
import {RemappingImageLayer} from './remapping/remappingImageLayer'
import {Subject} from 'rxjs'
import {compose} from 'compose'
import {connect, select} from 'store'
import {getAllVisualizations, getUserDefinedVisualizations} from './visualizations'
import {getRecipeType} from '../recipeTypes'
import {selectFrom} from 'stateUtils'
import {withMapAreaContext} from 'app/home/map/mapAreaContext'
import {withTabContext} from 'widget/tabs/tabContext'
import EarthEngineImageLayer from 'app/home/map/layer/earthEngineImageLayer'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import withSubscriptions from 'subscription'

const mapStateToProps = (state, {source: {id, sourceConfig: {recipeId}}}) => ({
    sourceId: id,
    recipe: selectFrom(state, ['process.loadedRecipes', recipeId])
})

class _RecipeImageLayer extends React.Component {
    cursorValue$ = new Subject()

    render() {
        const {recipe} = this.props
        return recipe
            ? (
                <CursorValue value$={this.cursorValue$}>
                    {this.renderRecipeLayer()}
                </CursorValue>
            )
            : null
    }

    renderRecipeLayer() {
        const {currentRecipe, recipe, source, layerConfig, map, boundsChanged$, dragging$, cursor$} = this.props
        const layer = this.maybeCreateLayer()
        const props = {
            currentRecipe,
            recipe,
            source,
            layer,
            layerConfig,
            map,
            boundsChanged$,
            dragging$,
            cursor$
        }
        switch (recipe.type) {
        case 'MOSAIC':
            return (
                <OpticalMosaicImageLayer {...props}/>
            )
        case 'RADAR_MOSAIC':
            return (
                <RadarMosaicImageLayer {...props}/>
            )
        case 'PLANET_MOSAIC':
            return (
                <PlanetMosaicImageLayer {...props}/>
            )
        case 'CLASSIFICATION':
            return (
                <ClassificationImageLayer {...props}/>
            )
        case 'CLASS_CHANGE':
            return (
                <ClassChangeImageLayer {...props}/>
            )
        case 'INDEX_CHANGE':
            return (
                <IndexChangeImageLayer {...props}/>
            )
        case 'REMAPPING':
            return (
                <RemappingImageLayer {...props}/>
            )
        case 'CHANGE_ALERTS':
            return (
                <ChangeAlertsImageLayer {...props}/>
            )
        case 'CCDC_SLICE':
            return (
                <CCDCSliceImageLayer {...props}/>
            )
        default:
            return null
        }
    }

    componentDidMount() {
        if (this.selfManagedVisualiations()) {
            return
        }
        const {layerConfig: {visParams}} = this.props
        if (!visParams) {
            this.selectVisualization((this.toAllVis())[0])
        }
    }

    componentDidUpdate(prevProps) {
        if (this.selfManagedVisualiations()) {
            return
        }
        const {layerConfig: {visParams: prevVisParams}} = prevProps
        const {recipe} = this.props
        if (!recipe) return
        const allVisualizations = this.toAllVis()
        if (!allVisualizations.length) return
        if (prevVisParams) {
            const visParams = allVisualizations
                .find(({
                    id,
                    bands
                }) => id === prevVisParams.id && (prevVisParams.id || _.isEqual(bands, prevVisParams.bands)))
            if (!visParams) {
                this.selectVisualization(allVisualizations[0])
            } else if (!_.isEqual(visParams, prevVisParams)) {
                this.selectVisualization(visParams)
            }
        } else {
            this.selectVisualization(allVisualizations[0])
        }
    }

    selfManagedVisualiations() {
        const {recipe} = this.props
        return recipe && recipe.type === 'CCDC_SLICE'
    }

    toAllVis() {
        const {currentRecipe, recipe, sourceId} = this.props
        return [
            ...getUserDefinedVisualizations(currentRecipe, sourceId),
            ...getAllVisualizations(recipe),
        ]
    }

    maybeCreateLayer() {
        const {recipe, layerConfig, map} = this.props
        return map && recipe.ui.initialized && layerConfig && layerConfig.visParams
            ? this.createLayer()
            : null
    }

    createLayer() {
        const {recipe, layerConfig, map, boundsChanged$, dragging$, cursor$, busy$} = this.props
        const recipes = [recipe, ...getDependentRecipes(recipe)]
        const availableBands = getRecipeType(recipe.type).getAvailableBands(recipe)
        const dataTypes = _.mapValues(availableBands, 'dataType')
        const {watchedProps: prevWatchedProps} = this.layer || {}
        const previewRequest = {
            recipe: _.omit(recipe, ['ui', 'layers']),
            ...layerConfig
        }
        const watchedProps = {recipes: recipes.map(r => _.omit(r, ['ui', 'layers', 'title'])), layerConfig}
        if (!_.isEqual(watchedProps, prevWatchedProps)) {
            this.layer && this.layer.removeFromMap()
            this.layer = new EarthEngineImageLayer({
                previewRequest,
                watchedProps,
                dataTypes,
                visParams: layerConfig.visParams,
                map,
                busy$,
                cursorValue$: this.cursorValue$,
                boundsChanged$,
                dragging$,
                cursor$
            })
        }
        return this.layer
    }

    selectVisualization(visParams) {
        const {layerConfig: {panSharpen}, mapAreaContext: {updateLayerConfig}} = this.props
        updateLayerConfig({visParams, panSharpen})
    }
}

const getDependentRecipes = recipe =>
    getRecipeType(recipe.type)
        .getDependentRecipeIds(recipe)
        .map(recipeId => select(['process.loadedRecipes', recipeId]))
        .filter(r => r)
        .map(r => getDependentRecipes(r))
        .flat()

export const RecipeImageLayer = compose(
    _RecipeImageLayer,
    connect(mapStateToProps),
    withMapAreaContext(),
    withTabContext(),
    withSubscriptions()
)

RecipeImageLayer.propTypes = {
    layerConfig: PropTypes.object.isRequired,
    source: PropTypes.object.isRequired,
    boundsChanged$: PropTypes.any,
    cursor$: PropTypes.any,
    dragging$: PropTypes.any,
    map: PropTypes.object
}
