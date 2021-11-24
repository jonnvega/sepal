import {Layout} from 'widget/layout'
import {compose} from 'compose'
import Label from 'widget/label'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './widget.module.css'
import withForwardedRef from 'ref'

export class _Widget extends React.Component {
    render() {
        const {forwardedRef, layout, spacing, alignment, framed, border, disabled, className, onMouseOver, onMouseOut, onClick} = this.props
        const widgetState = this.getWidgetState()
        return (
            <div
                ref={forwardedRef}
                className={[
                    styles.container,
                    styles[widgetState],
                    onClick && !disabled ? styles.clickable : null,
                    disabled ? styles.disabled : null,
                    ['vertical-scrollable', 'vertical-fill'].includes(layout) ? styles.scrollable : null,
                    className
                ].join(' ')}
                onClick={e => onClick && onClick(e)}>
                {this.renderLabel()}
                <Layout
                    type={layout}
                    alignment={alignment}
                    spacing={spacing}
                    framed={framed}
                    className={[
                        styles.widget,
                        disabled ? styles.normal : styles[widgetState],
                        border ? styles.border : null
                    ].join(' ')}
                    onMouseOver={onMouseOver}
                    onMouseOut={onMouseOut}
                >
                    {this.renderContent()}
                </Layout>
            </div>
        )
    }

    renderContent() {
        const {children} = this.props
        return children
    }

    getWidgetState() {
        const {errorMessage, busyMessage} = this.props
        if (errorMessage) return 'error'
        if (busyMessage) return 'busy'
        return 'normal'
    }

    renderLabel() {
        const {label, labelButtons, alignment, tooltip, tooltipPlacement, tooltipTrigger, disabled, errorMessage} = this.props
        return label
            ? (
                <Label
                    msg={label}
                    buttons={labelButtons}
                    alignment={alignment}
                    tooltip={tooltip}
                    tooltipPlacement={tooltipPlacement}
                    tooltipTrigger={tooltipTrigger}
                    tabIndex={-1}
                    error={!disabled && errorMessage}
                />
            )
            : null
    }

    getBusyMessage() {
        const {busyMessage} = this.props
        return busyMessage
    }
}

export const Widget = compose(
    _Widget,
    withForwardedRef()
)

Widget.propTypes = {
    children: PropTypes.any.isRequired,
    alignment: PropTypes.any,
    border: PropTypes.any,
    busyMessage: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    errorMessage: PropTypes.any,
    framed: PropTypes.any,
    label: PropTypes.any,
    labelButtons: PropTypes.any,
    layout: PropTypes.any,
    spacing: PropTypes.any,
    tooltip: PropTypes.any,
    tooltipPlacement: PropTypes.any,
    tooltipTrigger: PropTypes.any,
    onClick: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseOver: PropTypes.func
}

Widget.defaultProps = {
    layout: 'vertical',
    spacing: 'none' // TODO: why spacing none by default?
}
