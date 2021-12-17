import {Button} from 'widget/button'
import {ElementResizeDetector} from 'widget/elementResizeDetector'
import {Scrollable, ScrollableContainer} from 'widget/scrollable'
import {Subject} from 'rxjs'
import {compose} from 'compose'
import {msg} from 'translate'
import Keybinding from 'widget/keybinding'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import styles from './list.module.css'
import withForwardedRef from 'ref'
import withSubscriptions from 'subscription'

const autoCenter$ = new Subject()

class _ScrollableList extends React.Component {
    render() {
        const {className, ...props} = this.props
        return (
            <ElementResizeDetector onResize={() => autoCenter$.next()}>
                <ScrollableContainer className={className}>
                    <Scrollable
                        className={styles.options}
                        direction='y'>
                        {scrollable =>
                            <List
                                {...props}
                                scrollable={scrollable}
                            />}
                    </Scrollable>
                </ScrollableContainer>
            </ElementResizeDetector>
        )
    }
}
export const ScrollableList = compose(
    _ScrollableList,
    withSubscriptions(),
    withForwardedRef()
)

ScrollableList.propTypes = {
    options: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.any,
            value: PropTypes.any
        })
    ).isRequired,
    onSelect: PropTypes.func.isRequired,
    air: PropTypes.any,
    alignment: PropTypes.oneOf(['left', 'center', 'right']),
    autoCenter: PropTypes.any,
    autoHighlight: PropTypes.any,
    className: PropTypes.string,
    keyboard: PropTypes.any,
    noResults: PropTypes.string,
    overScroll: PropTypes.any,
    selectedOption: PropTypes.any,
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.oneOf(['left', 'right']),
    onCancel: PropTypes.func
}

ScrollableList.defaultProps = {
    alignment: 'left',
    tooltipPlacement: 'right'
}

class List extends React.Component {
    highlighted = React.createRef()
    selected = React.createRef()
    state = {
        highlightedOption: null,
        overrideHover: false
    }

    constructor(props) {
        super(props)
        const {forwardedRef} = props
        this.list = forwardedRef
            ? forwardedRef
            : React.createRef()
    }

    render() {
        const {scrollable: {containerHeight}, onCancel, keyboard} = this.props
        const keymap = {
            Escape: onCancel ? onCancel : null,
            Enter: () => this.selectHighlighted(),
            ArrowUp: () => this.highlightPrevious(),
            ArrowDown: () => this.highlightNext(),
            Home: () => this.highlightFirst(),
            End: () => this.highlightLast()
        }
        return (
            <Keybinding keymap={keymap} disabled={keyboard === false}>
                {this.renderList(containerHeight)}
            </Keybinding>
        )
    }

    renderList(containerHeight = 0) {
        const {options, overScroll} = this.props
        return (
            <ul
                ref={this.list}
                style={{
                    '--scrollable-container-height': overScroll ? containerHeight : 0
                }}
                onMouseLeave={() => autoCenter$.next(true)}
            >
                {this.renderOptions(options)}
            </ul>
        )
    }

    renderOptions(options) {
        const {noResults} = this.props
        return options.length
            ? options.map((option, index) => this.renderOption(option, index))
            : this.renderOption({label: noResults || msg('widget.list.noResults')})
    }

    renderOption(option, index) {
        return option.value !== undefined && !option.disabled
            ? this.renderSelectableOption(option, index)
            : option.group
                ? option.render || option.label
                    ? this.renderGroup(option, index)
                    : this.renderSeparator(option, index)
                : this.renderNonSelectableOption(option, index)
    }

    renderGroup(option, index) {
        const {alignment, air} = this.props
        return (
            <li key={option.key || index}>
                <Button
                    chromeless
                    look='transparent'
                    air={air}
                    additionalClassName={styles.group}
                    label={option.render ? option.render() : option.label}
                    width='max'
                    alignment={alignment}
                    disabled
                />
            </li>
        )
    }

    renderNonSelectableOption(option, index) {
        const {alignment, air} = this.props
        return (
            <li key={option.key || option.value || index}>
                <Button
                    chromeless
                    look='transparent'
                    air={air}
                    label={option.render ? option.render() : option.label}
                    width='max'
                    alignment={alignment}
                    disabled
                />
            </li>
        )
    }

    renderSeparator(option, index) {
        return (
            <li key={option.key || index} className={styles.separator}/>
        )
    }

    renderSelectableOption(option, index) {
        const {selectedOption, tooltipPlacement, alignment, air} = this.props
        const {overrideHover} = this.state
        const selected = this.isSelected(option)
        const highlighted = this.isHighlighted(option)
        const hover = overrideHover
            ? highlighted
            : null
        const ref = selected
            ? this.selected
            : highlighted
                ? this.highlighted
                : null
        return (
            <li
                key={option.key || option.value || index}
                data-option-value={option.value}
                ref={ref}>
                <Button
                    chromeless={!selected}
                    look={selected ? 'selected' : 'highlight'}
                    air={air}
                    label={option.render ? null : option.label}
                    tooltip={option.tooltip}
                    tooltipPlacement={tooltipPlacement}
                    hover={hover}
                    width='max'
                    alignment={alignment}
                    disableTransitions
                    onMouseOver={() => this.highlightOption(option)}
                    onMouseOut={() => this.highlightOption(selectedOption)}
                    onClick={() => this.selectOption(option)}
                >
                    {option.render ? option.render() : null}
                </Button>
            </li>
        )
    }

    isSelected(option) {
        const {selectedOption} = this.props
        return option === selectedOption
    }

    isSelectable(option) {
        return !option.group && option.value
    }

    isHighlighted(option) {
        const {highlightedOption} = this.state
        return highlightedOption && option && highlightedOption.value === option.value
    }

    selectHighlighted() {
        const {highlightedOption} = this.state
        if (highlightedOption) {
            this.selectOption(highlightedOption)
        }
    }

    cancel() {
        const {onCancel} = this.props
        onCancel && onCancel()
    }

    getSelectedOption() {
        const {options, selectedOption} = this.props
        return _.find(options, option => option === selectedOption)
    }

    getPreviousSelectableOption(option) {
        const {options} = this.props
        const index = _.indexOf(options, option)
        const previousIndex =
            index === -1
                ? options.length - 1
                : Math.max(index - 1, 0)
        return _.findLast(options, option => this.isSelectable(option), previousIndex) || option
    }

    getNextSelectableOption(option) {
        const {options} = this.props
        const nextIndex = Math.min(_.indexOf(options, option) + 1, options.length - 1)
        return _.find(options, option => this.isSelectable(option), nextIndex) || option
    }

    getFirstSelectableOption() {
        const {options} = this.props
        return _.find(options, option => this.isSelectable(option))
    }

    getLastSelectableOption() {
        const {options} = this.props
        return _.findLast(options, option => this.isSelectable(option))
    }

    highlightOption(highlightedOption) {
        this.setState({
            highlightedOption,
            overrideHover: false
        })
    }

    highlightPrevious() {
        this.setState(({highlightedOption}) => ({
            highlightedOption: this.getPreviousSelectableOption(highlightedOption),
            overrideHover: true
        }), this.scroll)
    }

    highlightNext() {
        this.setState(({highlightedOption}) => ({
            highlightedOption: this.getNextSelectableOption(highlightedOption),
            overrideHover: true
        }), this.scroll)
    }

    highlightFirst() {
        this.setState({
            highlightedOption: this.getFirstSelectableOption(),
            overrideHover: true
        }, this.scroll)
    }

    highlightLast() {
        this.setState({
            highlightedOption: this.getLastSelectableOption(),
            overrideHover: true
        }, this.scroll)
    }

    onHover(element) {
        if (element.parentElement.parentElement === this.list.current) {
            const optionValue = element.parentElement.getAttribute('data-option-value')
            this.highlightOptionByValue(optionValue)
        }
    }

    highlightOptionByValue(value) {
        const {options} = this.props
        const highlightedOption = _.find(options, option => option.value === value)
        if (highlightedOption) {
            this.setState({
                highlightedOption,
                overrideHover: true
            })
        }
    }

    scroll() {
        this.highlighted.current && this.highlighted.current.scrollIntoView({
            behavior: 'auto',
            block: 'nearest'
        })
    }

    selectOption(option) {
        const {onSelect} = this.props
        option.onSelect && option.onSelect()
        onSelect && onSelect(option)
    }

    highlightSelectedOption() {
        const {autoHighlight} = this.props
        const highlightedOption = this.getSelectedOption() || (autoHighlight && this.getFirstSelectableOption())
        this.setState({
            highlightedOption,
            overrideHover: true
        }, () => autoCenter$.next())
    }

    centerSelectedOption() {
        const {scrollable} = this.props
        scrollable.centerElement(this.selected.current)
    }

    initializeAutoCenter() {
        const {addSubscription, scrollable} = this.props
        addSubscription(
            autoCenter$
                // [HACK] Add delay to fix bug where iOS doesn't capture next tap event
                // .pipe(delay(250))
                .subscribe(reset => reset
                    ? scrollable.reset(() => this.centerSelectedOption())
                    : this.centerSelectedOption()
                )
        )
        this.highlightSelectedOption()
    }

    componentDidMount() {
        this.initializeAutoCenter()
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (!_.isEqual(nextProps, this.props)) {
            return true
        }
        if (nextState.overrideHover !== this.state.overrideHover) {
            return true
        }
        if (nextState.overrideHover && nextState.highlightedOption !== this.state.highlightedOption) {
            return true
        }
        return false
    }

    componentDidUpdate() {
        const {options} = this.props
        const {highlightedOption} = this.state
        if (highlightedOption && !_.find(options, ({value}) => value === highlightedOption.value)) {
            this.highlightSelectedOption()
        }
    }
}
