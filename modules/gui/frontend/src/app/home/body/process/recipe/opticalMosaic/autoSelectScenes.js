import {RecipeActions} from 'app/home/body/process/recipe/opticalMosaic/opticalMosaicRecipe'
import {Subject, map, takeUntil} from 'rxjs'
import {compose} from 'compose'
import {msg} from 'translate'
import {withRecipe} from 'app/home/body/process/recipeContext'
import MapStatus from 'widget/mapStatus'
import React from 'react'
import api from 'api'

const mapRecipeToProps = recipe => ({recipe})

class AutoSelectScenes extends React.Component {
    constructor(props) {
        super(props)
        const {recipe, asyncActionBuilder} = props
        this.recipeActions = RecipeActions(recipe.id)
        this.request$ = new Subject()
        this.request$.subscribe(() => {
            this.recipeActions.setAutoSelectScenesState('RUNNING').dispatch()
            asyncActionBuilder('AUTO_SELECT_SCENES',
                this.autoSelectScenes$())
                .onComplete(() => this.recipeActions.setAutoSelectScenesState(null))
                .dispatch()
        }
        )
    }

    autoSelectScenes$() {
        const recipe = this.props.recipe
        return api.gee.autoSelectScenes$({
            sceneAreaIds: recipe.ui.sceneAreas.map(sceneArea => sceneArea.id),
            sources: recipe.model.sources,
            dates: recipe.model.dates,
            sceneSelectionOptions: recipe.model.sceneSelectionOptions,
            sceneCount: recipe.ui.autoSelectScenes,
            cloudCoverTarget: 0.001
        }).pipe(
            map(scenes =>
                this.recipeActions.setSelectedScenes(scenes)
            ),
            takeUntil(this.request$)
        )
    }

    render() {
        const {action} = this.props
        return (
            <div>
                {action('AUTO_SELECT_SCENES').dispatching
                    ? <MapStatus message={msg('process.mosaic.panel.autoSelectScenes.selecting')}/>
                    : null}
            </div>
        )
    }

    componentDidUpdate() {
        if (this.props.recipe.ui.autoSelectScenesState === 'SUBMITTED')
            this.request$.next()
    }

    componentWillUnmount() {
        this.request$.unsubscribe()
    }
}

export default compose(
    AutoSelectScenes,
    withRecipe(mapRecipeToProps)
)
