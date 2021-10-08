import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {Widget} from 'widget/widget'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import styles from './buttons.module.css'

export class Buttons extends React.Component {
    isSelected(value) {
        const {multiple, selected} = this.props
        return multiple
            ? Array.isArray(selected) && selected.includes(value)
            : selected === value
    }

    toggleMultiple(value) {
        const {selected} = this.props
        const prevValue = Array.isArray(selected) ? selected : []
        const nextValue = this.isSelected(value)
            ? prevValue.filter(v => v !== value)
            : [...prevValue, value]
        return nextValue
    }

    select(value) {
        const {selected, multiple, onChange} = this.props
        const prevValue = selected
        const nextValue = multiple ? this.toggleMultiple(value) : value
        if (prevValue !== nextValue) {
            onChange && onChange(nextValue)
        }
    }

    renderButton({value, label, tooltip, disabled: buttonDisabled, alwaysSelected, neverSelected}) {
        const {chromeless, air, disabled: allDisabled, look, shape, size, tabIndex} = this.props
        const selected = !allDisabled && (alwaysSelected || (!neverSelected && this.isSelected(value)))
        return chromeless
            ? (
                <Button
                    key={value}
                    chromeless
                    look='transparent'
                    shape={shape || 'pill'}
                    size={size}
                    disabled={allDisabled || buttonDisabled || alwaysSelected || neverSelected}
                    label={label}
                    content={selected ? 'smallcaps-highlight' : 'smallcaps'}
                    tooltip={tooltip}
                    tooltipPlacement='bottom'
                    tabIndex={tabIndex}
                    onClick={() => this.select(value)}/>
            )
            : (
                <Button
                    key={value}
                    look={selected ? 'highlight' : look || 'default'}
                    shape={shape}
                    size={size}
                    air={air}
                    disabled={allDisabled || buttonDisabled || alwaysSelected || neverSelected}
                    label={label}
                    content='smallcaps'
                    tooltip={tooltip}
                    tooltipPlacement='bottom'
                    tabIndex={tabIndex}
                    onClick={() => this.select(value)}/>
            )

    }

    renderButtons(options, key, label, disabled) {
        const {layout, alignment, spacing} = this.props
        return (
            <ButtonGroup key={key} className={styles.buttons} layout={layout} alignment={alignment} spacing={spacing} label={label} disabled={disabled}>
                {options.map(option => this.renderButton(
                    _.isObjectLike(option)
                        ? option
                        : {value: option, label: option}
                ))}
            </ButtonGroup>
        )
    }

    renderOptionGroups(groups) {
        return (
            groups.map((group, i) =>
                this.renderButtons(group.options, group.value || group.label || i, group.label, group.disabled)
            )
        )
    }

    render() {
        const {label, tooltip, tooltipPlacement, disabled, options, className} = this.props
        return (
            <Widget
                className={className}
                label={label}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}
                disabled={disabled}
            >
                {options.length && options[0].options
                    ? this.renderOptionGroups(options)
                    : this.renderButtons(options)}
            </Widget>
        )
    }
}

Buttons.propTypes = {
    air: PropTypes.any,
    alignment: PropTypes.any,
    chromeless: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    // label: PropTypes.oneOf([PropTypes.string, PropTypes.element]),
    label: PropTypes.any,
    layout: PropTypes.string,
    look: PropTypes.string,
    multiple: PropTypes.any,
    options: PropTypes.array,
    selected: PropTypes.any,
    shape: PropTypes.string,
    size: PropTypes.string,
    spacing: PropTypes.any,
    tabIndex: PropTypes.number,
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.string,
    onChange: PropTypes.any
}
