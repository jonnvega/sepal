import {ElementResizeDetector} from 'widget/elementResizeDetector'
import {ViewportResizeDetector} from 'widget/viewportResizeDetector'
import {Widget} from 'widget/widget'
import {animationFrameScheduler, combineLatest, fromEvent, interval, merge, of} from 'rxjs'
import {compose} from 'compose'
import {distinctUntilChanged, filter, map, mapTo, scan, switchMap, withLatestFrom} from 'rxjs/operators'
import Hammer from 'hammerjs'
import Portal from 'widget/portal'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import styles from './slider.module.css'
import withSubscriptions from 'subscription'

const clamp = (value, {min, max}) => Math.max(min, Math.min(max, value))

const lerp = (rate, speed = 1) => (value, target) => value + (target - value) * (rate * speed)

const normalizeLinear = (value, min, max) => {
    const offset = min
    return (value - offset) / (max - offset)
}

const denormalizeLinear = (value, min, max) => {
    const offset = min
    return value * (max - offset) + offset
}

const normalizeLog = (value, min, max) => {
    const offset = min - 1
    return Math.log(value - offset) / Math.log(max - offset)
}

const denormalizeLog = (value, min, max) => {
    const offset = min - 1
    return Math.exp(value * Math.log(max - offset)) + offset
}

const invertNormalized = (value, invert) =>
    invert ? 1 - value : value

const normalize = (value, min, max, scale, invert) =>
    invertNormalized(scale === 'log' ? normalizeLog(value, min, max) : normalizeLinear(value, min, max), invert)

const denormalize = (value, min, max, scale, invert) =>
    scale === 'log'
        ? denormalizeLog(invertNormalized(value, invert), min, max)
        : denormalizeLinear(invertNormalized(value, invert), min, max)

class SliderContainer extends React.Component {
    clickTarget = React.createRef()

    renderTick({position, value, label}) {
        const left = `${Math.trunc(position)}px`
        return (
            <React.Fragment key={value}>
                <div className={styles.tick} style={{left}}/>
                <div className={styles.label} style={{left}}>{label}</div>
            </React.Fragment>
        )
    }

    renderAxis() {
        const {ticks} = this.props
        return (
            <div className={styles.axis}>
                {ticks.map(tick => this.renderTick(tick))}
            </div>
        )
    }

    renderClickTarget() {
        return (
            <div className={styles.clickTarget} ref={this.clickTarget}/>
        )
    }

    renderDynamics() {
        const {input, width, range, decimals, ticks, snap, minValue, maxValue, invert, onChange} = this.props
        return (
            <SliderDynamics
                input={input}
                minValue={minValue}
                maxValue={maxValue}
                width={width}
                decimals={decimals}
                ticks={ticks}
                snap={snap}
                range={range}
                invert={invert}
                clickTarget={this.clickTarget}
                normalize={value => {
                    const {scale, minValue, maxValue} = this.props
                    return normalize(value, minValue, maxValue, scale, invert)
                }}
                denormalize={value => {
                    const {scale, minValue, maxValue} = this.props
                    return denormalize(value, minValue, maxValue, scale, invert)
                }}
                onChange={onChange}
            />
        )
    }

    render() {
        return (
            <div>
                {this.renderAxis()}
                {this.renderClickTarget()}
                {this.renderDynamics()}
            </div>
        )
    }
}

SliderContainer.propTypes = {
    input: PropTypes.object.isRequired,
    decimals: PropTypes.number,
    denormalize: PropTypes.func,
    info: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.func
    ]),
    maxValue: PropTypes.number,
    minValue: PropTypes.number,
    normalize: PropTypes.func,
    snap: PropTypes.bool,
    ticks: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.array
    ]),
    width: PropTypes.number,
    onChange: PropTypes.func
}

class _SliderDynamics extends React.Component {
    state = {
        position: null,
        previewPosition: null,
        clickTargetOffset: null,
        dragging: null,
        inhibitInput: null
    }
    handle = React.createRef()

    renderLeftRange() {
        const {position} = this.state
        const {width} = this.props
        return <div className={styles.range} style={{right: `${width - position}px`}}/>
    }

    renderRightRange() {
        const {position} = this.state
        return <div className={styles.range} style={{left: `${position}px`}}/>
    }

    renderRanges() {
        const {range, invert} = this.props
        return (
            <React.Fragment>
                {((range === 'low' && !invert) || (range === 'high' && invert)) ? this.renderLeftRange() : null}
                {((range === 'high' && !invert) || (range === 'low' && invert)) ? this.renderRightRange() : null}
            </React.Fragment>
        )
    }

    renderPreview() {
        const {previewPosition} = this.state
        return previewPosition !== null ? (
            <div className={[styles.cursor, styles.preview].join(' ')} ref={this.preview}
                style={{left: `${previewPosition}px`}}/>
        ) : null
    }

    renderHandle() {
        const {position, dragging} = this.state
        return (
            <div className={[styles.cursor, styles.handle, dragging ? styles.dragging : null].join(' ')}
                ref={this.handle}
                style={{left: `${position}px`}}/>
        )
    }

    renderOverlay() {
        const {dragging} = this.state
        return dragging
            ? (
                <Portal type='global'>
                    <div className={styles.cursorOverlay}/>
                </Portal>
            ) : null
    }

    renderViewportResizer() {
        return (
            <ViewportResizeDetector onChange={() => this.setClickTargetOffset()}/>
        )
    }

    render() {
        return (
            <React.Fragment>
                {this.renderRanges()}
                {this.renderPreview()}
                {this.renderHandle()}
                {this.renderOverlay()}
                {this.renderViewportResizer()}
            </React.Fragment>
        )
    }

    componentDidMount() {
        this.initialize({
            handleRef: this.handle.current,
            clickableAreaRef: this.props.clickTarget.current
        })
    }

    initialize({handleRef, clickableAreaRef}) {
        const {addSubscription} = this.props
        
        this.setHandlePositionByValue()

        const handle = new Hammer(handleRef)
        // limit handle movement to horizontal axis
        handle.get('pan').set({
            direction: Hammer.DIRECTION_HORIZONTAL,
            threshold: 1
        })

        const clickableArea = new Hammer(clickableAreaRef, {threshold: 1})

        const mouseMove$ = fromEvent(clickableAreaRef, 'mousemove')
        const mouseLeave$ = fromEvent(clickableAreaRef, 'mouseleave')
        const pan$ = fromEvent(handle, 'panstart panmove panend')
        const panStart$ = pan$.pipe(filter(e => e.type === 'panstart'))
        const panMove$ = pan$.pipe(filter(e => e.type === 'panmove'))
        const panEnd$ = pan$.pipe(filter(e => e.type === 'panend'))
        const animationFrame$ = interval(0, animationFrameScheduler)

        const hoverPosition$ = merge(
            mouseMove$.pipe(
                map(e => e.clientX - this.state.clickTargetOffset)
            ),
            mouseLeave$.pipe(
                mapTo(null)
            )
        )

        // target position by clicking
        const clickPosition$ = fromEvent(clickableArea, 'tap').pipe(
            map(tap => this.snapPosition(tap.center.x - this.state.clickTargetOffset))
        )

        // target position by dragging
        const dragPosition$ = panStart$.pipe(
            switchMap(() => {
                const {position} = this.state
                return merge(
                    panMove$.pipe(
                        map(event => this.clampPosition(position + event.deltaX)),
                        distinctUntilChanged()
                    ),
                    panEnd$.pipe(
                        map(() => this.snapPosition(this.state.previewPosition))
                    )
                )
            })
        )

        const handleDragging$ = merge(
            of(false),
            panStart$.pipe(mapTo(true)),
            panEnd$.pipe(mapTo(false)),
        )

        const targetPosition$ = merge(clickPosition$, dragPosition$).pipe(
            map(position => Math.round(position))
        )

        const handlePosition$ = targetPosition$.pipe(
            withLatestFrom(handleDragging$),
            switchMap(([targetPosition, dragging]) => {
                const {position} = this.state
                return animationFrame$.pipe(
                    map(() => targetPosition),
                    scan(lerp(dragging ? .30 : .15), position),
                    map(position => Math.round(position)),
                    distinctUntilChanged()
                )
            })
        )

        const handleMoving$ = combineLatest(handlePosition$, targetPosition$).pipe(
            map(([currentPosition, targetPosition]) => currentPosition !== targetPosition),
            distinctUntilChanged()
        )

        const previewPosition$ = merge(targetPosition$, hoverPosition$).pipe(
            map(position => position === null ? null : this.snapPosition(position)),
            distinctUntilChanged()
        )

        const inhibitInput$ = handleMoving$.pipe(
            withLatestFrom(handleDragging$),
            map(([dragging, moving]) => dragging || moving)
        )

        const updateInput$ = merge(clickPosition$, panEnd$)

        addSubscription(
            handlePosition$.subscribe(position =>
                this.setHandlePosition(position)
            ),
            previewPosition$.subscribe(previewPosition =>
                this.setPreviewPosition(previewPosition)
            ),
            handleDragging$.subscribe(dragging =>
                this.setDragging(dragging)
            ),
            inhibitInput$.subscribe(inhibit =>
                this.setInhibitInput(inhibit)
            ),
            updateInput$.subscribe(() =>
                this.updateInputValue()
            )
        )
    }

    componentDidUpdate(prevProps) {
        const {inhibitInput} = this.state
        if (!inhibitInput && !_.isEqual(prevProps, this.props)) {
            this.setHandlePositionByValue()
        }
    }

    toPosition(value) {
        const {normalize, width} = this.props
        return normalize(value) * width
    }

    toValue(position) {
        const {denormalize, width} = this.props
        return denormalize(position / width)
    }

    clampPosition(position) {
        const {width} = this.props
        return Math.round(
            clamp(position, {
                min: 0,
                max: width
            })
        )
    }

    snapPosition(value) {
        const {ticks, snap} = this.props
        if (snap) {
            const closest = _(ticks)
                .map(({position}) => ({position, distance: Math.abs(position - value)}))
                .sortBy('distance')
                .head()
            return closest.position
        } else {
            return value
        }
    }

    setHandlePositionByValue() {
        const {input} = this.props
        this.setHandlePosition(this.toPosition(input.value))
    }

    setHandlePosition(position) {
        if (position >= 0) {
            position = Math.round(position)
            if (position !== this.state.position) {
                this.setState({position})
            }
        }
    }

    updateInputValue() {
        const {input, decimals, onChange} = this.props
        const {previewPosition} = this.state
        const value = this.toValue(this.snapPosition(previewPosition))
        const factor = Math.pow(10, decimals)
        const roundedValue = Math.round(value * factor) / factor
        input.set(roundedValue)
        onChange && onChange(roundedValue)
    }

    setPreviewPosition(previewPosition) {
        this.setState({previewPosition})
    }

    setInhibitInput(inhibitInput) {
        this.setState({inhibitInput})
    }

    setDragging(dragging) {
        this.setState({dragging})
    }

    setClickTargetOffset() {
        const {clickTarget} = this.props
        const clickTargetOffset = Math.trunc(clickTarget.current.getBoundingClientRect().left)
        if (this.state.clickTargetOffset !== clickTargetOffset) {
            this.setState({clickTargetOffset})
        }
    }
}

const SliderDynamics = compose(
    _SliderDynamics,
    withSubscriptions()
)

SliderDynamics.propTypes = {
    denormalize: PropTypes.func.isRequired,
    input: PropTypes.object.isRequired,
    maxValue: PropTypes.number.isRequired,
    minValue: PropTypes.number.isRequired,
    normalize: PropTypes.func.isRequired,
    decimals: PropTypes.number,
    invert: PropTypes.bool,
    snap: PropTypes.bool,
    ticks: PropTypes.array,
    width: PropTypes.number,
    onChange: PropTypes.func
}

export class FormSlider extends React.Component {
    state = {
        width: null,
        ticks: [],
        minValue: null,
        maxValue: null
    }

    static getDerivedStateFromProps(props, state) {
        const mapTicks = ticks =>
            ticks.map((tick, index) => {
                if (_.isObject(tick)) {
                    const value = tick.value || index
                    const label = tick.label || value
                    return {value, label}
                }
                if (_.isString(tick)) {
                    return {value: index, externalValue: tick, label: tick}
                }
                return {value: tick, externalValue: tick, label: tick}
            })

        const ticks = mapTicks(props.ticks ? props.ticks : [props.minValue, props.maxValue])
        const minValue = props.minValue || ticks.reduce((min, {value}) => Math.min(min, value), null)
        const maxValue = props.maxValue || ticks.reduce((max, {value}) => Math.max(max, value), null)
        return {
            ticks: ticks
                .filter(({value}) => value >= minValue && value <= maxValue)
                .map(tick => ({
                    ...tick,
                    position: state.width * normalize(tick.value, minValue, maxValue, props.scale, props.invert)
                })),
            minValue,
            maxValue
        }
    }

    renderInfo() {
        const {input, info, alignment} = this.props
        const {ticks} = this.state
        const tick = ticks && ticks.find(tick => tick.value === input.value)
        const label = (tick && tick.label) || input.value
        return info ? (
            <div className={[styles.info, styles.alignment, styles[alignment]].join(' ')}>
                {_.isFunction(info) ? info(label, input.value) : info}
            </div>
        ) : null
    }

    renderSlider() {
        const {width} = this.state
        return (
            <div className={styles.container}>
                <div className={styles.slider}>
                    <ElementResizeDetector onResize={({width}) => this.setState({width})}/>
                    {width ? this.renderContainer() : null}
                </div>
            </div>
        )
    }

    renderContainer() {
        const {input, scale = 'linear', decimals = 0, snap, range = 'left', invert = false, info, onChange} = this.props
        const {ticks, minValue, maxValue, width} = this.state
        return (
            <SliderContainer
                input={input}
                minValue={minValue}
                maxValue={maxValue}
                decimals={decimals}
                ticks={ticks}
                snap={snap}
                range={range}
                scale={scale}
                invert={invert}
                info={info}
                width={width}
                onChange={onChange}
            />
        )

    }

    render() {
        const {label, tooltip, tooltipPlacement, alignment, disabled} = this.props
        return (
            <Widget
                className={styles.wrapper}
                label={label}
                alignment={alignment}
                disabled={disabled}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}>
                {this.renderInfo()}
                {this.renderSlider()}
            </Widget>
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
