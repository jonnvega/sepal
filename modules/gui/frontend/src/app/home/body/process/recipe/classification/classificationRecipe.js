import {msg} from 'translate'
import {recipeActionBuilder} from '../../recipe'
import _ from 'lodash'
import api from 'api'

export const defaultModel = {
    auxiliaryImagery: [],
    classifier: {
        type: 'RANDOM_FOREST',
        numberOfTrees: 25,
        variablesPerSplit: null,
        minLeafPopulation: 1,
        bagFraction: 0.5,
        maxNodes: null,
        seed: 0,

        lambda: 0.000001,

        decisionProcedure: 'Voting',
        svmType: 'C_SVC',
        kernelType: 'LINEAR',
        shrinking: true,
        degree: null,
        gamma: null,
        coef0: 0,
        cost: 1,
        nu: 0.5,

        metric: 'euclidean'
    }
}

export const RecipeActions = id => {
    const actionBuilder = recipeActionBuilder(id)

    const set = (name, prop, value, otherProps) =>
        actionBuilder(name, otherProps)
            .set(prop, value)
            .build()
    return {
        retrieve(retrieveOptions) {
            return actionBuilder('REQUEST_CLASSIFICATION_RETRIEVAL', {retrieveOptions})
                .setAll({
                    'ui.retrieveState': 'SUBMITTED',
                    'ui.retrieveOptions': retrieveOptions
                })
                .sideEffect(recipe => submitRetrieveRecipeTask(recipe))
                .build()
        },
        setEETableColumns(columns) {
            return set('SET_EE_TABLE_COLUMNS', 'ui.eeTable.columns', columns, {columns})
        },
        removeInputImage(imageToRemove) {
            actionBuilder('REMOVE_INPUT_IMAGE', {imageToRemove})
                .del(['model.inputImagery.images', {id: imageToRemove.id}])
                .del(['ui.inputImagery.images', {id: imageToRemove.id}])
                .dispatch()
        },
        removeTrainingDataSet(dataSetToRemove) {
            actionBuilder('REMOVE_TRAINING_DATA_SET', {dataSetToRemove})
                .del(['model.trainingData.dataSets', {dataSetId: dataSetToRemove.dataSetId}])
                .del(['ui.trainingData.dataSets', {dataSetId: dataSetToRemove.dataSetId}])
                .dispatch()
        }
    }
}

export const getBandOptions = (legend, classifierType) =>
    [
        {
            value: 'class',
            label: msg('process.classification.bands.class')
        },
        supportRegression(classifierType) && {
            value: 'regression',
            label: msg('process.classification.bands.regression')
        },
        supportProbability(classifierType) && {
            value: 'class_probability',
            label: msg('process.classification.bands.classProbability')
        },
        ...legend.entries.map(({value, label}) => supportProbability(classifierType) && {
            value: `probability_${value}`,
            label: msg('process.classification.bands.probability', {class: label})
        })
    ].filter(option => option)


const supportRegression = classifierType =>
    ['RANDOM_FOREST', 'CART'].includes(classifierType)

const supportProbability = classifierType =>
    ['RANDOM_FOREST', 'CART'].includes(classifierType)

const submitRetrieveRecipeTask = recipe => {
    const name = recipe.title || recipe.placeholder
    const bands = recipe.ui.retrieveOptions.bands
    const scale = recipe.ui.retrieveOptions.scale
    const destination = recipe.ui.retrieveOptions.destination
    const taskTitle = msg(['process.classification.panel.retrieve.form.task', destination], {name})
    const task = {
        'operation': `image.${destination === 'SEPAL' ? 'sepal_export' : 'asset_export'}`,
        'params':
            {
                title: taskTitle,
                description: name,
                image: {
                    recipe: _.omit(recipe, ['ui']),
                    bands: {selection: bands},
                    scale
                }
            }
    }
    return api.tasks.submit$(task).subscribe()
}