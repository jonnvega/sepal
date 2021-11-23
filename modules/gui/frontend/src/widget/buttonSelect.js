import {Button} from 'widget/button'
import {ButtonGroup} from './buttonGroup'
import {ScrollableList} from 'widget/list'
import {Subject, delay} from 'rxjs'
import {compose} from 'compose'
import {connect} from 'store'
import {selectFrom} from 'stateUtils'
import FloatingBox from 'widget/floatingBox'
import Icon from 'widget/icon'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import styles from './buttonSelect.module.css'
import withSubscriptions from 'subscription'

const SELECTION_DELAY_MS = 350

const mapStateToProps = state => ({
    dimensions: selectFrom(state, 'dimensions') || []
})

class ButtonSelect extends React.Component {
    input = React.createRef()
    list = React.createRef()
    select$ = new Subject()
    state = {
        showOptions: false,
        flattenedOptions: [],
        selectedOption: null,
        selected: false
    }

    constructor() {
        super()
        this.handleBlur = this.handleBlur.bind(this)
    }

    render() {
        const {className} = this.props
        const {showOptions} = this.state
        return (
            <div className={[styles.container, className].join(' ')}>
                {this.renderButton()}
                {showOptions ? this.renderOptions() : null}
            </div>
        )
    }

    renderButton() {
        const {onClick} = this.props
        return onClick
            ? this.renderMultiButton()
            : this.renderSingleButton()
    }

    renderSingleButton() {
        const {disabled, chromeless, shape, look, icon, tooltip, tooltipPlacement, width, onMouseOver, onMouseOut} = this.props
        return (
            <Button
                ref={this.input}
                chromeless={chromeless}
                shape={shape}
                look={look}
                icon={icon}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}
                width={width}
                onClick={() => this.toggleOptions()}
                onMouseOver={onMouseOver}
                onMouseOut={onMouseOut}
                disabled={disabled}
                label={this.getLabel()}
                tail={
                    <Icon name={this.getChevronIcon()}/>
                }
            />
        )
    }

    renderMultiButton() {
        const {disabled, chromeless, shape, look, icon, tooltip, tooltipPlacement, width, onClick, onMouseOver, onMouseOut} = this.props
        return (
            <ButtonGroup
                ref={this.input}
                spacing='tight'
                onMouseOver={onMouseOver}
                onMouseOut={onMouseOut}
            >
                <Button
                    chromeless={chromeless}
                    shape={shape}
                    look={look}
                    icon={icon}
                    tooltip={tooltip}
                    tooltipPlacement={tooltipPlacement}
                    width={width}
                    onClick={e => onClick && onClick(e)}
                    disabled={disabled}
                    label={this.getLabel()}
                />
                <Button
                    chromeless={chromeless}
                    shape={shape}
                    look={look}
                    icon={this.getChevronIcon()}
                    tooltip={tooltip}
                    tooltipPlacement={tooltipPlacement}
                    width={width}
                    onClick={() => this.toggleOptions()}
                    disabled={disabled}
                />
            </ButtonGroup>
        )
    }

    getLabel() {
        const {label} = this.props
        const {selectedOption} = this.state
        return (selectedOption && (selectedOption.buttonLabel || selectedOption.label)) || label
    }

    getChevronIcon() {
        const {placement} = this.props
        return placement === 'above' ? 'chevron-up' : 'chevron-down'
    }

    renderOptions() {
        const {placement, optionsClassName, optionTooltipPlacement} = this.props
        const {flattenedOptions, selectedOption, selected} = this.state
        return (
            <FloatingBox
                element={this.input.current}
                placement={placement}
                alignment='left'
                onBlur={this.handleBlur}>
                <ScrollableList
                    ref={this.list}
                    className={optionsClassName || styles.options}
                    options={flattenedOptions}
                    selectedOption={selectedOption}
                    onSelect={option => this.select$.next(option)}
                    onCancel={() => this.hideOptions()}
                    autoCenter={!selected}
                    tooltipPlacement={optionTooltipPlacement}
                    air='more'
                    keyboard
                />
            </FloatingBox>
        )
    }

    toggleOptions() {
        const {showOptions} = this.state
        showOptions
            ? this.hideOptions()
            : this.showOptions()
    }

    showOptions() {
        this.setState({showOptions: true})
    }

    hideOptions() {
        this.setState({showOptions: false, selectedOption: null})
    }

    setSelectedOption(selectedOption) {
        this.updateState({
            selectedOption,
            selected: true
        })
    }

    updateState(state, callback) {
        const updatedState = (prevState, state) =>
            _.isEqual(_.pick(prevState, _.keys(state)), state) ? null : state
        this.setState(
            prevState =>
                updatedState(prevState, _.isFunction(state) ? state(prevState) : state),
            callback
        )
    }

    handleSelect() {
        const {input, onSelect, addSubscription} = this.props
        addSubscription(
            this.select$.subscribe(
                option => {
                    this.setSelectedOption(option)
                    input && input.set(option.value)
                    onSelect && onSelect(option)
                }
            ),
            this.select$.pipe(
                delay(SELECTION_DELAY_MS)
            ).subscribe(
                () => this.setState({selected: false}, this.hideOptions)
            )
        )
    }

    handleBlur(e) {
        const isInputClick = e => this.input.current && this.input.current.contains(e.target)
        const isListClick = e => this.list.current && this.list.current.contains && this.list.current.contains(e.target)
        if (!isInputClick(e) && !isListClick(e)) {
            this.hideOptions()
        }
    }

    componentDidMount() {
        this.handleSelect()
    }

    static getDerivedStateFromProps(props, state) {
        const {input} = props
        const {flattenedOptions} = state
        return input
            ? {
                selectedOption: _.find(flattenedOptions, option => option.value === input.value)
            }
            : null
    }

    componentDidUpdate() {
        this.updateOptions()
    }

    updateOptions() {
        const {options} = this.props
        const getFlattenedOptions = options =>
            _.flatten(
                options.map(option =>
                    option.options
                        ? [{..._.omit(option, 'options'), group: true}, ...option.options]
                        : option
                )
            )
        this.updateState({
            flattenedOptions: getFlattenedOptions(options)
        })
    }
}

export default compose(
    ButtonSelect,
    withSubscriptions(),
    connect(mapStateToProps)
)

ButtonSelect.propTypes = {
    options: PropTypes.any.isRequired,
    chromeless: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    icon: PropTypes.string,
    input: PropTypes.any,
    label: PropTypes.any,
    look: PropTypes.string,
    optionsClassName: PropTypes.string,
    optionTooltipPlacement: PropTypes.string,
    placement: PropTypes.oneOf(['above', 'below']),
    shape: PropTypes.string,
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.string,
    width: PropTypes.string,
    onClick: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseOver: PropTypes.func,
    onSelect: PropTypes.func
}

ButtonSelect.defaultProps = {
    placement: 'below'
}
