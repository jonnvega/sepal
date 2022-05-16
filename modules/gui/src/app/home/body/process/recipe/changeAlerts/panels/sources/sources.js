import {AssetInput} from 'widget/assetInput'
import {Form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {RecipeActions} from 'app/home/body/process/recipe/changeAlerts/changeAlertsRecipe'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {compose} from 'compose'
import {connect, select} from 'store'
import {getIndexesForBands} from 'app/home/body/process/recipe/opticalMosaic/indexes'
import {groupedBandOptions} from 'sources'
import {isOpticalDataSet, getDataSetOptions as opticalDataSetOptions} from 'app/home/body/process/recipe/opticalMosaic/sources'
import {isRadarDataSet, getDataSetOptions as radarDataSetOptions} from 'app/home/body/process/recipe/radarMosaic/sources'
import {msg} from 'translate'
import {getDataSetOptions as planetDataSetOptions} from 'app/home/body/process/recipe/planetMosaic/sources'
import {recipeAccess} from 'app/home/body/process/recipeAccess'
import {selectFrom} from 'stateUtils'
import {toSources} from 'sources'
import Notifications from 'widget/notifications'
import React from 'react'
import _ from 'lodash'
import styles from './sources.module.css'

const fields = {
    dataSetType: new Form.Field()
        .notEmpty(),
    dataSets: new Form.Field()
        .notEmpty(),
    asset: new Form.Field()
        .skip((v, {dataSets}) => !['BASEMAPS', 'DAILY'].includes(dataSets))
        .notBlank(),
    validAsset: new Form.Field()
        .skip((v, {dataSets}) => !['BASEMAPS', 'DAILY'].includes(dataSets))
        .notBlank(),
    classification: new Form.Field(),
    band: new Form.Field()
        .notBlank()
}

const mapStateToProps = () => {
    return {
        recipes: select('process.recipes')
    }
}

const mapRecipeToProps = recipe => ({
    dates: selectFrom(recipe, 'model.dates'),
    baseBands: selectFrom(recipe, 'model.reference.baseBands'),
    corrections: selectFrom(recipe, 'model.options.corrections')
})

class Sources extends React.Component {
    state = {}

    constructor(props) {
        super(props)
        this.recipeActions = RecipeActions(props.recipeId)
    }

    render() {
        return (
            <RecipeFormPanel
                className={styles.panel}
                placement='bottom-right'>
                <Panel.Header
                    icon='cog'
                    title={msg('process.changeAlerts.panel.sources.title')}/>
                <Panel.Content>
                    <Layout>
                        {this.renderDataSetTypes()}
                        {this.renderDataSets()}
                        {this.renderAssetId()}
                        {this.renderClassification()}
                        {this.renderBand()}
                    </Layout>
                </Panel.Content>
                <Form.PanelButtons/>
            </RecipeFormPanel>
        )
    }

    renderDataSetTypes() {
        const {inputs: {dataSetType}} = this.props
        const options = [
            {value: 'OPTICAL', label: msg('process.ccdc.panel.sources.form.dataSetTypes.OPTICAL')},
            {value: 'RADAR', label: msg('process.ccdc.panel.sources.form.dataSetTypes.RADAR')},
            {value: 'PLANET', label: msg('process.ccdc.panel.sources.form.dataSetTypes.PLANET')},
        ]
        return (
            <Form.Buttons
                label={msg('process.ccdc.panel.sources.form.dataSetType.label')}
                input={dataSetType}
                options={options}
            />
        )
    }

    renderDataSets() {
        const {inputs: {dataSetType, dataSets}} = this.props
        if (!dataSetType.value) {
            return null
        }
        return (
            <Form.Buttons
                label={msg('process.ccdc.panel.sources.form.dataSets.label')}
                input={dataSets}
                options={this.dataSetOptions()}
                multiple={dataSetType.value === 'OPTICAL'}
            />
        )
    }

    renderClassification() {
        const {recipes, inputs: {classification}} = this.props
        const options = recipes
            .filter(({type}) => type === 'CLASSIFICATION')
            .map(recipe => ({
                value: recipe.id,
                label: recipe.name
            }))
        return (
            <Form.Combo
                label={msg('process.changeAlerts.panel.sources.form.classification.label')}
                tooltip={msg('process.changeAlerts.panel.sources.form.classification.tooltip')}
                placeholder={msg('process.changeAlerts.panel.sources.form.classification.placeholder')}
                input={classification}
                options={options}
                busyMessage={this.props.stream('LOAD_CLASSIFICATION_RECIPE').active && msg('widget.loading')}
                onChange={selected => selected
                    ? this.loadClassification(selected.value)
                    : this.deselectClassification()}
                allowClear
                errorMessage
            />
        )
    }

    renderBand() {
        const {baseBands, corrections, inputs: {dataSets, band}} = this.props
        const {classificationLegend, classifierType} = this.state
        var dataSetArray = dataSets.value && _.isArray(dataSets.value)
            ? dataSets.value
            : [dataSets.value]
        var classification = {classificationLegend, classifierType, include: ['regression', 'probabilities']}
        const collectionGrouped = groupedBandOptions({
            dataSets: dataSetArray,
            corrections,
            classification
        })
        
        const ccdcBaseBands = baseBands.map(({name}) => name)
        const ccdcIndexes = getIndexesForBands(ccdcBaseBands)
        const ccdcBands = ccdcBaseBands.concat(ccdcIndexes)
        const options = collectionGrouped
            .map(group => group
                .filter(({value}) => ccdcBands.includes(value))
            )
            .filter(group => group.length)
            .map(group => ({options: group}))
        return (
            <Form.Buttons
                label={msg('process.changeAlerts.panel.sources.form.band.label')}
                input={band}
                options={options}
                disabled={!options.length}
                framed
            />
        )
    }

    renderAssetId() {
        const {inputs: {dataSets, asset, validAsset}} = this.props
        if (!['BASEMAPS', 'DAILY'].includes(dataSets.value)) {
            return null
        }
        return (
            <AssetInput
                input={asset}
                label={msg('process.planetMosaic.panel.sources.form.asset.label')}
                placeholder={msg('process.planetMosaic.panel.sources.form.asset.placeholder')}
                expectedType='ImageCollection'
                autoFocus
                onLoading={() => validAsset.set('')}
                onLoaded={() => validAsset.set('valid')}
            />
        )
    }

    componentDidMount() {
        const {inputs: {dataSetType, classification}} = this.props
        if (!dataSetType.value) {
            dataSetType.set('OPTICAL')
        }
        if (classification.value) {
            this.loadClassification(classification.value)
        }
    }

    componentDidUpdate(prevProps) {
        const {inputs: {dataSetType: {value: prevDataSetType}}} = prevProps
        const {inputs: {dataSetType: {value: dataSetType}, dataSets, asset}} = this.props
        const dataSetTypeChanged = prevDataSetType !== dataSetType
        if (dataSetTypeChanged) {
            const options = this.dataSetOptions()
            const validDataSets = _.intersection(options.map(({value}) => value), dataSets.value)
            if (!validDataSets.length) {
                const defaultDataSets =
                    dataSetType === 'OPTICAL'
                        ? [options[0].value]
                        : options[0].value
                dataSets.set(defaultDataSets)
            }
            if (dataSetType !== 'PLANET') {
                asset.set(null)
            }
        }
    }

    dataSetOptions() {
        const {dates, inputs: {dataSetType}} = this.props
        switch (dataSetType.value) {
        case 'OPTICAL': return opticalDataSetOptions({...dates})
        case 'RADAR': return radarDataSetOptions({...dates})
        case 'PLANET': return planetDataSetOptions({...dates}).filter(({value}) => value !== 'NICFI')
        default: return []
        }
    }

    loadClassification(recipeId) {
        const {stream, loadRecipe$} = this.props
        this.deselectClassification()
        stream('LOAD_CLASSIFICATION_RECIPE',
            loadRecipe$(recipeId),
            classification => this.setState({
                classificationLegend: classification.model.legend,
                classifierType: classification.model.classifier.type
            }),
            error => Notifications.error({
                message: msg('process.changeAlerts.panel.sources.classificationLoadError', {error}),
                error
            })
        )
    }

    deselectClassification() {
        this.setState({
            classificationLegend: null,
            classifierType: null
        })
    }
}

Sources.propTypes = {}

const valuesToModel = ({dataSetType, asset, dataSets, classification, band}) => {
    return ({
        dataSetType,
        dataSets: toSources(_.isArray(dataSets) ? dataSets : [dataSets]),
        assets: asset ? [asset] : [],
        classification,
        band
    })
}

const modelToValues = ({dataSetType, assets, dataSets, classification, band}) => {
    const dataSetIds = _.uniq(Object.values(dataSets).flat())
    const defaultedDataSetType = dataSetType
        ? dataSetType
        : dataSetIds.find(dataSetId => isOpticalDataSet(dataSetId))
            ? 'OPTICAL'
            : dataSetIds.find(dataSetId => isRadarDataSet(dataSetId))
                ? 'RADAR'
                : 'PLANET'
    return ({
        dataSetType: defaultedDataSetType,
        dataSets: defaultedDataSetType === 'OPTICAL' || !dataSetIds.length ? dataSetIds : dataSetIds[0],
        asset: _.isEmpty(assets) ? null : assets[0],
        validAsset: true,
        classification,
        band
    })
}

export default compose(
    Sources,
    connect(mapStateToProps),
    recipeFormPanel({id: 'sources', fields, mapRecipeToProps, modelToValues, valuesToModel}),
    recipeAccess()
)