import {Combo} from 'widget/combo'
import {Shape} from 'widget/shape'
import {compose} from 'compose'
import {connect, select} from 'store'
import React from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'

const mapStateToProps = () => ({
    projects: select('process.projects') ?? [],
    projectId: select('process.projectId')
})

class _SelectProject extends React.Component {
    selectProject(projectId) {
        projectId
            ? actionBuilder('SELECT_PROJECT', {projectId})
                .set('process.projectId', projectId)
                .dispatch()
            : actionBuilder('DESELECT_PROJECT')
                .del('process.projectId')
                .dispatch()
    }

    getSelectedProject() {
        const {projects, projectId} = this.props
        return _.find(projects, ({id}) => id === projectId)
    }

    getLabel() {
        const selectedProject = this.getSelectedProject()
        return selectedProject?.name
    }

    render() {
        const {projects, projectId} = this.props
        const options = projects.map(project => ({value: project.id, label: project.name}))
        const selectedOption = _.find(options, ({value: currentProjectId}) => currentProjectId === projectId)
        return (
            <Shape
                look='transparent'
                size='large'
                shape='pill'>
                <Combo
                    value={selectedOption ? selectedOption.value : {}}
                    options={options}
                    placeholder='All projects'
                    allowClear
                    border={false}
                    onChange={option => this.selectProject(option?.value)}
                />
            </Shape>
        )
    }
}

export const SelectProject = compose(
    _SelectProject,
    connect(mapStateToProps)
)