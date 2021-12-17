import {msg} from 'translate'
import React from 'react'
import styles from './tagline.module.css'

const Tagline = ({className}) =>
    <div className={[styles.tagline, className].join(' ')}>
        {msg('landing.tagline')}
    </div>

export default Tagline
