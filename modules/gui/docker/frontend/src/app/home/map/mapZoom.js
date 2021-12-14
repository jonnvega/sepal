import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {SearchBox} from 'widget/searchBox'
import {Slider} from 'widget/slider'
import {ToggleButton} from 'widget/toggleButton'
import {activatable} from 'widget/activation/activatable'
import {compose} from 'compose'
import {formatCoordinates, parseCoordinates} from 'coords'
import {msg} from 'translate'
import {withMap} from './mapContext'
import Keybinding from 'widget/keybinding'
import React from 'react'
import styles from './mapZoom.module.css'
import withSubscriptions from 'subscription'

class _MapZoomPanel extends React.Component {
    state = {
        coordinateResults: [],
        placeResults: [],
        view: {},
        mouseWheelEnabled: null
    }

    constructor() {
        super()
        this.search = this.search.bind(this)
        this.onEscape = this.onEscape.bind(this)
    }

    render() {
        const {map} = this.props
        return (
            <Keybinding keymap={{'Plus': () => map.zoomIn(), 'Minus': () => map.zoomOut()}}>
                <Panel className={styles.panel} type='top-right'>
                    <Panel.Content>
                        <Layout spacing='compact'>
                            {this.renderZoomButtons()}
                            {this.renderZoomLevelIndicator()}
                            {this.renderSearch()}
                        </Layout>
                    </Panel.Content>
                    <Panel.Buttons onEscape={this.onEscape} shown={false}/>
                </Panel>
            </Keybinding>
        )
    }

    getTickLabel(zoom) {
        const {view: {minZoom, maxZoom}} = this.state
        if (zoom === minZoom) {
            return 'min'
        }
        if (zoom === maxZoom) {
            return 'max'
        }
        return null
    }

    getZoomTicks() {
        const {view: {minZoom, maxZoom}} = this.state
        return Array(maxZoom - minZoom + 1).fill().map(
            (_, index) => {
                const zoom = index + minZoom
                return {
                    value: zoom,
                    label: this.getTickLabel(zoom)
                }
            }
        )
    }

    renderZoomLevelIndicator() {
        const {map} = this.props
        const {view: {zoom, minZoom, maxZoom}} = this.state
        if (zoom && minZoom && maxZoom) {
            return (
                <Slider
                    value={zoom}
                    minValue={minZoom}
                    maxValue={maxZoom}
                    ticks={this.getZoomTicks()}
                    snap
                    onChange={zoom => map.setZoom(zoom)}
                />
            )
        }
        return null

    }

    renderZoomButtons() {
        return (
            <ButtonGroup alignment='distribute'>
                {this.renderZoomOutButton()}
                {this.renderZoomInButton()}
                {this.renderZoomAreaButton()}
                {this.renderFitButton()}
                {this.renderMouseWheelButton()}
            </ButtonGroup>
        )
    }

    renderZoomInButton() {
        const {map} = this.props
        const {view: {isMaxZoom}} = this.state
        return (
            <Button
                disabled={isMaxZoom}
                onClick={() => map.zoomIn()}
                icon={'plus'}
                tooltip={msg('process.mapZoom.zoomIn.tooltip')}
                tooltipPlacement='top'
            />
        )
    }

    renderZoomOutButton() {
        const {map} = this.props
        const {view: {isMinZoom}} = this.state
        return (
            <Button
                disabled={isMinZoom}
                onClick={() => map.zoomOut()}
                icon={'minus'}
                tooltip={msg('process.mapZoom.zoomOut.tooltip')}
                tooltipPlacement='top'
            />
        )
    }

    renderZoomAreaButton() {
        const {map} = this.props
        const {view: {isMaxZoom}} = this.state
        return (
            <Button
                look={map.isZoomArea() ? 'highlight' : 'default'}
                disabled={isMaxZoom}
                onClick={() => map.toggleZoomArea()}
                icon={'crop-alt'}
                tooltip={msg('process.mapZoom.zoomArea.tooltip')}
                tooltipPlacement='top'
            />
        )
    }

    renderFitButton() {
        const {map} = this.props
        return (
            <Button
                disabled={!map.canFit()}
                onClick={() => map.fit()}
                icon={'bullseye'}
                tooltip={msg('process.mapZoom.fit.tooltip')}
                tooltipPlacement='top'
            />
        )
    }

    renderMouseWheelButton() {
        const {mouseWheelEnabled} = this.state
        return (
            <ToggleButton
                selected={mouseWheelEnabled}
                onChange={() => this.toggleMouseWheel()}
                icon={'mouse'}
                tooltip={msg(mouseWheelEnabled ? 'process.mapZoom.scrollwheel.enabled.tooltip' : 'process.mapZoom.scrollwheel.disabled.tooltip')}
                tooltipPlacement='top'
            />
        )
    }

    renderSearch() {
        const {coordinateResults, placeResults} = this.state
        return (
            <SearchBox
                placeholder={msg('process.mapZoom.search.placeholder')}
                className={styles.search}
                onSearchValue={this.search}
                options={[
                    ...coordinateResults,
                    ...placeResults
                ]}
                onSelect={({value: location}) => this.select(location)}
            />

        )
    }

    toggleMouseWheel() {
        const {map: {mouseWheel$}} = this.props
        mouseWheel$.next(!mouseWheel$.getValue())
    }

    onEscape() {
        const {map, activatable: {deactivate}} = this.props
        map.isZoomArea() ? map.cancelZoomArea() : deactivate()
    }

    componentDidMount() {
        const {map, addSubscription} = this.props
        const {google} = map.getGoogle()
        this.autoComplete = new google.maps.places.AutocompleteService()
        this.geoCoder = new google.maps.Geocoder()
        addSubscription(
            map.view$.subscribe(
                view => this.setState({view})
            ),
            map.mouseWheel$.subscribe(
                mouseWheelEnabled => this.setState({mouseWheelEnabled})
            )
        )
    }

    search(query) {
        this.searchCoordinates(query)
        this.searchPlace(query)
    }

    searchCoordinates(query) {
        const {map} = this.props
        const {google} = map.getGoogle()
        if (query) {
            const candidates = parseCoordinates(query)
            const coordinateResults = candidates.map(candidate => ({
                label: (
                    <div className={styles.coordinates}>
                        <div>Latitude: {candidate.lat}</div>
                        <div>Longitude: {candidate.lng}</div>
                    </div>
                ),
                value: {
                    coords: new google.maps.LatLng(candidate.lat, candidate.lng)
                },
                key: formatCoordinates(candidate)
            }))
            this.setState({coordinateResults})
        } else {
            this.setState({coordinateResults: []})
        }
    }

    searchPlace(query) {
        if (query) {
            const request = {
                input: query
            }
            this.autoComplete.getPlacePredictions(request, results => {
                if (results) {
                    const placeResults = results.map(({description, place_id}) => ({
                        label: description,
                        value: {placeId: place_id},
                        key: place_id
                    }))
                    this.setState({placeResults})
                }
            })
        } else {
            this.setState({placeResults: []})
        }
    }

    select({placeId, coords}) {
        if (placeId) {
            this.geoCoder.geocode({placeId}, results => {
                if (results && results.length) {
                    const result = results[0]
                    if (result.geometry) {
                        const bounds = result.geometry.bounds
                        const location = result.geometry.location
                        const address = result.formatted_address
                        if (bounds) {
                            this.selectArea({bounds, title: address})
                        } else if (location) {
                            this.selectLocation({location, title: address})
                        }
                    }
                }
            })
        } else if (coords) {
            this.selectLocation({location: coords, title: 'point'})
        }
    }

    selectArea({bounds, title}) {
        const {map} = this.props
        map.fitBounds(bounds)
        map.setAreaMarker({
            bounds,
            title
        })
    }

    selectLocation({location, title}) {
        const {map} = this.props
        map.setView({center: location, zoom: 11})
        map.setLocationMarker({
            position: location,
            title
        })
    }
}

const policy = () => ({
    _: 'allow'
})

export const MapZoomPanel = compose(
    _MapZoomPanel,
    withMap(),
    withSubscriptions(),
    activatable({
        id: 'mapZoom',
        policy,
        alwaysAllow: true
    })
)
