import {SEPAL_SRC, ENV_FILE} from './config.js'
import {stop} from './stop.js'
import {exec} from './exec.js'
import {getModules, isModule, showModuleStatus, STATUS} from './utils.js'
import {getBuildDeps, getBuildRunDeps} from './deps.js'
import {log} from './log.js'
import _ from 'lodash'

const buildModule = async (module, options = {}, parent) => {
    try {
        if (isModule(module)) {
            await stop(module)
            await buildDeps(module)
            await startBuildDeps(module)
            showModuleStatus(module, STATUS.BUILDING)
            const buildOptions = _.compact([
                !options.cache && (!parent || options.recursive) ? '--no-cache' : null
            ])
            await exec({
                command: './script/docker-compose-build.sh',
                args: [module, SEPAL_SRC, ENV_FILE, ...buildOptions],
                showStdOut: !options.quiet
            })
            showModuleStatus(module, STATUS.BUILT)
            return true
        } else {
            return false
        }
    } catch (error) {
        showModuleStatus(module, STATUS.ERROR)
        log.error(error.stderr || error)
        return false
    }
}

const buildDeps = async module => {
    const deps = getBuildDeps(module)
    if (deps.length) {
        log.debug(`Build dependencies for module ${module}:`, deps)
        for (const dep of deps) {
            await buildModule(dep, module)
        }
    }
}

const startBuildDeps = async module => {
    const deps = getBuildRunDeps(module)
    if (deps.length) {
        log.debug(`Start build dependencies for module ${module}:`, deps)
        for (const dep of deps) {
            await startModule(dep, module)
        }
    }
}

export const build = async (modules, options) => {
    for (const module of getModules(modules)) {
        await buildModule(module, options)
    }
}