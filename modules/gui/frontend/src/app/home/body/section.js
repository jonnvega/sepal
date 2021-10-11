import {Selectable} from 'widget/selectable'
import {StaticMap} from '../map/staticMap'
import {isPathInLocation} from 'route'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './section.module.css'

const Section = ({path, captureMouseEvents, children}) => (
    <Selectable
        id={path}
        className={styles.section}
        active={isPathInLocation(path)}
        captureMouseEvents={captureMouseEvents}>
        <StaticMap>
            {children}
        </StaticMap>
    </Selectable>
)

Section.propTypes = {
    captureMouseEvents: PropTypes.any,
    children: PropTypes.any,
    path: PropTypes.string,
}

Section.defaultProps = {
    captureMouseEvents: true
}

export default Section
