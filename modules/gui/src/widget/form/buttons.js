import {Buttons} from 'widget/buttons'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'

export class FormButtons extends React.Component {
    render() {
        const {chromeless, look, shape, size, air, className, input, label, labelButtons, multiple, options, tooltip, tooltipPlacement,
            layout, alignment, spacing, groupSpacing, framed, disabled, tabIndex, width, onChange
        } = this.props
        return (
            <Buttons
                chromeless={chromeless}
                look={look}
                shape={shape}
                size={size}
                air={air}
                className={className}
                selected={input.value}
                onChange={value => {
                    input.set(value)
                    onChange && onChange(value)
                }}
                label={label}
                labelButtons={labelButtons}
                multiple={multiple}
                options={options}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}
                layout={layout}
                alignment={alignment}
                spacing={spacing}
                groupSpacing={groupSpacing}
                framed={framed}
                disabled={disabled}
                tabIndex={tabIndex}
                width={width}
            />
        )
    }

    componentDidUpdate() {
        const {multiple, input, options} = this.props
        if (_.isUndefined(input.value) || _.isNull(input.value) || !input.value.length) {
            return
        }
        const availableValues = options
            .map(optionOrGroup =>
                Object.keys(optionOrGroup).includes('options')
                    ? optionOrGroup.disabled ? [] : optionOrGroup.options
                    : [optionOrGroup]
            )
            .flat()
            .filter(({disabled, neverSelected}) => !disabled && !neverSelected)
            .map(({value}) => value)

        input.set(multiple
            ? _.isArray(input.value)
                ? input.value.filter(value => availableValues.includes(value))
                : []
            : availableValues.includes(input.value)
                ? input.value
                : null
        )
    }
}

FormButtons.propTypes = {
    air: PropTypes.any,
    alignment: PropTypes.string,
    chromeless: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    framed: PropTypes.any,
    groupSpacing: PropTypes.any,
    input: PropTypes.object,
    label: PropTypes.any,
    labelButtons: PropTypes.any,
    layout: PropTypes.string,
    look: PropTypes.string,
    multiple: PropTypes.any,
    options: PropTypes.array,
    shape: PropTypes.string,
    size: PropTypes.string,
    spacing: PropTypes.string,
    tooltip: PropTypes.any,
    tooltipPlacement: PropTypes.string,
    width: PropTypes.any,
    onChange: PropTypes.any
}
