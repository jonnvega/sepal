import {getRecipeType} from 'app/home/body/process/recipeTypes'
import {msg} from 'translate'
import {normalize} from 'app/home/map/visParams/visParams'
import {publishEvent} from 'eventPublisher'
import {recipeActionBuilder} from 'app/home/body/process/recipe'
import {selectFrom} from 'stateUtils'
import {toT} from 'app/home/body/process/recipe/ccdc/t'
import _ from 'lodash'
import api from 'api'
import moment from 'moment'

export const defaultModel = {
    reference: {},
    date: {
        monitoringDuration: 1,
        monitoringDurationUnit: 'months',
        calibrationDuration: 2,
        calibrationDurationUnit: 'months',
        
    },
    sources: {
        dataSets: {
            LANDSAT: ['LANDSAT_9', 'LANDSAT_8', 'LANDSAT_7', 'LANDSAT_TM'],
            SENTINEL_2: ['SENTINEL_2']
        }
    },
    options: {
        corrections: ['SR'],
        cloudDetection: ['QA', 'CLOUD_SCORE'],
        cloudMasking: 'AGGRESSIVE',
        snowMasking: 'ON',
        orbits: ['ASCENDING', 'DECENDING'],
        geometricCorrection: 'ELLIPSOID',
        speckleFilter: 'NONE',
        outlierRemoval: 'NONE'
    },
    changeAlertsOptions: {

    }
}

export const RecipeActions = id => {
    const actionBuilder = recipeActionBuilder(id)

    return {
        setBands(selection, baseBands) {
            return actionBuilder('SET_BANDS', {selection, baseBands})
                .set('ui.bands.selection', selection)
                .set('ui.bands.baseBands', baseBands)
                .dispatch()
        },
        setChartPixel(latLng) {
            return actionBuilder('SET_CHART_PIXEL', latLng)
                .set('ui.chartPixel', latLng)
                .dispatch()
        },
        retrieve(retrieveOptions) {
            return actionBuilder('REQUEST_CCDC_SLICE_RETRIEVAL', {retrieveOptions})
                .setAll({
                    'ui.retrieveState': 'SUBMITTED',
                    'ui.retrieveOptions': retrieveOptions
                })
                .sideEffect(recipe => submitRetrieveRecipeTask(recipe))
                .build()
        },
        setClassification({classificationLegend, classifierType} = {}) {
            actionBuilder('SET_CLASSIFICATION', {classificationLegend, classifierType})
                .set('ui.classification', {classificationLegend, classifierType})
                .dispatch()
        }
    }
}

export const loadCCDCSegments$ = ({recipe, latLng, bands}) =>
    api.gee.loadCCDCSegments$({recipe: recipe.model.reference, latLng, bands})

export const getAllVisualizations = recipe => {
    return recipe.ui.initialized
        ? [
            ...Object.values((selectFrom(recipe, ['layers.userDefinedVisualizations', 'this-recipe']) || {})),
            ...selectFrom(recipe, 'model.reference.visualizations') || [],
            ...additionalVisualizations(recipe)
        ]
        : []
}

export const additionalVisualizations = recipe => {
    const dateType = selectFrom(recipe, 'model.date.dateType')
    const date = selectFrom(recipe, 'model.date.date')
    const startDate = selectFrom(recipe, 'model.date.startDate')
    const endDate = selectFrom(recipe, 'model.date.endDate')
    const segmentsEndDate = selectFrom(recipe, 'model.reference.endDate')
    const dateFormat = selectFrom(recipe, 'model.reference.dateFormat')

    const DATE_FORMAT = 'YYYY-MM-DD'

    const getBreakMinMax = () => {
        if (dateType === 'RANGE') {
            return {
                min: Math.round(toT(moment(startDate, DATE_FORMAT).startOf('year').toDate(), dateFormat)),
                max: Math.round(toT(moment(endDate, DATE_FORMAT).add(1, 'years').startOf('year').toDate(), dateFormat))
            }
        } else {
            return {
                min: Math.round(toT(
                    moment(date, DATE_FORMAT).add(-1, 'years').startOf('year').toDate() || moment('1982-01-01', DATE_FORMAT).toDate(),
                    dateFormat
                )),
                max: Math.round(toT(
                    moment(segmentsEndDate, DATE_FORMAT).toDate() || moment().add(1, 'years').startOf('year').toDate(),
                    dateFormat
                ))
            }
        }
    }
    return [
        normalize({
            type: 'continuous',
            bands: ['tBreak'],
            ...getBreakMinMax(),
            palette: ['#000000', '#781C81', '#3F60AE', '#539EB6', '#6DB388', '#CAB843', '#E78532', '#D92120']
        }),
    ]
}

const submitRetrieveRecipeTask = recipe => {
    const name = recipe.title || recipe.placeholder
    const scale = recipe.ui.retrieveOptions.scale
    const destination = recipe.ui.retrieveOptions.destination
    const taskTitle = msg(['process.changeAlerts.panel.retrieve.task', destination], {name})
    const {baseBands, bandTypes, segmentBands} = recipe.ui.retrieveOptions
    const bandTypeSuffixes = {
        value: '',
        rmse: '_rmse',
        magnitude: '_magnitude',
        breakConfidence: '_breakConfidence',
        intercept: '_intercept',
        slope: '_slope',
        phase_1: '_phase_1',
        phase_2: '_phase_2',
        phase_3: '_phase_3',
        amplitude_1: '_amplitude_1',
        amplitude_2: '_amplitude_2',
        amplitude_3: '_amplitude_3',
    }
    const allBands = [
        ...recipe.model.reference.bands,
        ...recipe.model.reference.baseBands
            .map(({name}) => Object.values(bandTypeSuffixes)
                .map(suffix => `${name}${suffix}`)
            )
            .flat()
    ]
    const bands = [
        ...baseBands
            .map(name => bandTypes
                .map(bandType => `${name}${bandTypeSuffixes[bandType]}`)
            )
            .flat(),
        ...baseBands.map(({name}) => name),
        ...segmentBands
    ].filter(band => allBands.includes(band))
    const [timeStart, timeEnd] = (getRecipeType(recipe.type).getDateRange(recipe) || []).map(date => date.valueOf())
    const visualizations = getAllVisualizations(recipe)
        .filter(({bands: visBands}) => visBands.every(band => bands.includes(band)))
    const operation = `image.${destination === 'SEPAL' ? 'sepal_export' : 'asset_export'}`
    const task = {
        operation,
        'params':
            {
                title: taskTitle,
                description: name,
                image: {
                    recipe: _.omit(recipe, ['ui']),
                    bands: {selection: bands, baseBands},
                    visualizations,
                    scale,
                    properties: {'system:time_start': timeStart, 'system:time_end': timeEnd}
                }
            }
    }
    publishEvent('submit_task', {
        recipe_type: recipe.type,
        destination
    })
    return api.tasks.submit$(task).subscribe()
}
