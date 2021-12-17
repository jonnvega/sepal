import {v4 as uuid} from 'uuid'

export class TileProvider {
    id = uuid()

    getType() {
        this.abstractMethodError('getType')
    }

    getConcurrency() {
        // this.abstractMethodError('getConcurrency')
    }

    createElement(id, doc) {
        const element = doc.createElement('div')
        element.id = id
        return element
    }

    loadTile$(_tileRequest) {
        this.abstractMethodError('loadTile$')
    }

    renderTile({element, blob}) {
        element.innerHTML = `<img src="${(window.URL || window.webkitURL).createObjectURL(blob)}"/>`
    }

    releaseTile(_tileElement) {
        // this.abstractMethodError('releaseTile')
    }

    hide(_hidden) {
        // this.abstractMethodError('hide')
    }

    close() {
        // this.abstractMethodError('close')
    }

    abstractMethodError(method) {
        throw Error(`${method} is expected to be overridden by subclass.`)
    }
}
