const Path = require('path')
const {isChildOf, isFile} = require('./filesystem')
const {GITHUB_ROOT, LOCAL_CRAN_REPO, libPath} = require('./config')
const {runScript} = require('./script')
const log = require('sepal/log').getLogger('github')

const isGitHubRepoPath = path =>
    isChildOf(GITHUB_ROOT, path)

const getGitHubRepoPath = (section, path = '') => {
    if (!['src', 'bin'].includes(section)) {
        throw new Error('Illegal section:', section)
    }
    const repoPath = Path.join(GITHUB_ROOT, section, path)
    if (!isGitHubRepoPath(repoPath)) {
        throw new Error('Illegal path:', path)
    }
    return repoPath
}

const getGitHubPackageInfo = path => {
    const GITHUB_MATCHER = /^\/github\/(([^/]+)\/([^/]*)(.*)\.tar\.gz)/
    const result = path.match(GITHUB_MATCHER)
    if (result) {
        const [_, path, user, name, ref] = result
        return {path, user, name, ref}
    }
    return null
}

const isGitHubPackageSourceCached = async path =>
    isFile(getGitHubRepoPath('src', path))

const getGitHubTarget = path =>
    `https://github.com/${path}`

const installLocalPackage = async (name, path) => {
    try {
        log.debug(`Installing ${name} (${path})`)
        await runScript('install_local_package.r', [name, path, libPath, LOCAL_CRAN_REPO])
        log.info(`Installed ${name} (${path})`)
        return true
    } catch (error) {
        log.warn(`Could not install ${name} (${path})`, error)
        return false
    }
}
        
const installRemotePackage = async (name, url) => {
    try {
        log.debug(`Installing ${name} (${url})`)
        await runScript('install_remote_package.r', [name, url, libPath, LOCAL_CRAN_REPO])
        log.info(`Installed ${name} (${url})`)
        return true
    } catch (error) {
        log.warn(`Could not install ${name} (${url})`, error)
        return false
    }
}
        
const bundleGitHubPackage = async (name, path) => {
    try {
        log.debug(`Bundling ${name} (${path})`)
        await runScript('bundle_github_package.sh', [name, path, libPath, GITHUB_ROOT], {showStdOut: true, showStdErr: true})
        log.info(`Bundled ${name} (${path})`)
        return true
    } catch (error) {
        log.warn(`Could not bundle ${name} (${path})`, error)
        return false
    }
}
    
const ensureGitHubPackageInstalled = async (name, path) =>
    await isGitHubPackageSourceCached(path)
        ? await installLocalPackage(name, getGitHubRepoPath('src', path))
        : await installRemotePackage(name, getGitHubTarget(path))
        
const makeGitHubPackage = async (name, path) =>
    await ensureGitHubPackageInstalled(name, path) && await bundleGitHubPackage(name, path)
    
module.exports = {getGitHubRepoPath, getGitHubPackageInfo, getGitHubTarget, makeGitHubPackage}
