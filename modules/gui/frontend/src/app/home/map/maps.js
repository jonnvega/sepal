import {BehaviorSubject, Subject, from, merge, of, zip} from 'rxjs'
import {Loader} from 'google-maps'
import {SepalMap} from './sepalMap'
import {compose} from 'compose'
import {connect} from 'store'
import {debounceTime, distinctUntilChanged, filter, finalize, map, switchMap} from 'rxjs/operators'
import {getLogger} from 'log'
import {mapTag, mapViewTag} from 'tag'
import {v4 as uuid} from 'uuid'
import {withContext} from 'context'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import api from 'api'
import withSubscriptions from 'subscription'

const log = getLogger('maps')

const GOOGLE_MAPS_VERSION = '3.44'

const DEFAULT_ZOOM = 3
const MIN_ZOOM = 3
const MAX_ZOOM = 20

export const MapsContext = React.createContext()

export const withMapsContext = withContext(MapsContext, 'mapsContext')

class _Maps extends React.Component {
    state = {
        mapsContext: null
    }

    view$ = new BehaviorSubject()
    linkedMaps = new Set()

    constructor(props) {
        super(props)
        const {onError, stream} = props
        stream('INIT_MAPS',
            this.initMaps$(),
            mapsContext => this.setState(mapsContext),
            error => {
                onError(error)
                this.setState({error})
            }
        )
        this.createGoogleMap = this.createGoogleMap.bind(this)
        this.createSepalMap = this.createSepalMap.bind(this)
        this.createMapContext = this.createMapContext.bind(this)
    }

    initMaps$() {
        return api.map.loadApiKeys$().pipe(
            switchMap(({google: googleMapsApiKey, norwayPlanet: norwayPlanetApiKey}) =>
                zip(
                    this.initGoogleMaps$(googleMapsApiKey),
                    this.initNorwayPlanet$(norwayPlanetApiKey)
                )
            ),
            map(([google, norwayPlanet]) => ({
                google,
                norwayPlanet,
                initialized: true
            }))
        )
    }

    initGoogleMaps$(googleMapsApiKey) {
        const loader = new Loader(googleMapsApiKey, {
            version: GOOGLE_MAPS_VERSION,
            libraries: ['drawing', 'places']
        })
        return from(loader.load()).pipe(
            switchMap(google =>
                of({google, googleMapsApiKey})
            )
        )
    }

    initNorwayPlanet$(norwayPlanetApiKey) {
        return of({norwayPlanetApiKey})
    }

    getStyleOptions(style = 'sepalStyle') {
        // https://developers.google.com/maps/documentation/javascript/style-reference
        switch (style) {
        case 'sepalStyle':
            return [
                {stylers: [{visibility: 'simplified'}]},
                {stylers: [{color: '#131314'}]},
                {featureType: 'transit.station', stylers: [{visibility: 'off'}]},
                {featureType: 'poi', stylers: [{visibility: 'off'}]},
                {featureType: 'water', stylers: [{color: '#191919'}, {lightness: 4}]},
                {elementType: 'labels.text.fill', stylers: [{visibility: 'off'}, {lightness: 25}]}
            ]
        case 'overlayStyle':
            return [
                {stylers: [{visibility: 'off'}]}
            ]
        default:
            throw Error(`Unsupported map style ${style}`)
        }
    }

    createGoogleMap(mapElement, options = {}, style = 'sepalStyle') {
        const {google: {google}} = this.state
        const mapOptions = {
            zoom: DEFAULT_ZOOM,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            center: new google.maps.LatLng(16.7794913, 9.6771556),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            backgroundColor: '#131314',
            gestureHandling: 'greedy',
            draggableCursor: 'pointer',
            ...options
        }

        const googleMap = new google.maps.Map(mapElement, mapOptions)

        googleMap.mapTypes.set('style', new google.maps.StyledMapType(this.getStyleOptions(style), {name: 'map'}))
        googleMap.setMapTypeId('style')

        return googleMap
    }

    createSepalMap(mapElement, options, style) {
        const {google: {google}} = this.state
        const googleMap = this.createGoogleMap(mapElement, options, style)
        return new SepalMap(google, googleMap)
    }

    getCurrentView() {
        const {view$} = this
        const update = view$.getValue()
        return update && update.view
    }

    createMapContext(mapId = uuid()) {
        const {addSubscription} = this.props
        const {google: {googleMapsApiKey}, norwayPlanet: {norwayPlanetApiKey}} = this.state
        const requestedView$ = new Subject()

        const view$ = merge(
            this.view$.pipe(
                distinctUntilChanged(),
                filter(value => value),
                filter(({mapId: id}) => this.linkedMaps.has(mapId) && mapId !== id),
                map(({view}) => view)
            ),
            requestedView$
        )

        const updateView$ = new Subject()
        const linked$ = new Subject()

        const setLinked = linked => {
            const currentView = this.getCurrentView()
            if (linked) {
                this.linkedMaps.add(mapId)
            } else {
                this.linkedMaps.delete(mapId)
            }
            log.debug(() => `${mapTag(mapId)} ${linked ? 'linked' : 'unlinked'}, now ${this.linkedMaps.size} linked.`)
            if (linked && this.linkedMaps.size > 1 && currentView) {
                requestedView$.next(currentView)
            }
        }

        const updateView = view => {
            if (this.linkedMaps.has(mapId)) {
                const currentView = this.getCurrentView()
                const {center, zoom} = view
                if (center && zoom) {
                    if (currentView && _.isEqual(currentView.center, center) && currentView.zoom === zoom) {
                        log.trace(() => `View update from linked ${mapTag(mapId)} ignored`)
                    } else {
                        log.debug(() => `View update from linked ${mapTag(mapId)} accepted: ${mapViewTag(view)}`)
                        this.view$.next({mapId, view})
                    }
                }
            } else {
                log.trace(() => `View update from unlinked ${mapTag(mapId)} discarded`)
            }
        }

        addSubscription(
            linked$.pipe(
                distinctUntilChanged(),
                finalize(() => setLinked(false))
            ).subscribe(
                linked => setLinked(linked)
            ),
            updateView$.pipe(
                debounceTime(100),
                distinctUntilChanged()
            ).subscribe(
                view => updateView(view)
            )
        )

        return {mapId, googleMapsApiKey, norwayPlanetApiKey, view$, updateView$, linked$}
    }

    render() {
        const {children} = this.props
        const {error, initialized} = this.state
        return (
            <MapsContext.Provider value={{
                createGoogleMap: this.createGoogleMap,
                createSepalMap: this.createSepalMap,
                createMapContext: this.createMapContext
            }}>
                {children(initialized, error)}
            </MapsContext.Provider>
        )
    }
}

export const Maps = compose(
    _Maps,
    connect(),
    withSubscriptions()
)

Maps.propTypes = {
    children: PropTypes.any.isRequired,
    onError: PropTypes.func.isRequired
}
