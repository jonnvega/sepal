import {Slider} from 'widget/slider'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'

export class FormSlider extends React.Component {
    render() {
        const {input, alignment, decimals, disabled, info, invert, label, maxValue, minValue, range, scale, snap, ticks, tooltip, tooltipPlacement, onChange} = this.props
        return (
            <Slider
                value={input.value}
                alignment={alignment}
                decimals={decimals}
                disabled={disabled}
                info={info}
                invert={invert}
                label={label}
                maxValue={maxValue}
                minValue={minValue}
                range={range}
                scale={scale}
                snap={snap}
                ticks={ticks}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}
                onChange={value => {
                    input.set(value)
                    onChange && onChange(value)
                }}
            />
        )
    }
}

FormSlider.propTypes = {
    input: PropTypes.object.isRequired,
    alignment: PropTypes.oneOf(['left', 'center', 'right']),
    decimals: PropTypes.number,
    disabled: PropTypes.any,
    info: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.func
    ]),
    invert: PropTypes.any,
    label: PropTypes.string,
    maxValue: PropTypes.number,
    minValue: PropTypes.number,
    range: PropTypes.oneOf(['none', 'low', 'high']),
    scale: PropTypes.oneOf(['linear', 'log']),
    snap: PropTypes.any,
    ticks: PropTypes.oneOfType([
        // PropTypes.number,
        PropTypes.array
    ]),
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.string,
    onChange: PropTypes.func
}
