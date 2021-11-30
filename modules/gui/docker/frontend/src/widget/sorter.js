import {Button} from 'widget/button'
import {ButtonGroup} from 'widget/buttonGroup'
import Icon from 'widget/icon'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'

export class Sorter extends React.Component {
    state = {
        sortingOrder: 'updateTime',
        sortingDirection: -1,
        filterValues: []
    }

    renderSortButtons() {
        const {sortOptions} = this.props
        return (
            <ButtonGroup layout='horizontal-nowrap' spacing='tight'>
                {sortOptions.map(({column, label}) => this.renderSortButton(column, label))}
            </ButtonGroup>
        )
    }

    renderSortButton(column, label) {
        return (
            <Button
                chromeless
                look='transparent'
                shape='pill'
                size='large'
                additionalClassName='itemType'
                onClick={() => this.setSorting(column)}
                label={label}
                icon={this.icon(column)}
                iconPlacement='right'
            />
        )
    }

    icon(column) {
        return this.state.sortingOrder === column
            ? this.state.sortingDirection === 1
                ? 'sort-down'
                : 'sort-up'
            : 'sort'
    }

    renderSortingHandle(column) {
        return this.state.sortingOrder === column
            ? this.state.sortingDirection === 1
                ? <Icon name={'sort-down'}/>
                : <Icon name={'sort-up'}/>
            : <Icon name={'sort'}/>
    }

    setSorting(sortingOrder) {
        const {items, onSort} = this.props
        this.setState(prevState => {
            const sortingDirection = sortingOrder === prevState.sortingOrder ? -prevState.sortingDirection : 1
            return {
                ...prevState,
                sortingOrder,
                sortingDirection
            }
        }, () =>
            onSort && onSort(this.getSortedItems(items, sortingOrder, this.state.sortingDirection))
        )
    }

    getSortedItems() {
        const {items} = this.props
        const {sortingOrder, sortingDirection} = this.state
        return _.orderBy(items, item => {
            const sortingItem = _.get(item, sortingOrder)
            return _.isString(sortingItem) ? sortingItem.toUpperCase() : sortingItem
        }, sortingDirection === 1 ? 'asc' : 'desc')
    }
}

Sorter.propTypes = {
    sortOptions: PropTypes.arrayOf(
        PropTypes.shape({
            column: PropTypes.string,
            label: PropTypes.string
        })
    ).isRequired,
    onSort: PropTypes.func.isRequired,
    items: PropTypes.array
}
