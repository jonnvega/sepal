import ansi from 'ansi'
import chalk from 'chalk'
import {deps, groups, NAME_COLUMN, STATUS_COLUMN, DEPS_COLUMN, GROUP_PREFIX, SEPAL_SRC, ENV_FILE} from './config.js'
import {log} from './log.js'
import {exec} from './exec.js'
import {getBuildDeps, getDirectRunDepList, getDirectRunDeps, getInverseRunDeps} from './deps.js'
import _ from 'lodash'
import {stat} from 'fs/promises'
import Path from 'path'

const cursor = ansi(process.stdout)

export const STATUS = {
    UNDEFINED: 'UNDEFINED',
    NON_RUNNABLE: 'NON_RUNNABLE',
    BUILDING: 'BUILDING',
    BUILT: 'BUILT',
    STARTING: 'STARTING',
    RUNNING: 'RUNNING',
    STOPPING: 'STOPPING',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR',
    UPDATING_PACKAGES: 'UPDATING_PACKAGES',
    UPDATED_PACKAGES: 'UPDATED_PACKAGES',
    INSTALLING_PACKAGES: 'INSTALLING_PACKAGES',
    INSTALLED_PACKAGES: 'INSTALLED_PACKAGES',
    SKIPPED: 'SKIPPED'
}

export const MESSAGE = {
    UNDEFINED: chalk.grey('UNDEFINED'),
    NON_RUNNABLE: chalk.grey('NON-RUNNABLE'),
    BUILDING: chalk.green('BUILDING...'),
    BUILT: chalk.greenBright('BUILT'),
    STARTING: chalk.green('STARTING...'),
    STOPPING: chalk.red('STOPPING...'),
    STOPPED: chalk.redBright('STOPPED'),
    ERROR: chalk.bgRed('ERROR'),
    UPDATING_PACKAGES: chalk.magenta('UPDATING PACKAGES...'),
    UPDATED_PACKAGES: chalk.magentaBright('UPDATED PACKAGES'),
    INSTALLING_PACKAGES: chalk.magenta('INSTALLING PACKAGES...'),
    INSTALLED_PACKAGES: chalk.magentaBright('INSTALLED PACKAGES'),
    SKIPPED: chalk.grey('SKIPPED'),
    RUNNING: chalk.greenBright('RUNNING'),
    EXITED: chalk.redBright('EXITED'),
    RESTARTING: chalk.yellowBright('RESTARTING'),
    HEALTH: {
        HEALTHY: chalk.greenBright('HEALTHY'),
        UNHEALTHY: chalk.redBright('UNHEALTHY'),
        STARTING: chalk.yellowBright('STARTING')
    }
}
const formatModule = (module, {pad = true} = {}) =>
    chalk.cyanBright(pad ? module : module)

const formatService = service =>
    chalk.whiteBright(service)

const formatDeps = modules => {
    const deps = modules.map(
        module => formatModule(module, {pad: false})
    )
    return deps.length ? `[${deps.join(', ')}]` : ''
}

const getAllModules = () =>
    Object.keys(deps)

const getBuildDependencyInfo = module => {
    const deps = getBuildDeps(module)
    return deps.length
        ? `based on ${formatDeps(deps)}`
        : null
}

const getDirectDependencyInfo = module => {
    const deps = getDirectRunDeps(module)
    return deps.length
        ? `uses ${formatDeps(deps)}`
        : null
}

const getInverseDependencyInfo = module => {
    const deps = getInverseRunDeps(module)
    return deps.length
        ? `used by ${formatDeps(deps)}`
        : null
}

const getDepInfo = (module, options = {}) =>
    _.compact([
        (options.dependencies || options.buildDependencies) ? getBuildDependencyInfo(module) : null,
        (options.dependencies || options.directDependencies) ? getDirectDependencyInfo(module) : null,
        (options.dependencies || options.inverseDependencies) ? getInverseDependencyInfo(module) : null
    ]).join(', ')

const expandGroup = group =>
    group === 'all' ? getAllModules() : groups[group] || []

const expandGroups = modules =>
    _(modules)
        .map(moduleOrGroup =>
            moduleOrGroup.startsWith(GROUP_PREFIX)
                ? expandGroup(moduleOrGroup.substring(GROUP_PREFIX.length))
                : moduleOrGroup
        )
        .flatten()
        .uniq()
        .value()

export const getModules = modules => {
    if (_.isEmpty(modules)) {
        const modules = expandGroups([':default'])
        return modules.length
            ? modules
            : getAllModules()
    } else {
        return expandGroups(_.castArray(modules))
    }
}

export const getServices = async module => {
    try {
        return JSON.parse(await exec({command: './script/docker-compose-ps.sh', args: [module, SEPAL_SRC, ENV_FILE]}))
            .map(
                ({Name: name, State: state, Health: health}) => ({name, state: state.toUpperCase(), health: health.toUpperCase()})
            )
    } catch (error) {
        log.error('Could not get health', error)
        return null
    }
}

const getBaseStatus = async modules => {
    const STATUS_MATCHER = /(\w+)\((\d+)\)/
    try {
        return JSON.parse(await exec({command: './script/docker-compose-ls.sh'}))
            .map(
                ({Name: module, Status: status}) => ({
                    module,
                    status: status
                        .toUpperCase()
                        .split(', ')
                        .map(foo => foo.replace(STATUS_MATCHER, (_ignore, state, count) => `${MESSAGE[state]} (${count})`))
                        .join(', ')
                })
            )
            .filter(
                ({module}) => modules.includes(module)
            )
    } catch (error) {
        log.error('Could not get status', error)
        return null
    }
}

const getExtendedStatus = async modules =>
    await Promise.all(
        modules
            .map(async module => {
                const services = await getServices(module)
                const status = _(services)
                    .groupBy('state')
                    .mapValues(
                        services => services.map(
                            ({name, health}) => `${formatService(name)}${health ? `: ${MESSAGE.HEALTH[health]}` : ''}`
                        )
                    )
                    .map(
                        (services, state) => `${MESSAGE[state]} [${services.join(', ')}]`
                    )
                    .sort()
                    .value()
                    .join(', ')
                return {module, services, status}
            })
    )

const getStatus = async (modules, extended) => {
    const status = extended
        ? await getExtendedStatus(modules)
        : await getBaseStatus(modules)
    return status.filter(({status}) => status.length)
}

export const showStatus = async (modules, options = {}) => {
    const sanitizedModules = _(getDirectRunDepList(getModules(modules), options.dependencies))
        .sort()
        .sortedUniq()
        .value()
    const status = await getStatus(sanitizedModules, options.extended)
    for (const module of sanitizedModules) {
        if (isModule(module)) {
            const moduleStatus = _.find(status, ({module: currentModule}) => currentModule === module)
            if (moduleStatus) {
                showModuleStatus(module, moduleStatus.status, {...options, sameLine: false})
            } else if (isRunnable(module)) {
                showModuleStatus(module, MESSAGE.STOPPED, options)
            } else {
                showModuleStatus(module, MESSAGE.NON_RUNNABLE, options)
            }
        }
    }
}

export const showModuleStatus = (module, status, options = {}) => {
    cursor
        .hide()
        .eraseLine()
        .horizontalAbsolute(NAME_COLUMN)
        .write(formatModule(module))
        .horizontalAbsolute(STATUS_COLUMN)
        .write(status)
        .horizontalAbsolute(DEPS_COLUMN)
        .write(getDepInfo(module, options))
    if (options.sameLine) {
        cursor.horizontalAbsolute(0)
    } else {
        cursor.write('\n')
    }
}
        
export const isModule = name => {
    const module = _.find(deps, (_, moduleName) => moduleName === name)
    if (!module) {
        showModuleStatus(name, MESSAGE.UNDEFINED)
    }
    return module
}

export const isRunnable = module =>
    (isModule(module) || {}).run

export const isServiceRunning = async (module, serviceName) => {
    const result = await getStatus([module], true)
    const services = _(result).get(['0', 'services'])
    if (services) {
        const service = services.find(({name}) => name === serviceName)
        return service && service.state === 'RUNNING'
    }
    return false
}

export const waitModuleRunning = async module =>
    new Promise((resolve, reject) => {
        const wait = async () => {
            const result = await getStatus([module], true)
            const services = _(result).get(['0', 'services'])
            await showStatus([module], {extended: true})
            if (services) {
                if (_.some(services, ({state, health}) => state === 'RUNNING' && health === 'UNHEALTHY')) {
                    return reject(`Cannot start module ${module}`)
                }
                if (_.every(services, ({state, health}) => state === 'RUNNING' && (health === '' || health === 'HEALTHY'))) {
                    return resolve()
                }
            }
            setTimeout(wait, 1000)
        }
        wait()
    })

export const isNodeModule = async absolutePath => {
    try {
        const stats = await stat(Path.join(absolutePath, 'package.json'))
        return stats.isFile()
    } catch (error) {
        if (error.code !== 'ENOENT') {
            log.error(error)
        }
        return false
    }
}

export const exit = reason => {
    cursor.reset().write('\n').show()
    if (reason.normal) {
        process.exit(0)
    } else if (reason.error) {
        const error = reason.error
        log.error(chalk.bgRed('Error'), error.stderr || error)
        process.exit(1)
    } else if (reason.interrupted) {
        log.info(chalk.yellow('Interrupted (SIGINT)'))
        process.exit(2)
    } else {
        log.info(chalk.redBright('Unsupported exit reason:'), reason)
        process.exit(3)
    }
}
