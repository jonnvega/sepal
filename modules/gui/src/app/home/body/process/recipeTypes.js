import ccdc from './recipe/ccdc/ccdc'
import ccdcSlice from './recipe/ccdcSlice/ccdcSlice'
import changeAlerts from './recipe/changeAlerts/changeAlerts'
import classChange from './recipe/classChange/classChange'
import classification from './recipe/classification/classification'
import indexChange from './recipe/indexChange/indexChange'
import opticalMosaic from './recipe/opticalMosaic/opticalMosaic'
import phenology from './recipe/phenology/phenology'
import planetMosaic from './recipe/planetMosaic/planetMosaic'
import radarMosaic from './recipe/radarMosaic/radarMosaic'
import remapping from './recipe/remapping/remapping'
import timeSeries from './recipe/timeSeries/timeSeries'

export const listRecipeTypes = () => ([
    opticalMosaic(),
    radarMosaic(),
    planetMosaic(),
    classification(),
    timeSeries(),
    ccdc(),
    ccdcSlice(),
    classChange(),
    indexChange(),
    remapping(),
    changeAlerts(),
    phenology()
])

export const getRecipeType = id => listRecipeTypes().find(recipeType => recipeType.id === id)
