import { get$, postJson$ } from '~/http-client'

export default {
    login$: ({email, password}) =>
        postJson$('https://app.collect.earth/login', {
            body: {email, password},
            maxRetries: 0
        }),
    getInstitutionProjects$: ({institutionId, token}) => 
        get$(`https://app.collect.earth/get-institution-projects?institutionId=${institutionId}`, {
            headers: {
                'Cookie': `ring-session=${token}`
            }
        }),
    getAllInstitutions$: ({token}) => 
        get$(`https://app.collect.earth/get-all-institutions`, {
            headers: {
                'Cookie': `ring-session=${token}`
            }
        }),
    gSampleData$: ({projectId, token}) => 
        get$(`https://app.collect.earth/dump-project-raw-data?projectId=${projectId}`, {
            headers: {
                'Cookie': `ring-session=${token}`
            }
        })
}
