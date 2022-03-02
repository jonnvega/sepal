import {compose} from 'compose'
import {withTabContext} from 'widget/tabs/tabContext'
import EarthEngineTableLayer from './layer/earthEngineTableLayer'
import PropTypes from 'prop-types'
import React from 'react'
import api from 'api'
import withSubscriptions from 'subscription'

class _EETableLayer extends React.Component {
    render() {
        return null
    }

    componentDidMount() {
        this.setLayer()
    }

    componentDidUpdate() {
        this.setLayer()
    }

    componentWillUnmount() {
        const {id, map} = this.props
        map.removeLayer(id)
    }

    setLayer() {
        const {id, map} = this.props
        const layer = this.createLayer()
        if (layer) {
            map.setLayer({id, layer})
        }
    }

    createLayer() {
        const {tableId, columnName, columnValue, buffer, color, fillColor, layerIndex, map, busy$} = this.props
        return tableId
            ? new EarthEngineTableLayer({
                map,
                mapId$: api.gee.eeTableMap$({
                    tableId, columnName, columnValue, buffer, color, fillColor
                }),
                layerIndex,
                watchedProps: {tableId, columnName, columnValue, buffer},
                busy$
            })
            : null
    }
}

export const EETableLayer = compose(
    _EETableLayer,
    withTabContext(),
    withSubscriptions()
)

EETableLayer.propTypes = {
    id: PropTypes.string.isRequired,
    buffer: PropTypes.number,
    columnName: PropTypes.string,
    columnValue: PropTypes.any,
    layerIndex: PropTypes.number,
    map: PropTypes.any,
    tableId: PropTypes.string
}