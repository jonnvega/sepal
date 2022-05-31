import {AssetDestination} from 'widget/assetDestination'
import {Button} from 'widget/button'
import {Form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {NumberButtons} from 'widget/numberButtons'
import {Panel} from 'widget/panel/panel'
import {RecipeActions} from '../../ccdcSliceRecipe'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {WorkspaceDestination} from 'widget/workspaceDestination'
import {compose} from 'compose'
import {connect} from 'store'
import {currentUser} from 'user'
import {msg} from 'translate'
import {selectFrom} from 'stateUtils'
import {updateProject} from 'app/home/body/process/recipeList/projects'
import Path from 'path'
import React from 'react'
import _ from 'lodash'
import styles from './retrieve.module.css'

const defaultCrs = 'EPSG:4326'
const defaultScale = 30
const defaultShardSize = 256
const defaultTileSize = 2

const fields = {
    baseBands: new Form.Field()
        .predicate(selection => selection && selection.length, 'process.ccdcSlice.panel.retrieve.form.baseBands.atLeastOne'),
    bandTypes: new Form.Field()
        .predicate(selection => selection && selection.length, 'process.ccdcSlice.panel.retrieve.form.bandTypes.atLeastOne'),
    segmentBands: new Form.Field(),
    scale: new Form.Field()
        .notBlank()
        .number(),
    destination: new Form.Field()
        .notEmpty('process.ccdcSlice.panel.retrieve.form.destination.required'),
    workspacePath: new Form.Field()
        .skip((v, {destination}) => destination !== 'SEPAL')
        .notBlank(),
    assetId: new Form.Field()
        .skip((v, {destination}) => destination !== 'GEE')
        .notBlank(),
    assetType: new Form.Field()
        .skip((v, {destination}) => destination !== 'GEE')
        .notBlank(),
    strategy: new Form.Field()
        .skip((v, {destination}) => destination !== 'GEE')
        .notBlank(),
    shardSize: new Form.Field()
        .skip((v, {destination}) => destination !== 'GEE')
        .notBlank(),
    tileSize: new Form.Field()
        .skip((v, {destination}) => destination !== 'GEE')
        .notBlank(),
    crs: new Form.Field()
        .notBlank(),
    crsTransform: new Form.Field()
}

const mapStateToProps = state => ({
    projects: selectFrom(state, 'process.projects')
})

const mapRecipeToProps = recipe => ({
    baseBands: selectFrom(recipe, 'model.source.baseBands'),
    segmentBands: selectFrom(recipe, 'model.source.segmentBands'),
    user: currentUser(),
    projectId: recipe.projectId
})

class _Retrieve extends React.Component {
    state = {more: false}

    constructor(props) {
        super(props)
        const {recipeId, inputs: {scale}} = this.props
        this.recipeActions = RecipeActions(recipeId)
        if (!scale.value)
            scale.set(30)
    }

    render() {
        const {more} = this.state
        return (
            <RecipeFormPanel
                className={styles.panel}
                isActionForm
                placement='top-right'
                onApply={values => this.retrieve(values)}>
                <Panel.Header
                    icon='cloud-download-alt'
                    title={msg('process.ccdcSlice.panel.retrieve.title')}/>
                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>
                <Form.PanelButtons
                    applyLabel={msg('process.ccdcSlice.panel.retrieve.apply')}>
                    <Button
                        label={more ? msg('button.less') : msg('button.more')}
                        onClick={() => this.setState({more: !more})}
                    />

                </Form.PanelButtons>
            </RecipeFormPanel>
        )
    }

    renderContent() {
        const {inputs: {destination, assetType}} = this.props
        const {more} = this.state
        return (
            <Layout>
                {this.renderBaseBands()}
                {this.renderBandTypes()}
                {this.renderSegmentBands()}
                {this.renderScale()}
                {this.renderDestination()}
                {destination.value === 'SEPAL' ? this.renderWorkspaceDestination() : null}
                {destination.value === 'GEE' ? this.renderAssetType() : null}
                {destination.value === 'GEE' ? this.renderAssetDestination() : null}
                {more && destination.value === 'GEE' && assetType.value === 'ImageCollection' ? this.renderTileSize() : null}
                {more && destination.value === 'GEE' ? this.renderShardSize() : null}
                <Layout type='horizontal'>
                    {more ? this.renderCrs() : null}
                    {more ? this.renderCrsTransform() : null}
                </Layout>
            </Layout>
        )
    }

    renderCrs() {
        const {inputs: {crs}} = this.props
        return (
            <Form.Input
                label={msg('process.retrieve.form.crs.label')}
                placeholder={msg('process.retrieve.form.crs.placeholder')}
                tooltip={msg('process.retrieve.form.crs.tooltip')}
                input={crs}
                errorMessage
            />
        )
    }

    renderCrsTransform() {
        const {inputs: {crsTransform}} = this.props
        return (
            <Form.Input
                label={msg('process.retrieve.form.crsTransform.label')}
                placeholder={msg('process.retrieve.form.crsTransform.placeholder')}
                tooltip={msg('process.retrieve.form.crsTransform.tooltip')}
                input={crsTransform}
                errorMessage
            />
        )
    }

    renderShardSize() {
        const {inputs: {shardSize}} = this.props
        return (
            <NumberButtons
                label={msg('process.retrieve.form.shardSize.label')}
                placeholder={msg('process.retrieve.form.shardSize.placeholder')}
                tooltip={msg('process.retrieve.form.shardSize.tooltip')}
                input={shardSize}
                options={[4, 16, 32, 64, 128, 256, 512, {value: 1024, label: '1k'}]}
                suffix={msg('process.retrieve.form.shardSize.suffix')}
                errorMessage
            />
        )
    }

    renderTileSize() {
        const {inputs: {tileSize}} = this.props
        return (
            <NumberButtons
                label={msg('process.retrieve.form.tileSize.label')}
                placeholder={msg('process.retrieve.form.tileSize.placeholder')}
                tooltip={msg('process.retrieve.form.tileSize.tooltip')}
                input={tileSize}
                options={[0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]}
                suffix={msg('process.retrieve.form.tileSize.suffix')}
                errorMessage
            />
        )
    }

    renderDestination() {
        const {user, inputs: {destination}} = this.props
        const destinationOptions = [
            {
                value: 'SEPAL',
                label: msg('process.retrieve.form.destination.SEPAL')
            },
            {
                value: 'GEE',
                label: msg('process.retrieve.form.destination.GEE')
            }
        ]
            .filter(({value}) => user.googleTokens || value !== 'GEE')
        return (
            <Form.Buttons
                label={msg('process.retrieve.form.destination.label')}
                input={destination}
                multiple={false}
                options={destinationOptions}/>
        )
    }

    renderWorkspaceDestination() {
        const {inputs: {workspacePath}} = this.props
        return (
            <WorkspaceDestination
                label={msg('process.retrieve.form.workspacePath.label')}
                placeholder={msg('process.retrieve.form.workspacePath.placeholder')}
                tooltip={msg('process.retrieve.form.workspacePath.tooltip')}
                workspacePathInput={workspacePath}
            />
        )
    }

    renderAssetDestination() {
        const {inputs: {assetId, assetType, strategy}} = this.props
        return (
            <AssetDestination
                type={assetType.value}
                label={msg('process.retrieve.form.assetId.label')}
                placeholder={msg('process.retrieve.form.assetId.tooltip')}
                tooltip={msg('process.retrieve.form.assetIt.tooltip')}
                assetInput={assetId}
                strategyInput={strategy}
            />
        )
    }

    renderAssetType() {
        const {inputs: {assetType}} = this.props
        const options = [
            {
                value: 'Image',
                label: msg('process.retrieve.form.assetType.Image.label'),
                tooltip: msg('process.retrieve.form.assetType.Image.tooltip')
            },
            {
                value: 'ImageCollection',
                label: msg('process.retrieve.form.assetType.ImageCollection.label'),
                tooltip: msg('process.retrieve.form.assetType.ImageCollection.tooltip')
            }
        ]
        return (
            <Form.Buttons
                label={msg('process.retrieve.form.assetType.label')}
                input={assetType}
                multiple={false}
                options={options}/>
        )
    }

    renderBaseBands() {
        const {baseBands, inputs} = this.props
        const bandOptions = baseBands.map(({name}) => ({value: name, label: name}))

        return (
            <Form.Buttons
                label={msg('process.ccdcSlice.panel.retrieve.form.baseBands.label')}
                input={inputs.baseBands}
                multiple
                options={bandOptions}
                framed/>
        )
    }

    renderBandTypes() {
        const {baseBands, inputs} = this.props
        const bandTypes = _.uniq(baseBands.map(({bandTypes}) => bandTypes).flat())
        const bandTypeOptions = [
            {
                value: 'value',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.value.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.value.tooltip')
            },
            {
                value: 'rmse',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.rmse.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.rmse.tooltip')
            },
            {
                value: 'magnitude',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.magnitude.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.magnitude.tooltip')
            },
            {
                value: 'breakConfidence',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.breakConfidence.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.breakConfidence.tooltip')
            },
            {
                value: 'intercept',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.intercept.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.intercept.tooltip')
            },
            {
                value: 'slope',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.slope.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.slope.tooltip')
            },
            {
                value: 'phase_1',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase1.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase1.tooltip')
            },
            {
                value: 'phase_2',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase2.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase2.tooltip')
            },
            {
                value: 'phase_3',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase3.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.phase3.tooltip')
            },
            {
                value: 'amplitude_1',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude1.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude1.tooltip')
            },
            {
                value: 'amplitude_2',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude2.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude2.tooltip')
            },
            {
                value: 'amplitude_3',
                label: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude3.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.bandTypes.amplitude3.tooltip')
            }
        ].filter(({value}) =>
            bandTypes.includes(value) ||
            (value === 'breakConfidence' && bandTypes.includes('rmse') && bandTypes.includes('magnitude'))
        )
        return (
            <Form.Buttons
                label={msg('process.ccdcSlice.panel.retrieve.form.bandTypes.label')}
                input={inputs.bandTypes}
                multiple
                options={bandTypeOptions}
                framed/>
        )
    }

    renderSegmentBands() {
        const {segmentBands, inputs} = this.props
        const bands = segmentBands.map(({name}) => name)
        const options = [
            {
                value: 'tStart',
                label: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tStart.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tStart.tooltip')
            },
            {
                value: 'tEnd',
                label: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tEnd.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tEnd.tooltip')
            },
            {
                value: 'tBreak',
                label: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tBreak.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tBreak.tooltip')
            },
            {
                value: 'numObs',
                label: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.numObs.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.numObs.tooltip')
            },
            {
                value: 'changeProb',
                label: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.changeProb.label'),
                tooltip: msg('process.ccdcSlice.panel.retrieve.form.segmentBands.changeProb.tooltip')
            }
        ].filter(({value}) => bands.includes(value))
        return options.length
            ? (
                <Form.Buttons
                    label={msg('process.ccdcSlice.panel.retrieve.form.segmentBands.label')}
                    tooltip={msg('process.ccdcSlice.panel.retrieve.form.segmentBands.tooltip')}
                    input={inputs.segmentBands}
                    multiple
                    options={options}
                    framed/>
            )
            : null
    }

    renderScale() {
        const {inputs: {scale}} = this.props
        return (
            <NumberButtons
                label={msg('process.retrieve.form.scale.label')}
                placeholder={msg('process.retrieve.form.scale.placeholder')}
                input={scale}
                options={[1, 5, 10, 15, 20, 30, 60, 100]}
                suffix={msg('process.retrieve.form.scale.suffix')}
                errorMessage
            />
        )
    }

    renderWorkspacePath() {
        const {inputs: {workspacePath}} = this.props
        return (
            <Form.Input
                label={msg('process.retrieve.form.workspacePath.label')}
                placeholder={msg('process.retrieve.form.workspacePath.tooltip')}
                tooltip={msg('process.retrieve.form.workspacePath.tooltip')}
                input={workspacePath}
            />
        )
    }

    renderAssetId() {
        const {assetRoots, inputs: {assetId}} = this.props
        return (
            <Form.Input
                label={msg('process.retrieve.form.assetId.label')}
                placeholder={msg('process.retrieve.form.assetId.tooltip')}
                tooltip={msg('process.retrieve.form.assetIt.tooltip')}
                input={assetId}
                busyMessage={!assetRoots}
                disabled={!assetRoots}
            />
        )
    }
    componentDidMount() {
        const {inputs: {destination, crs, crsTransform, scale, shardSize, tileSize}} = this.props
        this.setState({more: !!((crs.value || crsTransform.value || scale.value || shardSize.value || tileSize.value) &&
        !_.isEqual(
            [defaultCrs, defaultScale, defaultShardSize, defaultTileSize],
            [crs.value, scale.value, shardSize.value, tileSize.value]
        )
        )})
        if (!destination.value) {
            destination.set('SEPAL')
        }
        if (!crs.value) {
            crs.set(defaultCrs)
        }
        if (!scale.value) {
            scale.set(defaultScale)
        }
        if (!shardSize.value) {
            shardSize.set(defaultShardSize)
        }
        if (!tileSize.value) {
            tileSize.set(defaultTileSize)
        }
        this.update()
    }

    componentDidUpdate() {
        this.update()
    }

    update() {
        const {toEE, toSepal, user, inputs: {destination, assetType}} = this.props
        if (toSepal && !destination.value) {
            destination.set('SEPAL')
        } else if (user.googleTokens && toEE && !destination.value) {
            destination.set('GEE')
        }
        if (!assetType.value && destination.value === 'GEE') {
            assetType.set('Image')
        }
    }

    retrieve(values) {
        const project = this.findProject()
        const {assetId, workspacePath} = values
        updateProject({
            ...project,
            defaultAssetFolder: assetId ? Path.dirname(assetId) : project.defaultAssetFolder,
            defaultWorkspaceFolder: workspacePath ? Path.dirname(workspacePath) : project.defaultWorkspaceFolder
        })
        this.recipeActions.retrieve(values).dispatch()
    }

    findProject() {
        const {projects, projectId} = this.props
        return projects.find(({id}) => id === projectId)
    }

}

export const Retrieve = compose(
    _Retrieve,
    connect(mapStateToProps),
    recipeFormPanel({id: 'retrieve', fields, mapRecipeToProps})
)
