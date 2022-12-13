import {Activator, withActivator} from 'widget/activation/activator'
import {Msg, msg} from 'translate'
import {RecipeState, duplicateRecipe, exportRecipe$} from './recipe'
import {compose} from 'compose'
import {connect, select} from 'store'
import Menu, {MenuItem} from 'widget/menu'
import Notifications from 'widget/notifications'
import React from 'react'

const mapStateToProps = (state, ownProps) => {
    const recipeState = RecipeState(ownProps.recipeId)
    return {
        recipe: recipeState && recipeState(),
        recipes: select('process.recipes')
    }
}

class ProcessMenu extends React.Component {
    render() {
        const {recipe} = this.props
        if (recipe && recipe.type && recipe.ui.initialized) {
            const unsaved = this.isRecipeUnsaved()
            return (
                <Menu>
                    {unsaved
                        ? this.renderUnsavedRecipeItems()
                        : this.renderSavedRecipeItems()}
                    <MenuItem onSelect={() => duplicateRecipe(this.props.recipe)}>
                        <Msg id='process.menu.duplicateRecipe.label'/>
                    </MenuItem>
                    <MenuItem onSelect={() => this.exportRecipe(recipe)}>
                        <Msg id='process.menu.exportRecipe'/>
                    </MenuItem>
                </Menu>
            )
        } else {
            return <Menu disabled/>
        }
    }

    renderUnsavedRecipeItems() {
        const {recipe, activator: {activatables: {saveRecipeDialog}}} = this.props
        return (
            <MenuItem onSelect={() => saveRecipeDialog.activate({recipe, closeTabOnSave: false})}>
                <Msg id='process.menu.saveRecipe'/>
            </MenuItem>
        )
    }

    renderSavedRecipeItems() {
        return (
            <Activator id='revisions'>
                {({activate}) =>
                    <MenuItem onSelect={() => activate()}>
                        <Msg id='process.menu.revertToOldRevision'/>
                    </MenuItem>
                }
            </Activator>
        )
    }

    isRecipeUnsaved() {
        const {recipe, recipes} = this.props
        return !(recipes && recipes.find(saved => saved.id === recipe.id))
    }

    exportRecipe() {
        const {recipe, stream} = this.props
        stream({
            name: 'EXPORT_RECIPE',
            stream$: exportRecipe$(recipe),
            onComplete: () => Notifications.success({message: msg('process.recipe.export.success')}),
            onError: error => Notifications.error({message: msg('process.recipe.export.error'), error})
        })
    }
}

export default compose(
    ProcessMenu,
    connect(mapStateToProps),
    withActivator('saveRecipeDialog')
)
