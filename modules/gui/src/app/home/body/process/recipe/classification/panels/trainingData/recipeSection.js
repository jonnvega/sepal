import {RecipeInput} from 'widget/recipeInput'
import PropTypes from 'prop-types'
import React from 'react'

export default class RecipeSection extends React.Component {
    render() {
        const {recipeId, inputs: {name, recipe}, onLoading} = this.props
        console.log({recipeId})
        return (
            <RecipeInput
                input={recipe}
                filter={(type, recipe) => type.id === 'CLASSIFICATION' && recipe.id !== recipeId}
                autoFocus
                onLoading={onLoading}
                onLoaded={({recipe}) => name.set(recipe.title || recipe.placeholder)}
                errorMessage
            />
        )
    }

    // TODO: Should do some validation of the bands. Use a separate input for that?
}

RecipeSection.propTypes = {
    inputs: PropTypes.object.isRequired,
}
