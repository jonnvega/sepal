import {GooglePolygonLayer} from './layer/googlePolygonLayer'
import {compose} from 'compose'
import {connect} from 'store'
import PropTypes from 'prop-types'
import React from 'react'

class _PolygonLayer extends React.Component {
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
        const {id, path, map} = this.props
        if (path) {
            const layer = new GooglePolygonLayer({map, path})
            map.setLayer({id, layer})
        }
    }
}

export const PolygonLayer = compose(
    _PolygonLayer,
    connect()
)

PolygonLayer.propTypes = {
    id: PropTypes.string.isRequired,
    map: PropTypes.any,
    path: PropTypes.any
}
