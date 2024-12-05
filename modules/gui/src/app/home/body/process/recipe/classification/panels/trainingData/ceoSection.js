import PropTypes from 'prop-types'
import React from 'react'
import { CeoInput } from 'widget/ceoInput'

import {RecipeInput} from '~/widget/recipeInput'

export class CeoSection extends React.Component {
    render() {
        // const {recipeId, inputs: {name, recipe}, onLoading} = this.props
        return (
            <CeoInput
                // input={recipe}
                // filter={(type, recipe) => type.id === 'CLASSIFICATION' && recipe.id !== recipeId}
                // autoFocus
                // onLoading={onLoading}
                // onLoaded={({recipe}) => name.set(recipe.title || recipe.placeholder)}
            />
        )
    }

    // TODO: Should do some validation of the bands. Use a separate input for that?
}

// CeoSection.propTypes = {
//     inputs: PropTypes.object.isRequired,
// }
