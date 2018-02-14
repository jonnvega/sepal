module.exports = function override(config, env) {
    // const fs = require('fs')
    // const _ = require('lodash')
    // const flat = require('flat')
    // const locales = fs.readdirSync('src/locale').filter((name) => /^[^\\.]/.test(name))
    // const messages = {}
    //
    // locales.map((locale) =>
    //     messages[locale] = require(`locale/${locale}/translations.json`)
    // )
    //
    // _.chain(locales)
    //     .map((locale) => require(`locale/${locale}/translations.json`))
    //     .map((messages) =>
    //         _.chain(flat.flatten(messages))
    //             .pickBy(_.identity)
    //             .keys()
    //             .value())
    //     .tap(console.log)
    //     .intersectionBy()
    //     .tap(console.log)
    //     .value()
    
    const fs = require('fs')
    const _ = require('lodash')
    const flat = require('flat')
    const locales = fs.readdirSync('src/locale').filter((name) => /^[^\\.]/.test(name))
    
    const keys = _.chain(locales)
        .map((locale) => require(`./src/locale/${locale}/translations`))
        .map((messages) =>
            _.chain(flat.flatten(messages))
                .pickBy(_.identity)
                .keys()
                .value())
        .value()
    
    const incompleteKeys = _.difference(_.union(...keys), _.intersection(...keys))
    if (incompleteKeys)
        throw `Missing translations: \n${incompleteKeys.join('\n')}`

    configureCssModuleLoader(config.module.rules)
    return config

    function configureImportsLoaders(importsLoaders) {
        Object.keys(importsLoaders).forEach(path =>
            config.module.rules = (config.module.rules || []).concat({
                test: require.resolve(path),
                enforce: 'pre',
                use: 'imports-loader?' + importsLoaders[path]
            })
        )
    }

    /**
     * Find the /\.css$/ matching rule with a css-loader.
     * Exclude /\.module\.css$/.
     * Clone it to match /\.module\.css$/, and enable module support.
     */
    function configureCssModuleLoader(o) {
        if (o instanceof Array)
            return o.find((item, i) => {
                if (item instanceof Object && 'test' in item && String(item.test) === '/\\.css$/') {
                    const cssLoader = findCssLoader(item)
                    if (cssLoader) {
                        const loaders = o
                        const globalCssConfig = item
                        const moduleCssConfig = JSON.parse(JSON.stringify(globalCssConfig))

                        globalCssConfig.exclude = /\.module\.css$/
                        moduleCssConfig.test = /\.module\.css$/
                        loaders.splice(i, 0, moduleCssConfig)

                        const cssModuleLoader = findCssLoader(moduleCssConfig)
                        cssModuleLoader.options.modules = true
                        cssModuleLoader.options.localIdentName = '[name]__[local]___[hash:base64:5]'
                        return globalCssConfig
                    } else
                        return null
                } else
                    configureCssModuleLoader(item)
            })
        else if (o instanceof Object)
            return Object.keys(o).find((key) => configureCssModuleLoader(o[key]))
        else
            return null
    }

    function findCssLoader(o) {
        if (o instanceof Array) {
            return o
                .map((item) => findCssLoader(item))
                .filter((item) => item)
                .find((item) => item)
        } else if (o instanceof Object) {
            if ('loader' in o && o.loader.indexOf('/css-loader/') > -1)
                return o
            else
                return Object.keys(o).map((key) => findCssLoader(o[key]))
                    .filter((item) => item)
                    .find((item) => item)
        } else
            return null
    }

}

