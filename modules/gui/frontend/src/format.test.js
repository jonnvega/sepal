import _ from 'lodash'
import format from './format'

/* eslint-disable no-undef */

const test = name => {
    const nameTemplate = _.template(name)
    return ({
        assert: assertion => ({
            where: (...data) =>
                data.forEach(data =>
                    it(nameTemplate(data), () => assertion(data))
                )
        })
    })
}

test('format.number(${JSON.stringify(params)}) === ${result}')
    .assert(({params, result}) => expect(format.number(params)).toEqual(result))
    .where(
        {params: {value: null}, result: ''},
        {params: {value: null, defaultValue: 'n/a'}, result: 'n/a'},
        {params: {value: null, defaultValue: 'n/a', padding: true}, result: '   n/a'},
        {params: {value: 0}, result: '0'},
        {params: {value: 1000000}, result: '1.00M'},
        {params: {value: 100000}, result: '100k'},
        {params: {value: 10000}, result: '10.0k'},
        {params: {value: 1000}, result: '1.00k'},
        {params: {value: 100}, result: '100'},
        {params: {value: 10}, result: '10.0'},
        {params: {value: 1}, result: '1.00'},
        {params: {value: .1}, result: '0.10'},
        {params: {value: .01}, result: '0.01'},
        {params: {value: .001}, result: '0.00'},
        {params: {value: .0001}, result: '0.00'},
        {params: {value: .1, minScale: 'p'}, result: '100m'},
        {params: {value: .01, minScale: 'p'}, result: '10.0m'},
        {params: {value: .001, minScale: 'p'}, result: '1.00m'},
        {params: {value: .0001, minScale: 'p'}, result: '100µ'},
        {params: {value: .00001, minScale: 'p'}, result: '10.0µ'},
        {params: {value: .000001, minScale: 'p'}, result: '1.00µ'},
        {params: {value: 1.23456, scale: 'k'}, result: '1.23k'},
        {params: {value: 12.3456}, result: '12.3'},
        {params: {value: 123.456}, result: '123'},
        {params: {value: 1234.56, scale: 'M'}, result: '1.23G'},
        {params: {value: 12345.6, scale: 'µ', minScale: 'p'}, result: '12.3m'},
        {params: {value: 12345.6, scale: 'µ'}, result: '0.01'},
        {params: {value: 123456, scale: 'm'}, result: '123'},
        {params: {value: 123456, precisionDigits: 3}, result: '123k'},
        {params: {value: 123456, precisionDigits: 4}, result: '123.5k'},
        {params: {value: 123456, precisionDigits: 5}, result: '123.46k'},
        {params: {value: 123456, precisionDigits: 6}, result: '123.456k'},
        {params: {value: 123456, precisionDigits: 7}, result: '123.4560k'},
        {params: {value: 123456, scale: 'k', precisionDigits: 5}, result: '123.46M'},
        {params: {value: 18245.23, scale: 'k'}, result: '18.2M'},
        {params: {value: 18245.23, scale: 'µ', minScale: 'p'}, result: '18.2m'},
        {params: {value: 18245.23, scale: 'µ'}, result: '0.02'},
        {params: {value: 1000, scale: 'k'}, result: '1.00M'},
        {params: {value: 4700.9938, scale: 'p', minScale: 'p'}, result: '4.70n'},
        {params: {value: 4700.9938, scale: 'p'}, result: '0.00'},
        {params: {value: 46920395.334, scale: 'm'}, result: '46.9k'},
        {params: {value: .01, scale: 'G'}, result: '10.0M'},
        {params: {value: .00000123, scale: 'G'}, result: '1.23k'},
        {params: {value: .0001, scale: 'G'}, result: '100k'},
        {params: {value: 999999}, result: '1.00M'},
        {params: {value: 999999, minScale: 'k'}, result: '1.00M'},
        {params: {value: 999999, minScale: 'M'}, result: '1.00M'},
        {params: {value: 999999, minScale: 'G'}, result: '0.00G'},
        {params: {value: 999999, minScale: 'T'}, result: '0.00T'},
        {params: {value: 123, minScale: ''}, result: '123'},
        {params: {value: 1234, minScale: ''}, result: '1.23k'},
        {params: {value: 1234, minScale: 'M'}, result: '0.00M'},
        {params: {value: 12345, minScale: 'M'}, result: '0.01M'},
        {params: {value: 123456, minScale: 'M'}, result: '0.12M'},
        {params: {value: 987, minScale: 'M'}, result: '0.00M'},
        {params: {value: 9876, minScale: 'M'}, result: '0.01M'},
        {params: {value: 98765, minScale: 'M'}, result: '0.10M'},
        {params: {value: 987654, minScale: 'M'}, result: '0.99M'},
        {params: {value: 987654, unit: 'B', minScale: 'M'}, result: '0.99 MB'},
        {params: {value: 0, padding: true}, result: '     0'},
        {params: {value: 1000000, padding: true}, result: ' 1.00M'},
        {params: {value: 100000, padding: true}, result: '  100k'},
        {params: {value: 10000, padding: true}, result: ' 10.0k'},
        {params: {value: 1000, padding: true}, result: ' 1.00k'},
        {params: {value: 100, padding: true}, result: '   100'},
        {params: {value: 10, padding: true}, result: '  10.0'},
        {params: {value: 1, padding: true}, result: '  1.00'},
        {params: {value: .1, padding: true}, result: '  0.10'},
        {params: {value: .01, padding: true}, result: '  0.01'},
        {params: {value: .001, padding: true}, result: '  0.00'},
        {params: {value: .0001, padding: true}, result: '  0.00'},
        {params: {value: .1, minScale: 'p', padding: true}, result: '  100m'},
        {params: {value: .01, minScale: 'p', padding: true}, result: ' 10.0m'},
        {params: {value: .001, minScale: 'p', padding: true}, result: ' 1.00m'},
        {params: {value: .0001, minScale: 'p', padding: true}, result: '  100µ'},
        {params: {value: .00001, minScale: 'p', padding: true}, result: ' 10.0µ'},
        {params: {value: .000001, minScale: 'p', padding: true}, result: ' 1.00µ'},
        {params: {value: 1000, padding: true, unit: 'B'}, result: ' 1.00 kB'},
        {params: {value: -1000, padding: true, unit: 'B'}, result: '-1.00 kB'},
        {params: {prefix: '£', value: 1000, padding: true}, result: ' £1.00k'},
        {params: {prefix: '£', value: -1000, padding: true}, result: '-£1.00k'},
        {params: {prefix: '£', value: 1000, padding: true, unit: 'B'}, result: ' £1.00 kB'},
        {params: {prefix: '£', value: -1000, padding: true, unit: 'B'}, result: '-£1.00 kB'},
        {params: {prefix: '£', value: 1000, padding: true, unit: 'B', suffix: '/hr'}, result: ' £1.00 kB/hr'},
        {params: {prefix: '£', value: -1000, padding: true, unit: 'B', suffix: '/hr'}, result: '-£1.00 kB/hr'},
    )

test('format.dollars({value: ${params.value}) === ${result}')
    .assert(({params, result}) => expect(format.dollars(params.value)).toEqual(result))
    .where(
        {params: {value: 0}, result: '$0'},
        {params: {value: 1}, result: '$1.00'},
        {params: {value: 0.3}, result: '$0.30'},
    )

test('format.unitsPerHour({value: ${params.value}) === ${result}')
    .assert(({params, result}) => expect(format.unitsPerHour(params.value)).toEqual(result))
    .where(
        {params: {value: 0}, result: '0/h'},
        {params: {value: 1}, result: '1.00/h'},
        {params: {value: 0.3}, result: '0.30/h'},
    )

test('format.significantDigits({value: ${params.value}, min: ${params.min}, max: ${params.max}, minSteps: ${params.minSteps}) === ${result}')
    .assert(({params, result}) => expect(
        format.significantDigits(params)
    ).toEqual(result))
    .where(
        {params: {value: 1, min: 0, max: 100, minSteps: 100}, result: 1},
        {params: {value: -1, min: -1, max: 100, minSteps: 100}, result: 1},
        {params: {value: 10, min: 0, max: 100, minSteps: 100}, result: 2},
        {params: {value: 1.5, min: 0, max: 100, minSteps: 100}, result: 1},
        {params: {value: 2015, min: 2013, max: 2017, minSteps: 100}, result: 6},
        {params: {value: 2015, min: 2013, max: 2017, minSteps: 30}, result: 5},
        {params: {value: 0, min: 0, max: 100, minSteps: 100}, result: 1},
        {params: {value: 0.1, min: 0, max: 100, minSteps: 100}, result: 1},
        {params: {value: 0.01, min: 0, max: 0.1, minSteps: 100}, result: 2},
        {params: {value: 1.23, min: 0, max: 100, minSteps: 10}, result: 2},
        {params: {value: 1, min: 0, max: 10, minSteps: 100}, result: 2},
        {params: {value: 10, min: 0, max: 10, minSteps: 100}, result: 3},
        {params: {value: 0.01343, min: 0, max: 10, minSteps: 100}, result: 1},
    )
