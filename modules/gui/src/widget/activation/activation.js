import {selectFrom} from 'stateUtils'
import _ from 'lodash'

const parentPathList = pathList =>
    pathList.slice(0, -2)

export const collectActivatables = (state, pathList) => {
    const selectActivatables = pathList =>
        selectFrom(state, [pathList, 'activatables'])

    const childrenActivatables = pathList => {
        const childContexts = selectFrom(state, [pathList, 'contexts'])
        return _(childContexts)
            .mapValues((childContext, id) => ({
                ...childrenActivatables([pathList, 'contexts', id]),
                ...childContext.activatables
            }))
            .values()
            .reduce((acc, activatables) => ({...acc, ...activatables}), {})

    }

    const parentActivatables = pathList => {
        const parent = parentPathList(pathList)
        return parent.length > 2
            ? {...parentActivatables(parent), ...selectActivatables(parent)}
            : {} // pathList points to root, which has no parents
    }

    return {
        ...parentActivatables(pathList),
        ...childrenActivatables(pathList),
        ...selectActivatables(pathList),
    }
}
