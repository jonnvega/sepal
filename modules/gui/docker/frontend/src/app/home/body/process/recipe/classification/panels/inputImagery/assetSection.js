import {AssetInput} from 'widget/assetInput'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'
import style from './inputImage.module.css'

export default class AssetSection extends React.Component {
    render() {
        const {input, onLoading, onLoaded} = this.props
        return (
            <AssetInput
                className={style.inputComponent}
                input={input}
                label={msg('process.classification.panel.inputImagery.form.asset.label')}
                placeholder={msg('process.classification.panel.inputImagery.form.asset.placeholder')}
                autoFocus
                onLoading={onLoading}
                onLoaded={({asset, metadata, visualizations}) => {
                    onLoaded({id: asset, bands: metadata.bands, metadata, visualizations})
                }}
            />
        )
    }
}

AssetSection.propTypes = {
    input: PropTypes.object.isRequired,
    onLoaded: PropTypes.func.isRequired,
    onLoading: PropTypes.func.isRequired
}
