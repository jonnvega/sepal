import {Button} from 'widget/button'
import {FileSelect} from '~/widget/fileSelect'
import {Form} from '~/widget/form'
import {FormCombo} from '~/widget/form/combo'
import {Icon} from '~/widget/icon'
import {Layout} from '~/widget/layout'
import {Panel} from '~/widget/panel/panel'
import {Widget} from '~/widget/widget'
import {compose} from '~/compose'
import {msg} from '~/translate'
import {parseCsvFile$} from '~/csv'
import {readClipboard} from 'clipboard'
import {uuid} from '~/uuid'
import {withActivatable} from '~/widget/activation/activatable'
import {withForm} from '~/widget/form/form'
import {withRecipe} from '../body/process/recipeContext'
import Color from 'color'
import React from 'react'
import _ from 'lodash'
import styles from './legendImport.module.css'

const fields = {
    rows: new Form.Field()
        .notEmpty(),
    name: new Form.Field()
        .notBlank(),
    valueColumn: new Form.Field()
        .notBlank(),
    labelColumn: new Form.Field()
        .notBlank(),
    colorColumnType: new Form.Field()
        .notBlank(),
    colorColumn: new Form.Field()
        .skip((v, {colorColumnType}) => colorColumnType !== 'single')
        .notBlank(),
    redColumn: new Form.Field()
        .skip((v, {colorColumnType}) => colorColumnType !== 'multiple')
        .notBlank(),
    greenColumn: new Form.Field()
        .skip((v, {colorColumnType}) => colorColumnType !== 'multiple')
        .notBlank(),
    blueColumn: new Form.Field()
        .skip((v, {colorColumnType}) => colorColumnType !== 'multiple')
        .notBlank()
}

class _LegendImport extends React.Component {
    state = {
        columns: undefined,
        rows: undefined,
        validMappings: undefined
    }

    constructor(props) {
        super(props)
        this.save = this.save.bind(this)
        this.onPaste = this.onPaste.bind(this)
    }

    render() {
        const {activatable: {deactivate}, form} = this.props
        const invalid = form.isInvalid()
        return (
            <Panel type='modal' className={styles.panel}>
                <Panel.Header
                    icon='file-import'
                    title={msg('map.legendBuilder.import.title')}
                />
                <Panel.Content>
                    {this.renderContent()}
                </Panel.Content>
                <Panel.Buttons>
                    <Panel.Buttons.Main>
                        <Panel.Buttons.Cancel
                            keybinding='Escape'
                            onClick={deactivate}
                        />
                        <Panel.Buttons.Apply
                            disabled={invalid}
                            keybinding='Enter'
                            onClick={this.save}
                        />
                    </Panel.Buttons.Main>
                </Panel.Buttons>
            </Panel>
        )
    }

    renderContent() {
        const {validMappings} = this.state
        return (
            <Layout>
                {this.renderFileSelect()}
                {validMappings ? this.renderForm() : null}
            </Layout>
        )
    }

    renderForm() {
        const {inputs: {colorColumnType}} = this.props
        return (
            <React.Fragment>
                {this.renderColorColumnType()}
                {colorColumnType.value === 'single'
                    ? this.renderMapping('colorColumn')
                    : (
                        <Layout type='horizontal-nowrap'>
                            {this.renderMapping('redColumn')}
                            {this.renderMapping('greenColumn')}
                            {this.renderMapping('blueColumn')}
                        </Layout>
                    )}
                <Layout type='horizontal'>
                    {this.renderMapping('valueColumn')}
                    {this.renderMapping('labelColumn')}
                </Layout>
            </React.Fragment>
        )
    }

    renderColorColumnType() {
        const {inputs: {colorColumnType}} = this.props
        return (
            <Form.Buttons
                label={msg('map.legendBuilder.import.colorColumnType.label')}
                tooltip={msg('map.legendBuilder.import.colorColumnType.tooltip')}
                input={colorColumnType}
                options={[
                    {value: 'single', label: msg('map.legendBuilder.import.colorColumnType.single')},
                    {value: 'multiple', label: msg('map.legendBuilder.import.colorColumnType.multiple')},
                ]}
            />
        )
    }

    renderMapping(name) {
        const {inputs} = this.props
        const {validMappings} = this.state
        const options = (validMappings[name] || []).map(column => ({value: column, label: column}))
        return (
            <FormCombo
                className={styles.field}
                input={inputs[name]}
                options={options}
                label={msg(['map.legendBuilder.import.column', name, 'label'])}
                placeholder={msg(['map.legendBuilder.import.column', name, 'placeholder'])}
                tooltip={msg(['map.legendBuilder.import.column', name, 'tooltip'])}
                onChange={({value}) => this.selectedColumn(name, value)}
            />
        )
    }

    renderFileSelect() {
        const {stream, inputs: {name}} = this.props
        return (
            <Widget label={msg('map.legendBuilder.import.file.label')}
                labelButtons={[
                    this.renderPasteButton()
                ]}
            >
                <FileSelect
                    single
                    onSelect={file => this.onSelectFile(file)}>
                    {name.value
                        ? <div>
                            {stream('LOAD_CSV_ROWS').active
                                ? <Icon name='spinner' className={styles.spinner}/>
                                : null}
                            {name.value}
                        </div>
                        : null
                    }
                </FileSelect>
            </Widget>
        )
    }

    renderPasteButton() {
        return (
            <Button
                key='paste'
                chromeless
                shape='none'
                icon='paste'
                tooltip={msg('map.legendBuilder.import.clipboard.tooltip')}
                onClick={this.onPaste}
            />
        )
    }

    onPaste() {
        readClipboard().then(
            clipboard => this.parse('clipboard', clipboard)
        )
    }

    componentDidUpdate(prevProps, prevState) {
        const {rows: prevRows} = prevState
        const {rows} = this.state
        if (rows !== prevRows) {
            this.setDefaults()
        }
    }

    selectedColumn(field, column) {
        const {inputs} = this.props;
        ['valueColumn', 'labelColumn', 'colorColumn', 'redColumn', 'blueColumn', 'greenColumn']
            .filter(f => f !== field)
            .forEach(f => {
                if (inputs[f].value === column) {
                    inputs[f].set(null) // TODO: This is not having any effect
                }
            })
    }

    setDefaults() {
        const {inputs} = this.props
        const {columns, rows} = this.state
        const validMappings = getValidMappings(columns, rows)
        this.setState({validMappings})
        const defaults = getDefaults(columns, rows, validMappings)
        Object.keys(defaults).forEach(field => inputs[field].set(defaults[field]))
    }

    onSelectFile(file) {
        this.parse(file.name, file)
    }

    parse(source, data) {
        const {stream, inputs: {name, rows: rowsInput}} = this.props
        name.set(source)
        stream('LOAD_CSV_ROWS',
            parseCsvFile$(data),
            ({columns, rows}) => {
                rowsInput.set(rows)
                this.setState({columns, rows})
            }
        )
    }

    save() {
        const {inputs, recipeActionBuilder, activatable: {deactivate}} = this.props
        const {
            rows,
            valueColumn,
            labelColumn,
            colorColumnType,
            colorColumn,
            redColumn,
            greenColumn,
            blueColumn
        } = inputs
        const entries = rows.value.map(row => ({
            id: uuid(),
            color: colorColumnType.value === 'single'
                ? Color(trim(row[colorColumn.value])).hex()
                : Color.rgb([
                    trim(row[redColumn.value]),
                    trim(row[greenColumn.value]),
                    trim(row[blueColumn.value])
                ]).hex(),
            value: trim(row[valueColumn.value]),
            label: trim(row[labelColumn.value])
        }))
        recipeActionBuilder('SET_IMPORTED_LEGEND_ENTRIES', {entries})
            .set('ui.importedLegendEntries', entries)
            .dispatch()
        deactivate()
    }
}

const policy = () => ({_: 'allow'})

const trim = value => _.isString(value) ? value.trim() : value

export const LegendImport = compose(
    _LegendImport,
    withActivatable({
        id: 'legendImport',
        policy,
        alwaysAllow: true
    }),
    withRecipe(),
    withForm({fields}),
)

export const getValidMappings = (columns, rows) => {
    const toInts = column => {
        return rows
            .map(row => {
                const value = row[column]
                try {
                    return _.isInteger(value)
                        ? value
                        : _.isInteger(parseInt(value))
                            ? parseInt(value)
                            : null
                } catch (_e) {
                    return false
                }
            })
            .filter(i => _.isInteger(i))
    }
    const valueColumn = columns.filter(column =>
        _.uniq(toInts(column)).length === rows.length
    )
    const labelColumn = columns.filter(column =>
        _.uniq(rows
            .map(row => _.isNaN(row[column])
                ? null
                : _.isNil(row[column]) ? null : row[column].toString().trim()
            )
            .filter(value => value)
        ).length === rows.length
    )
    const colorColumn = columns.filter(column =>
        _.uniq(rows
            .map(row => {
                try {
                    return Color(row[column].trim()).hex()
                } catch(_e) {
                    return false
                }
            })
            .filter(value => value)
        ).length === rows.length
    )
    const colorChannel = columns.filter(column =>
        toInts(column).length === rows.length
    )
    return ({valueColumn, labelColumn, colorColumn, redColumn: colorChannel, greenColumn: colorChannel, blueColumn: colorChannel})
}

export const getDefaults = (columns, rows, validMappings) => {
    const mappings = _.cloneDeep(validMappings)
    const selectedColumn = column => {
        if (!column) return
        Object.keys(mappings).forEach(key =>
            mappings[key] = mappings[key].filter(c => c !== column)
        )
    }

    const firstContaining = (columns, strings) =>
        columns.find(column => strings.find(s => column.toLowerCase().includes(s.toLowerCase())))

    const colorColumnType = mappings.colorColumn.length
        ? 'single'
        : (mappings.redColumn.length >= 4 &&
            mappings.greenColumn.length >= 4 &&
            mappings.blueColumn.length >= 4)
            ? 'multiple'
            : null

    const colorColumn = mappings.colorColumn.length
        ? mappings.colorColumn[0]
        : null
    selectedColumn(colorColumn)

    const valueColumn = mappings.valueColumn.length
        ? colorColumnType === 'single'
            ? mappings.valueColumn[0]
            : firstContaining(mappings.valueColumn, ['class', 'value', 'type'])
        : null
    selectedColumn(valueColumn)

    const labelColumn = mappings.labelColumn.length
        ? firstContaining(mappings.labelColumn, ['desc', 'label', 'name'])
        : null
    selectedColumn(labelColumn)

    const redColumn = mappings.redColumn.length
        ? firstContaining(mappings.redColumn, ['red'])
        : null
    selectedColumn(redColumn)

    const greenColumn = mappings.greenColumn.length
        ? firstContaining(mappings.greenColumn, ['green'])
        : null
    selectedColumn(greenColumn)

    const blueColumn = mappings.blueColumn.length
        ? firstContaining(mappings.blueColumn, ['blue'])
        : null
    selectedColumn(blueColumn)

    return _.transform({
        valueColumn,
        labelColumn,
        colorColumnType,
        colorColumn,
        redColumn,
        greenColumn,
        blueColumn
    }, (defaults, value, key) => {
        if (value) {
            defaults[key] = value
        }
        return defaults
    })
}
