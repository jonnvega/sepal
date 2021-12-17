import {CSSTransition, TransitionGroup} from 'react-transition-group'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './animate.module.css'

export class AnimateEnter extends React.Component {
    render() {
        const name = this.props.name in styles ? styles[this.props.name] : this.props.name
        const duration = this.props.duration || 1000
        const delay = this.props.delay || 0
        const timeout = duration + delay
        const className = `animation_${name}_${randomString()}`
        return (
            <div className={this.props.className}>
                <style>
                    {`.${className}-appear {animation: ${name} ${duration}ms ${delay}ms ease-in-out backwards;}`}
                </style>
                <CSSTransition
                    in={true}
                    appear={true}
                    exit={false}
                    timeout={timeout}
                    classNames={className}>
                    {this.props.children}
                </CSSTransition>
            </div>
        )
    }

    static fadeInUp = 'fadeInUp'
    static fadeInDown = 'fadeInDown'
    static fadeInLeft = 'fadeInLeft'
    static fadeInRight = 'fadeInRight'
}

AnimateEnter.propTypes = {
    name: PropTypes.string.isRequired,
    children: PropTypes.any,
    className: PropTypes.string,
    delay: PropTypes.number,
    duration: PropTypes.number
}

export const AnimateReplacement = ({currentKey, timeout = 500, classNames, children, ...props}) =>
    <TransitionGroup {...props}>
        <CSSTransition
            key={currentKey}
            timeout={timeout}
            classNames={classNames}
            {...props}>
            {children}
        </CSSTransition>
    </TransitionGroup>
    
AnimateReplacement.propTypes = {
    classNames: PropTypes.any.isRequired,
    currentKey: PropTypes.any.isRequired,
    children: PropTypes.any,
    timeout: PropTypes.number
}

function randomString() {
    return Math.random().toString(36).substring(2, 15)
        + Math.random().toString(36).substring(2, 15)
}
