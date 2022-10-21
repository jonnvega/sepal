import {BehaviorSubject, Subject, combineLatest, concat, distinctUntilChanged, filter, finalize,
    first, last, of, pipe, map as rxMap, share, switchMap, takeUntil, windowTime} from 'rxjs'
import {Content, SectionLayout} from 'widget/sectionLayout'
import {ElementResizeDetector} from 'widget/elementResizeDetector'
import {LegendImport} from './legendImport'
import {MapAreaContext} from './mapAreaContext'
import {MapContext} from './mapContext'
import {MapInfo} from './mapInfo'
import {SplitView} from 'widget/split/splitView'
import {VisParamsPanel} from './visParams/visParamsPanel'
import {areaTag, mapTag} from 'tag'
import {compose} from 'compose'
import {connect} from 'store'
import {getImageLayerSource} from './imageLayerSource/imageLayerSource'
import {getLogger} from 'log'
import {getProcessTabsInfo} from '../body/process/process'
import {recipePath} from '../body/process/recipe'
import {selectFrom} from 'stateUtils'
import {v4 as uuid} from 'uuid'
import {withLayers} from '../body/process/withLayers'
import {withMapsContext} from './maps'
import {withRecipe} from '../body/process/recipeContext'
import MapToolbar from './mapToolbar'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'
import styles from './map.module.css'
import withSubscriptions from 'subscription'

const log = getLogger('map')

const mapRecipeToProps = recipe => ({
    bounds: selectFrom(recipe, 'ui.bounds'),
    recipe
})

const OVERLAY_ID = 'overlay-layer-id'
const OVERLAY_AREA = OVERLAY_AREA

class _Map extends React.Component {
    viewUpdates$ = new BehaviorSubject({})
    linked$ = new BehaviorSubject(false)
    draggingMap$ = new BehaviorSubject(false)
    viewChanged$ = new Subject()
    splitPosition$ = new BehaviorSubject()
    draggingSplit$ = new BehaviorSubject(false)
    cursor$ = new Subject()
    drawingInstances = []

    filteredViewUpdates$ = this.viewUpdates$.pipe(
        distinctUntilChanged(_.isEqual)
    )

    state = {
        maps: {}, // [id]: {id, map, listeners, subscriptions}
        mapId: null,
        googleMapsApiKey: null,
        nicfiPlanetApiKey: null,
        overlay: null,
        overlayActive: false,
        drawingMode: false
    }

    markers = {}

    constructor() {
        super()
        this.mapDelegate = this.mapDelegate.bind(this)
        this.toggleLinked = this.toggleLinked.bind(this)
        this.enableZoomArea = this.enableZoomArea.bind(this)
        this.disableZoomArea = this.disableZoomArea.bind(this)
        this.isZoomArea = this.isZoomArea.bind(this)
        this.enablePolygonDrawing = this.enablePolygonDrawing.bind(this)
        this.disablePolygonDrawing = this.disablePolygonDrawing.bind(this)
        this.setLocationMarker = this.setLocationMarker.bind(this)
        this.setAreaMarker = this.setAreaMarker.bind(this)
        this.addOneShotClickListener = this.addOneShotClickListener.bind(this)
    }

    isInitialized() {
        const {maps} = this.state
        return !_.isEmpty(maps)
    }

    isOverlayLayer(id) {
        return id === OVERLAY_ID
    }

    isOverlayArea(area) {
        return area === OVERLAY_AREA
    }

    isStackMode() {
        const {layers: {mode}} = this.props
        return mode === 'stack'
    }

    isGridMode() {
        const {layers: {mode}} = this.props
        return mode === 'grid'
    }

    getMap(id) {
        const {maps} = this.state
        const {map} = maps[id]
        return map
    }

    getArea(id) {
        const {layers: {areas}} = this.props
        return this.isOverlayLayer(id)
            ? OVERLAY_AREA
            : _.findKey(areas, area => area.id === id)
    }

    getLayerId(area) {
        const {layers} = this.props
        return this.isOverlayArea(area)
            ? OVERLAY_AREA
            : layers.areas[area].id
    }

    withAllMaps(func) {
        const {maps} = this.state
        return _.map(maps, ({map, listeners, subscriptions}, id) =>
            func({id, map, listeners, subscriptions})
        )
    }

    withFirstMap(func) {
        const {maps} = this.state
        const id = _.head(_.keys(maps))
        const {map = null} = maps[id] || {}
        return map
            ? func(map)
            : null
    }

    withOverlayMap(func) {
        const {overlay} = this.state
        if (overlay) {
            const {map, listeners, subscriptions} = overlay
            func({id: OVERLAY_ID, map, listeners, subscriptions})
        }
    }

    createMap(id, element, isOverlay, callback) {
        const {mapsContext: {createSepalMap}} = this.props
        const area = this.getArea(id)
        log.debug(() => `Adding ${mapTag(this.state.mapId, id)} to ${areaTag(area)}`)

        const options = isOverlay ? {
            backgroundColor: 'hsla(0, 0%, 0%, 0)',
            gestureHandling: 'none'
        } : null
        const style = isOverlay ? 'overlayStyle' : 'sepalStyle'
        const map = createSepalMap({element, options, style})

        this.withFirstMap(firstMap => map.setView(firstMap.getView())) // Make sure a new map is synchronized

        if (isOverlay) {
            this.viewUpdates$.next(map.getView())
        }

        const {googleMap} = map.getGoogle()

        const listeners = [
            googleMap.addListener('mouseout',
                () => this.synchronizeCursor(id, null)
            ),
            googleMap.addListener('mousemove',
                ({latLng, domEvent}) => this.synchronizeCursor(id, latLng, domEvent)
            ),
            googleMap.addListener('bounds_changed',
                () => this.viewChanged$.next()
            ),
            googleMap.addListener('center_changed',
                () => this.synchronizeOut(id, map)
            ),
            googleMap.addListener('zoom_changed',
                () => this.synchronizeOut(id, map)
            ),
            googleMap.addListener('dragstart',
                () => this.draggingMap$.next(true)
            ),
            googleMap.addListener('dragend',
                () => this.draggingMap$.next(false)
            )
        ]

        const subscriptions = [
            this.scrollWheelEnabled$.subscribe(
                enabled => googleMap.setOptions({scrollwheel: enabled})
            )
        ]

        callback({map, listeners, subscriptions})
    }

    removeMap(id) {
        const {maps} = this.state
        if (maps[id]) {
            const {map, listeners, subscriptions} = maps[id]
            const {google} = map.getGoogle()
            const area = this.getArea(id)
            log.debug(() => `Removing ${mapTag(this.state.mapId, id)} from ${areaTag(area)}`)
            listeners.forEach(listener =>
                google.maps.event.removeListener(listener)
            )
            subscriptions.forEach(subscription =>
                subscription.unsubscribe()
            )
        }
        this.setState(
            ({maps}) => ({maps: _.omit(maps, id)})
        )
    }

    synchronizeOut(id, map) {
        const {overlay} = this.state
        const view = map.getView()
        this.withAllMaps(({map, id: currentId}) => {
            if (currentId !== id) {
                map.setView(view)
            }
        })
        this.viewUpdates$.next(view)
        if (!this.isOverlayLayer(id)) {
            overlay && overlay.map.setView(view)
        }
    }

    synchronizeIn(view) {
        const {overlay} = this.state
        this.withAllMaps(({map}) => map.setView(view))
        overlay && overlay.map.setView(view)
    }

    synchronizeCursor(cursorId, latLng, event) {
        const cursorArea = this.getArea(cursorId)
        if (event) {
            this.cursor$.next({
                screenPixel: {x: event.clientX, y: event.clientY},
                mapPixel: {x: event.layerX, y: event.layerY},
                cursorArea,
                latLng
            })
        }
        this.withAllMaps(({id, map}) => {
            const otherArea = this.getArea(id)
            if (this.isGridMode() && otherArea !== cursorArea) {
                map.setCursor(latLng)
            } else {
                map.setCursor(null)
            }
        })
    }

    setVisibility(visible) {
        this.withAllMaps(({map}) => map.setVisibility(visible))
    }

    addOneShotClickListener(listener) {
        const listeners = this.withAllMaps(({map}) =>
            map.addClickListener(e => {
                listener(e)
                removableListener.remove()
            })
        )
        const removableListener = {
            remove: () => listeners.map(listener => listener.remove())
        }
        return removableListener
    }

    // Drawing mode

    enterDrawingMode(drawingMode, callback) {
        const newInstance = {drawingMode, callback}
        const currentInstance = _.last(this.drawingInstances)
        if (currentInstance) {
            this.disableDrawingMode()
        }
        this.enableDrawingMode(newInstance)
        this.drawingInstances.push(newInstance)
    }
    
    exitDrawingMode() {
        const currentInstance = this.drawingInstances.pop()
        if (currentInstance) {
            this.disableDrawingMode()
            const previousInstance = _.last(this.drawingInstances)
            if (previousInstance) {
                this.enableDrawingMode(previousInstance)
            }
        }
    }

    enableDrawingMode({drawingMode, callback}) {
        log.debug('enableDrawingMode:', drawingMode)
        if (this.isStackMode()) {
            this.setState({drawingMode, overlayActive: true}, () => {
                this.withOverlayMap(callback)
            })
        } else {
            this.setState({drawingMode, overlayActive: false}, () => {
                this.withAllMaps(callback)
            })
        }
    }

    disableDrawingMode() {
        log.debug('disableDrawingMode')
        if (this.isStackMode()) {
            this.setState({drawingMode: null, overlayActive: false}, () => {
                this.withOverlayMap(({map}) => map.disableDrawingMode())
            })
        } else {
            this.setState({drawingMode: null, overlayActive: false}, () => {
                this.withAllMaps(({map}) => map.disableDrawingMode())
            })
        }
    }

    // Zoom

    enableZoomArea(callback) {
        this.enterDrawingMode('zoomarea', ({map}) =>
            map.enableZoomArea((...args) => {
                this.disableZoomArea()
                callback && callback(...args)
            })
        )
    }

    disableZoomArea() {
        this.exitDrawingMode()
    }

    isZoomArea() {
        const {drawingMode} = this.state
        return drawingMode === 'zoomarea'
    }

    // Polygon

    enablePolygonDrawing(callback) {
        this.enterDrawingMode('polygon', ({map}) =>
            map.enablePolygonDrawing((...args) => {
                callback && callback(...args)
            })
        )
    }

    disablePolygonDrawing() {
        this.exitDrawingMode()
    }

    iPolygonDrawing() {
        const {drawingMode} = this.state
        return drawingMode === 'polygon'
    }

    // Markers

    setLocationMarker(options) {
        const id = uuid()
        const remove = () => this.removeMarker(id)
        this.markers[id] = this.withAllMaps(
            ({map}) => map.setLocationMarker(options, remove)
        )
        return remove
    }

    setAreaMarker(options) {
        const id = uuid()
        const remove = () => this.removeMarker(id)
        this.markers[id] = this.withAllMaps(
            ({map}) => map.setAreaMarker(options, remove)
        )
        return remove
    }

    removeMarker(id) {
        const markers = this.markers[id]
        if (markers) {
            markers.forEach(marker => marker.remove())
            delete this.markers[id]
        }
    }

    areaCursor$(id) {
        return this.cursor$.pipe(
            share(),
            lastInWindow(100),
            switchMap(({screenPixel, mapPixel, cursorArea, latLng}) => {
                const map = this.getMap(id)
                const area = this.getArea(id)
                if (cursorArea === area || this.isStackMode()) {
                    return of({...screenPixel})
                } else {
                    return this.splitPosition$.pipe(
                        rxMap(splitPosition => {
                            if (splitPosition) {
                                const areaPixel = map.latLngToPixel(latLng)
                                const toPixel = (fromArea, toArea) => {
                                    const fromLeft = ['top', 'top-left', 'left', 'bottom-left', 'bottom'].includes(fromArea)
                                    const fromRight = ['right', 'top-right', 'bottom-right'].includes(fromArea)
                                    const fromTop = ['top', 'top-left', 'left', 'top-right', 'right'].includes(fromArea)
                                    const fromBottom = ['bottom', 'bottom-left', 'bottom-right'].includes(fromArea)
                                    const toLeft = ['top', 'top-left', 'left', 'bottom-left', 'bottom'].includes(toArea)
                                    const toRight = ['right', 'top-right', 'bottom-right'].includes(toArea)
                                    const toTop = ['top', 'top-left', 'left', 'top-right', 'right'].includes(toArea)
                                    const toBottom = ['bottom', 'bottom-left', 'bottom-right'].includes(toArea)

                                    const valueForDirection = (axis, direction) => {
                                        switch(direction) {
                                        case 0: return areaPixel[axis] - (mapPixel[axis] - screenPixel[axis])
                                        case -1: return areaPixel[axis] - (mapPixel[axis] + splitPosition[axis] - screenPixel[axis])
                                        case 1: return areaPixel[axis] - (mapPixel[axis] - splitPosition[axis] - screenPixel[axis])
                                        }
                                    }

                                    const toValue = (axis, fromStart, fromEnd, toStart, toEnd) => {
                                        if (fromStart && toEnd) {
                                            return valueForDirection(axis, 1)
                                        } else if (fromEnd && toStart) {
                                            return valueForDirection(axis, -1)
                                        } else {
                                            return valueForDirection(axis, 0)
                                        }
                                    }

                                    return {
                                        x: toValue('x', fromLeft, fromRight, toLeft, toRight),
                                        y: toValue('y', fromTop, fromBottom, toTop, toBottom)
                                    }
                                }
                                const pixel = toPixel(cursorArea, area)
                                return {...pixel, area}
                            }
                        }),
                        first()
                    )
                }

            })
        )
    }

    updateLayerConfig(layerConfig, area) {
        const {recipe} = this.props
        actionBuilder('UPDATE_LAYER_CONFIG', layerConfig)
            .assign(
                [recipePath(recipe.id), 'layers.areas', area, 'imageLayer.layerConfig'],
                layerConfig
            )
            .dispatch()
    }

    includeAreaFeatureLayerSource(featureLayerSource, area) {
        const {recipe} = this.props
        actionBuilder('INCLUDE_AREA_FEATURE_LAYER_SOURCE', featureLayerSource)
            .set(
                [recipePath(recipe.id), 'layers.areas', area, 'featureLayerSources', {id: featureLayerSource.id}],
                featureLayerSource
            )
            .dispatch()
    }

    excludeAreaFeatureLayerSource(featureLayerSource, area) {
        const {recipe} = this.props
        actionBuilder('EXCLUDE_AREA_FEATURE_LAYER_SOURCE', featureLayerSource)
            .del(
                [recipePath(recipe.id), 'layers.areas', area, 'featureLayerSources', {id: featureLayerSource.id}]
            )
            .dispatch()
    }

    setLinked(linked) {
        this.linked$.next(linked)
    }

    toggleLinked() {
        const linked = this.linked$.getValue()
        this.setLinked(!linked)
    }

    render() {
        const {recipe, layers, imageLayerSources} = this.props
        const {googleMapsApiKey, nicfiPlanetApiKey} = this.state
        const imageLayerSourceComponents = imageLayerSources
            .map(source =>
                getImageLayerSource({recipe, source}).sourceComponent
            )
            .filter(mapComponent => mapComponent)
        return (
            <ElementResizeDetector onResize={size => this.setState({size})}>
                <MapContext.Provider value={{
                    map: this.mapDelegate(),
                    googleMapsApiKey,
                    nicfiPlanetApiKey
                }}>
                    {imageLayerSourceComponents}
                    <SplitView
                        areas={this.renderAreas()}
                        overlay={this.renderOverlay()}
                        mode={layers.mode}
                        position$={this.splitPosition$}
                        dragging$={this.draggingSplit$}>
                        <div className={styles.content}>
                            {this.isInitialized() ? this.renderRecipe() : null}
                        </div>
                    </SplitView>
                </MapContext.Provider>
            </ElementResizeDetector>
        )
    }

    renderAreas() {
        const {layers, imageLayerSources} = this.props
        return _.map(layers.areas, (layer, area) => {
            if (!layer.imageLayer) {
                return {
                    key: area,
                    placement: area,
                    content: this.renderImageLayer('default-layer', undefined, undefined, 'center')
                }
            }
            const {sourceId, layerConfig} = layer.imageLayer
            const source = imageLayerSources.find(({id}) => id === sourceId)
            return ({
                key: layer.id,
                placement: area,
                content: this.renderImageLayer(layer.id, source, layerConfig, area)
            })
        })
    }

    renderOverlay() {
        const {overlay, overlayActive, size} = this.state

        const refCallback = element => {
            if (element && !overlay) {
                this.createMap(OVERLAY_ID, element, true, ({map, listeners, subscriptions}) => {
                    this.setState({overlay: {map, listeners, subscriptions}})
                })
            }
        }

        return size ? (
            <div
                ref={refCallback}
                className={[
                    styles.map,
                    styles.overlay,
                    overlayActive ? styles.active : null
                ].join(' ')}
                style={{'--height': `${size.height}px`}}
            />
        ) : null
    }

    renderRecipe() {
        const {recipeContext: {statePath}, children} = this.props
        return (
            <SectionLayout>
                <Content>
                    <div className={styles.recipe}>
                        <MapToolbar statePath={[statePath, 'ui']}/>
                        <MapInfo/>
                        <LegendImport/>
                        {children}
                    </div>
                </Content>
            </SectionLayout>
        )
    }

    renderImageLayer(id, source, layerConfig, area) {
        const {recipe} = this.props
        const {maps} = this.state
        const map = maps[id] && maps[id].map
        const updateLayerConfig = layerConfig => this.updateLayerConfig(layerConfig, area)
        const includeAreaFeatureLayerSource = featureLayerSource => this.includeAreaFeatureLayerSource(featureLayerSource, area)
        const excludeAreaFeatureLayerSource = featureLayerSource => this.excludeAreaFeatureLayerSource(featureLayerSource, area)
        const {layerComponent} = getImageLayerSource({
            recipe,
            source,
            layerConfig,
            map,
            boundsChanged$: this.viewChanged$.pipe(share()),
            dragging$: combineLatest([this.draggingMap$, this.draggingSplit$]).pipe(
                share(),
                rxMap(([draggingMap, draggingSplit]) => draggingMap || draggingSplit)
            ),
            cursor$: this.areaCursor$(id)
        })

        const refCallback = element => {
            if (element) {
                if (!maps[id]) {
                    this.createMap(id, element, false, ({map, listeners, subscriptions}) => {
                        this.setState(({maps}) => ({maps: {...maps, [id]: {id, map, listeners, subscriptions}}}))
                    })
                }
            }
        }
        return (
            <MapAreaContext.Provider value={{
                area,
                updateLayerConfig,
                includeAreaFeatureLayerSource,
                excludeAreaFeatureLayerSource
            }}>
                <div
                    className={styles.map}
                    ref={refCallback}
                />
                <VisParamsPanel area={area} updateLayerConfig={updateLayerConfig}/>
                {layerComponent}
            </MapAreaContext.Provider>
        )
    }

    componentDidMount() {
        const {mapsContext: {createMapContext}, onEnable, onDisable} = this.props
        const {mapId, googleMapsApiKey, nicfiPlanetApiKey, view$, updateView$, linked$, scrollWheelEnabled$} = createMapContext()
        this.setLinked(getProcessTabsInfo().single)
        this.scrollWheelEnabled$ = scrollWheelEnabled$

        this.setState({
            mapId,
            googleMapsApiKey,
            nicfiPlanetApiKey
        }, () => {
            this.subscribe({view$, updateView$, linked$})
            onEnable(() => this.setVisibility(true))
            onDisable(() => this.setVisibility(false))
        })
    }

    componentDidUpdate(prevProps) {
        const prevAreas = selectFrom(prevProps, 'layers.areas') || {}
        const {layers: {areas}} = this.props
        Object.values(prevAreas)
            .filter(({id}) => !Object.values(areas).map(({id}) => id).includes(id))
            .map(({id}) => this.removeMap(id))
    }

    componentWillUnmount() {
        this.withAllMaps(({id}) => {
            this.removeMap(id)
        })
    }

    subscribe({view$, updateView$, linked$}) {
        const {addSubscription} = this.props
        addSubscription(
            view$.subscribe(
                view => this.synchronizeIn(view)
            ),
            this.filteredViewUpdates$.subscribe(
                view => updateView$.next(view)
            ),
            this.linked$.subscribe(
                linked => linked$.next(linked)
            )
        )
    }

    mapDelegate() {
        const {bounds} = this.props
        const {maps: mapById} = this.state
        const maps = Object.values(mapById).map(({map}) => map)
        const map = maps[0]

        const isInitialized = () => bounds

        return {
            view$: this.filteredViewUpdates$,
            linked$: this.linked$,
            scrollWheelEnabled$: this.scrollWheelEnabled$,
            toggleLinked: this.toggleLinked,
            zoomIn: () => map.zoomIn(),
            zoomOut: () => map.zoomOut(),
            enableZoomArea: this.enableZoomArea,
            disableZoomArea: this.disableZoomArea,
            isZoomArea: this.isZoomArea,
            canFit: () => isInitialized(),
            fit: () => map.fitBounds(bounds),
            setZoom: zoom => map.setZoom(zoom),
            getZoom: () => map.getZoom(),
            setView: view => map.setView(view),
            fitBounds: bounds => map.fitBounds(bounds),
            getBounds: () => map.getBounds(),
            addOneShotClickListener: this.addOneShotClickListener,
            enablePolygonDrawing: this.enablePolygonDrawing,
            disablePolygonDrawing: this.disablePolygonDrawing,
            setLocationMarker: this.setLocationMarker,
            setAreaMarker: this.setAreaMarker,
            removeMarker: this.removeMarker,
            getGoogle: () => map.getGoogle()
        }
    }
}

export const Map = compose(
    _Map,
    connect(),
    withMapsContext(),
    withLayers(),
    withRecipe(mapRecipeToProps),
    withSubscriptions()
)

Map.propTypes = {
    children: PropTypes.any
}

const EMPTY_WINDOW = Symbol('NO_MESSAGE_IN_WINDOW')
const lastInWindow = time => {
    const cancel$ = new Subject()
    return pipe(
        finalize(() => cancel$.next(true)),
        windowTime(time),
        switchMap(window$ => concat(of(EMPTY_WINDOW), window$).pipe(last())),
        filter(value => value !== EMPTY_WINDOW),
        takeUntil(cancel$)
    )
}
