import {Combo} from 'widget/combo'
import PropTypes from 'prop-types'
import React from 'react'

export const FormCombo = (
    {
        input, options, additionalButtons, alignment, allowClear, autoFocus, busyMessage, className, disabled,
        errorMessage, inputClassName, keyboard, label, optionsClassName, optionTooltipPlacement, placeholder, placement,
        readOnly, standalone, tooltip, tooltipPlacement, onCancel, onChange
    }) =>
    <Combo
        value={input.value}
        options={options}
        additionalButtons={additionalButtons}
        alignment={alignment}
        allowClear={allowClear}
        autoFocus={autoFocus}
        busyMessage={busyMessage}
        className={className}
        disabled={disabled}
        errorMessage={errorMessage || [input]}
        inputClassName={inputClassName}
        keyboard={keyboard}
        label={label}
        optionsClassName={optionsClassName}
        optionTooltipPlacement={optionTooltipPlacement}
        placeholder={placeholder}
        placement={placement}
        readOnly={readOnly}
        standalone={standalone}
        tooltip={tooltip}
        tooltipPlacement={tooltipPlacement}
        onCancel={onCancel}
        onChange={option => {
            input.set(option ? option.value : null)
            onChange && onChange(option)
        }}
        onBlur={() => input.validate()}/>

FormCombo.propTypes = {
    input: PropTypes.any.isRequired,
    options: PropTypes.any.isRequired,
    additionalButtons: PropTypes.any,
    alignment: PropTypes.any,
    allowClear: PropTypes.any,
    autoFocus: PropTypes.any,
    busyMessage: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    errorMessage: PropTypes.any,
    inputClassName: PropTypes.string,
    keyboard: PropTypes.any,
    label: PropTypes.string,
    optionsClassName: PropTypes.string,
    optionTooltipPlacement: PropTypes.string,
    placeholder: PropTypes.string,
    placement: PropTypes.any,
    readOnly: PropTypes.any,
    standalone: PropTypes.any,
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.string,
    onCancel: PropTypes.func,
    onChange: PropTypes.func
}

FormCombo.defaultProps = {
    alignment: 'left',
    placement: 'below',
    tooltipPlacement: 'top'
}
