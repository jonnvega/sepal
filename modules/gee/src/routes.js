const {stream} = require('#sepal/httpServer')

const sceneAreas$ = require('#gee/jobs/ee/image/sceneAreas')
const preview$ = require('#gee/jobs/ee/image/preview')
const loadCCDCSegments$ = require('#gee/jobs/ee/ccdc/loadSegments')
const loadTimeSeriesbservations$ = require('#gee/jobs/ee/timeSeries/loadObservations')
const nextReferenceDataPoints$ = require('#gee/jobs/ee/classification/nextReferenceDataPoints')
const assetVisualizations$ = require('#gee/jobs/ee/image/assetVisualizations')
const imageBands$ = require('#gee/jobs/ee/image/bands')
const imageHistogram$ = require('#gee/jobs/ee/image/histogram')
const distinctBandValues$ = require('#gee/jobs/ee/image/distinctBandValues')
const assetMetadata$ = require('#gee/jobs/ee/asset/metadata')
const projects$ = require('#gee/jobs/ee/projects')
const listAssets$ = require('#gee/jobs/ee/asset/list')
const createFolder$ = require('#gee/jobs/ee/asset/createFolder')
const listCompletedTasks$ = require('#gee/jobs/ee/task/listCompleted')
const imageBounds$ = require('#gee/jobs/ee/image/bounds')
const imageGeometry$ = require('#gee/jobs/ee/image/geometry')
const sampleImage$ = require('#gee/jobs/ee/image/sample')
const aoiBounds$ = require('#gee/jobs/ee/aoi/bounds')
const tableColumns$ = require('#gee/jobs/ee/table/columns')
const tableColumnValues$ = require('#gee/jobs/ee/table/columnValues')
const tableRows$ = require('#gee/jobs/ee/table/rows')
const tableQuery$ = require('#gee/jobs/ee/table/query')
const tableMap$ = require('#gee/jobs/ee/table/map')
const datasets$ = require('#gee/jobs/datasets/datasets')
const check$ = require('#gee/jobs/ee/check')

module.exports = router =>
    router
        .post('/sceneareas', stream(ctx => sceneAreas$(ctx)))
        .post('/preview', stream(ctx => preview$(ctx)))
        .post('/bands', stream(ctx => imageBands$(ctx)))
        .post('/image/assetVisualizations', stream(ctx => assetVisualizations$(ctx)))
        .post('/image/histogram', stream(ctx => imageHistogram$(ctx)))
        .post('/image/distinctBandValues', stream(ctx => distinctBandValues$(ctx)))
        .post('/image/sample', stream(ctx => sampleImage$(ctx)))
        .post('/assetMetadata', stream(ctx => assetMetadata$(ctx)))
        .get('/projects', stream(ctx => projects$(ctx)))
        .get('/asset/list', stream(ctx => listAssets$(ctx)))
        .post('/asset/createFolder', stream(ctx => createFolder$(ctx)))
        .get('/task/listCompleted', stream(ctx => listCompletedTasks$(ctx)))
        .post('/recipe/geometry', stream(ctx => imageGeometry$(ctx)))
        .post('/recipe/bounds', stream(ctx => imageBounds$(ctx)))
        .post('/aoi/bounds', stream(ctx => aoiBounds$(ctx)))
        .post('/ccdc/loadSegments', stream(ctx => loadCCDCSegments$(ctx)))
        .post('/timeSeries/loadObservations', stream(ctx => loadTimeSeriesbservations$(ctx)))
        .post('/nextReferenceDataPoints', stream(ctx => nextReferenceDataPoints$(ctx)))
        .get('/table/rows', stream(ctx => tableRows$(ctx)))
        .get('/table/columns', stream(ctx => tableColumns$(ctx)))
        .get('/table/columnValues', stream(ctx => tableColumnValues$(ctx)))
        .post('/table/query', stream(ctx => tableQuery$(ctx)))
        .get('/table/map', stream(ctx => tableMap$(ctx)))
        .get('/datasets', stream(ctx => datasets$(ctx)))
        .get('/healthcheck', stream(ctx => check$(ctx)))
