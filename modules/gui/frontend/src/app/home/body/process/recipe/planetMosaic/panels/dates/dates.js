import {Form} from 'widget/form/form'
import {Layout} from 'widget/layout'
import {Panel} from 'widget/panel/panel'
import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {compose} from 'compose'
import {maxDate, minDate, momentDate} from 'widget/form/datePicker'
import {msg} from 'translate'
import React from 'react'
import moment from 'moment'
import styles from './dates.module.css'

const fields = {
    type: new Form.Field(),
    fromDate: new Form.Field(),
    toDate: new Form.Field(),
}

class Dates extends React.Component {
    render() {
        return (
            <RecipeFormPanel
                className={styles.panel}
                placement='bottom-right'>
                <Panel.Header
                    icon='calendar-alt'
                    title={msg('process.planetMosaic.panel.dates.title')}/>
                <Panel.Content>
                    <Layout>
                        {this.renderDateRange()}
                    </Layout>
                </Panel.Content>
                <Form.PanelButtons/>
            </RecipeFormPanel>
        )
    }

    renderDateRange() {
        const {inputs: {fromDate, toDate}} = this.props
        const [fromStart, fromEnd] = fromDateRange(toDate.value)
        const [toStart, toEnd] = toDateRange(fromDate.value)
        return (
            <Layout type='horizontal'>
                <Form.DatePicker
                    label={msg('process.planetMosaic.panel.dates.form.fromDate.label')}
                    input={fromDate}
                    startDate={fromStart}
                    endDate={fromEnd}/>
                <Form.DatePicker
                    label={msg('process.planetMosaic.panel.dates.form.toDate.label')}
                    input={toDate}
                    startDate={toStart}
                    endDate={toEnd}/>
            </Layout>
        )
    }
}

Dates.propTypes = {}

const fromDateRange = toDate => {
    const dayBeforeToDate = momentDate(toDate).subtract(1, 'day')
    return [
        '2013-04-01',
        minDate(moment(), dayBeforeToDate)
    ]
}

const toDateRange = fromDate => {
    const dayAfterFromDate = momentDate(fromDate).add(1, 'day')
    return [
        maxDate('2013-04-01', dayAfterFromDate),
        moment()
    ]
}

export default compose(
    Dates,
    recipeFormPanel({id: 'dates', fields})
)
