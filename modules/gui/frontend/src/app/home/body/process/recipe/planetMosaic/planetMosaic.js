import {Aoi} from 'app/home/body/process/recipe/aoi'
import {Map} from 'app/home/map/map'
import {compose} from 'compose'
import {defaultModel} from './planetMosaicRecipe'
import {getAvailableBands} from './bands'
import {getPreSetVisualizations} from './visualizations'
import {initializeLayers} from 'app/home/body/process/recipe/recipeImageLayerSource'
import {msg} from 'translate'
import {recipe} from 'app/home/body/process/recipeContext'
import {selectFrom} from 'stateUtils'
import PlanetMosaicToolbar from './panels/planetMosaicToolbar'
import React from 'react'
import moment from 'moment'

const mapRecipeToProps = recipe => ({
    aoi: selectFrom(recipe, 'model.aoi'),
    savedLayers: selectFrom(recipe, 'layers')
})

class _PlanetMosaic extends React.Component {
    constructor(props) {
        super(props)
        const {savedLayers, recipeId} = props
        initializeLayers({recipeId, savedLayers})
    }

    render() {
        const {aoi} = this.props
        return (
            <Map>
                <PlanetMosaicToolbar/>
                <Aoi value={aoi}/>
            </Map>
        )
    }
}

const PlanetMosaic = compose(
    _PlanetMosaic,
    recipe({defaultModel, mapRecipeToProps})
)

const getDateRange = recipe => {
    const {fromDate, toDate, targetDate} = recipe.model.dates
    const startDate = fromDate || targetDate
    const endDate = toDate || targetDate
    return [moment.utc(startDate, 'YYYY-MM-DD'), moment.utc(endDate, 'YYYY-MM-DD')]
}

export default () => ({
    id: 'PLANET_MOSAIC',
    labels: {
        name: msg('process.planetMosaic.create'),
        creationDescription: msg('process.planetMosaic.description'),
        tabPlaceholder: msg('process.planetMosaic.tabPlaceholder'),
    },
    components: {
        recipe: PlanetMosaic
    },
    getDependentRecipeIds: _recipe => [],
    getDateRange,
    getAvailableBands,
    getPreSetVisualizations
})