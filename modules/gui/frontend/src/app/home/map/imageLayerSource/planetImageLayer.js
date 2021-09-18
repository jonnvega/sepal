import {Buttons} from 'widget/buttons'
import {Combo} from 'widget/combo'
import {Item} from 'widget/item'
import {Layout} from 'widget/layout'
import {MapAreaLayout} from '../mapAreaLayout'
import {compose} from 'compose'
import {connect} from 'store'
import {getRecipeType} from '../../body/process/recipeTypes'
import {map} from 'rxjs/operators'
import {withMapAreaContext} from '../mapAreaContext'
import {withMapContext} from '../mapContext'
import {withRecipe} from '../../body/process/recipeContext'
import {withTabContext} from 'widget/tabs/tabContext'
import PlanetLayer from '../layer/planetLayer'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'
import api from 'api'
import moment from 'moment'
import styles from './planetImageLayer.module.css'
import withSubscriptions from 'subscription'

const defaultLayerConfig = {
    bands: 'rgb'
}

const CONCURRENCY = 10

const mapRecipeToProps = recipe => ({
    dateRange: getRecipeType(recipe.type).getDateRange(recipe)
})

class _PlanetImageLayer extends React.Component {
    state = {}

    render() {
        const {map} = this.props
        return (
            <MapAreaLayout
                layer={this.createLayer()}
                form={this.renderForm()}
                map={map}
            />
        )
    }

    createLayer() {
        const {layerConfig: {bands, urlTemplate} = defaultLayerConfig, map, busy$} = this.props
        const concurrency = CONCURRENCY
        const layer = urlTemplate
            ? this.selectedHasCir()
                ? new PlanetLayer({map, urlTemplate: `${urlTemplate}&proc=${bands}`, concurrency, busy$})
                : new PlanetLayer({map, urlTemplate: `${urlTemplate}`, concurrency, busy$})
            : null
        this.layer = layer
        return layer
    }

    renderForm() {
        return (
            <Layout>
                {this.renderMosaics()}
                {this.selectedHasCir() ? this.renderBands() : null}
            </Layout>
        )
    }

    renderBands() {
        const {layerConfig: {bands}} = this.props
        return (
            <Buttons
                label={'Bands'}
                selected={bands}
                onChange={bands => this.setBands(bands)}
                options={[
                    {value: 'rgb', label: 'RGB'},
                    {value: 'cir', label: 'CIR'}
                ]}/>
        )
    }

    selectedHasCir() {
        const {layerConfig: {urlTemplate}} = this.props
        const apiKey = this.getApiKey()
        const {[apiKey]: mosaics = []} = this.state
        const {hasCir = false} = mosaics.find(({urlTemplate: t}) => t === urlTemplate) || {}
        return hasCir
    }

    renderMosaics() {
        const {layerConfig: {urlTemplate}} = this.props
        const apiKey = this.getApiKey()
        const {[apiKey]: mosaics = []} = this.state

        const options = mosaics.map(({startDate, endDate, urlTemplate}) => {
            const start = moment(startDate, 'YYYY-MM-DD')
            const end = moment(endDate, 'YYYY-MM-DD')
            const months = end.diff(start, 'months')
            const duration = moment.duration(months, 'months').humanize()
            const date = start.format('MMMM YYYY')
            return ({
                value: urlTemplate,
                label: `${date} - ${duration}`,
                searchableText: `${date} ${duration}`,
                render: () =>
                    <div className={styles.imageLayerSourceOption}>
                        <Item title={duration} description={date}/>
                    </div>
            })
        })
        const selectedOption = options.find(({value}) => value === urlTemplate) || {}
        return (
            <Combo
                label={'Composite'}
                options={options}
                placeholder={selectedOption.label}
                value={selectedOption.value}
                disabled={!mosaics.length}
                onChange={({value}) => this.selectUrlTemplate(value)}
            />
        )
    }

    componentDidMount() {
        this.update()
    }

    componentDidUpdate(prevProps) {
        const prevApiKey = this.getApiKey(prevProps)
        const apiKey = this.getApiKey()
        if (apiKey !== prevApiKey) {
            const {[apiKey]: mosaics} = this.state
            if (mosaics) {
                this.selectDefault(mosaics)
            }
        }
        this.update()
    }

    selectDefault(mosaics) {
        const {dateRange} = this.props
        if (dateRange) {
            const [start, end] = dateRange
            const filtered = mosaics
                .filter(({startDate, endDate}) =>
                    moment.utc(startDate).isSameOrBefore(end) && moment.utc(endDate).isSameOrAfter(start)
                )
            return filtered.length
                ? this.selectUrlTemplate(filtered[0].urlTemplate)
                : this.selectUrlTemplate(mosaics[0].urlTemplate)
        } else {
            return this.selectUrlTemplate(mosaics[0].urlTemplate)
        }
    }

    update() {
        const {stream} = this.props
        const apiKey = this.getApiKey()
        const {[apiKey]: mosaics} = this.state
        if (!mosaics && !stream(`LOAD_PLANET_MOSAICS_${apiKey}`).active) {
            stream(`LOAD_PLANET_MOSAICS_${apiKey}`,
                this.loadMosaics$(),
                mosaics => {
                    const {layerConfig: {urlTemplate} = {}} = this.props
                    if (!urlTemplate) {
                        this.selectDefault(mosaics)
                    }
                    this.setState({[apiKey]: mosaics})
                }
            )
        }
    }

    setBands(bands) {
        const {layerConfig: {urlTemplate}, mapAreaContext: {updateLayerConfig}} = this.props
        updateLayerConfig({bands, urlTemplate})
    }

    selectUrlTemplate(urlTemplate) {
        const {layerConfig: {bands}, mapAreaContext: {updateLayerConfig}} = this.props
        updateLayerConfig({bands, urlTemplate})
    }

    loadMosaics$() {
        const apiKey = this.getApiKey()
        return api.planet.loadMosaics$(apiKey).pipe(
            map(({mosaics}) => _.orderBy(
                mosaics
                    .filter(({datatype}) => datatype !== 'byte')
                    .map(({first_acquired, last_acquired, item_types, _links: {tiles}}) => ({
                        startDate: first_acquired.substring(0, 10),
                        endDate: last_acquired.substring(0, 10),
                        urlTemplate: tiles,
                        hasCir: item_types.includes('PSScene4Band')
                    })),
                ['startDate', 'endDate'], ['desc', 'desc']
            ))
        )
    }

    getApiKey(props) {
        const {planetApiKey, mapContext: {norwayPlanetApiKey}} = props || this.props
        return planetApiKey || norwayPlanetApiKey
    }
}

export const PlanetImageLayer = compose(
    _PlanetImageLayer,
    connect(),
    withMapContext(),
    withMapAreaContext(),
    withRecipe(mapRecipeToProps),
    withTabContext(),
    withSubscriptions()
)

PlanetImageLayer.defaultProps = {
    layerConfig: defaultLayerConfig
}

PlanetImageLayer.propTypes = {
    layerConfig: PropTypes.object,
    map: PropTypes.object,
    planetApiKey: PropTypes.string
}
