import {javascript} from '@codemirror/lang-javascript'
import {EditorState} from '@codemirror/state'

import {eeLint} from './eeLint'

it('missing variable gives error', () => {
    expect(lint({
        images: [],
        expression: 'a'
    })).toMatchObject([{
        from: 0,
        to: 1,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.undefinedVariable'
    }])
})

it('image name gives no problems', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1'
    })).toMatchObject([])
})

it('invalid band name using . gives error', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1.b2'
    })).toMatchObject([{
        from: 3,
        to: 5,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.invalidBand'
    }])
})

it('valid band name using . gives no problems', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1.b1'
    })).toMatchObject([])
})

it('invalid band name using [] gives error', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1["b2"]'
    })).toMatchObject([{
        from: 3,
        to: 7,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.invalidBand'
    }])
})

it('valid band name using [] gives no problem', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1["b1"]'
    })).toMatchObject([])
})

it('using . gives no problem', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'i1["b1"]'
    })).toMatchObject([])
})

it('using . after a parenthesis gives error', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: '(i1).b1'
    })).toMatchObject([{
        from: 4,
        to: 5,
        severity: 'error',
        message: msg('widget.codeEditor.eeLint.syntaxError')
    }])
})

it('using [ after a parenthesis gives error', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: '(i1)["b1"]'
    })).toMatchObject([{
        from: 4,
        to: 5,
        severity: 'error',
        message: msg('widget.codeEditor.eeLint.syntaxError')
    }])
})

it('when both syntax error and a logical error in same range, only the logical error is returned', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: '(i1).'
    })).toMatchObject([{
        severity: 'error',
        message: 'widget.codeEditor.eeLint.syntaxError'
    }])
})

it('math constant gives no problems', () => {
    expect(lint({
        images: [],
        expression: 'PI'
    })).toMatchObject([])
})

it('math function taking one argument is provided with one argument gives no problems', () => {
    expect(lint({
        images: [],
        expression: 'abs(1)'
    })).toMatchObject([])
})

it('math function taking two argument is provided with one argument gives no problems', () => {
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    expect(lint({
        images: [image],
        expression: 'max(1, i1)'
    })).toMatchObject([])
})

it('math function taking one argument is provided with two argument gives error', () => {
    expect(lint({
        images: [],
        expression: 'abs(1, 2)'
    })).toMatchObject([{
        from: 3,
        to: 9,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.invalidArgCount'
    }])
})

it('math function taking one argument is provided without arguments gives error', () => {
    expect(lint({
        images: [],
        expression: 'abs()'
    })).toMatchObject([{
        from: 3,
        to: 5,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.invalidArgCount'
    }])
})

it('math function as variable gives error', () => {
    expect(lint({
        images: [],
        expression: 'abs'
    })).toMatchObject([{
        from: 0,
        to: 3,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.undefinedVariable'
    }])
})

it('malformed expression gives error', () => {
    expect(lint({
        images: [],
        expression: '-'
    })).toMatchObject([{
        from: 1,
        to: 1,
        severity: 'error',
        message: 'widget.codeEditor.eeLint.syntaxError'
    }])
})

it('The >>> operator gives error', () => {
    expect(lint({
        images: [],
        expression: '5 >>> 1'
    })).toMatchObject([{
        severity: 'error',
        message: 'widget.codeEditor.eeLint.syntaxError'
    }])
})

it('The ~ operator gives error', () => {
    expect(lint({
        images: [],
        expression: '~ 5'
    })).toMatchObject([{
        severity: 'error',
        message: 'widget.codeEditor.eeLint.syntaxError'
    }])
})

it('The ** operator gives no problem', () => {
    expect(lint({
        images: [],
        expression: '2**3'
    })).toMatchObject([])
})

it('When only constants used returns constant band name', () => {
    let bandNames
    lint({
        images: [],
        expression: '42',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'constant'
    ])
})

it('When a single band image is used, the band name is returned', () => {
    let bandNames
    const image = {name: 'i1', includedBands: [{name: 'b1'}]}
    lint({
        images: [image],
        expression: 'i1',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'b1'
    ])
})

it('When two different single band images are used, the first image band name is returned', () => {
    let bandNames
    const image1 = {name: 'i1', includedBands: [{name: 'b1'}]}
    const image2 = {name: 'i2', includedBands: [{name: 'b2'}]}
    lint({
        images: [image1, image2],
        expression: 'i1 + i2',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'b1'
    ])
})

it('When a two band image is used, both band names are returned', () => {
    let bandNames
    const image = {name: 'i1', includedBands: [{name: 'b1'}, {name: 'b2'}]}
    lint({
        images: [image],
        expression: 'i1',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'b1', 'b2'
    ])
})

it('When single band from a multi-band image is used using . syntax, the single band is returned', () => {
    let bandNames
    const image = {name: 'i1', includedBands: [{name: 'b1'}, {name: 'b2'}]}
    lint({
        images: [image],
        expression: 'i1.b1',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'b1'
    ])
})

it('When single band from a multi-band image is used using [] syntax, the single band is returned', () => {
    let bandNames
    const image = {name: 'i1', includedBands: [{name: 'b1'}, {name: 'b2'}]}
    lint({
        images: [image],
        expression: 'i1["b1"]',
        onBandNamesChanged: changedBandNames => bandNames = changedBandNames
    })
    expect(bandNames).toMatchObject([
        'b1'
    ])
})

const lint = ({images, expression, onBandNamesChanged}) => {
    const state = EditorState.create({
        doc: expression,
        extensions: javascript()
    })
    return eeLint(images, msg, onBandNamesChanged)({state})
}

const msg = key => key
