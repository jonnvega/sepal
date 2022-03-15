package integration.datasearch

import org.openforis.sepal.component.datasearch.adapter.CsvBackedUsgsGateway
import org.openforis.sepal.component.datasearch.api.SceneMetaData
import org.openforis.sepal.util.CsvReader
import spock.lang.Ignore
import spock.lang.Specification
import java.text.SimpleDateFormat

import static org.openforis.sepal.component.datasearch.adapter.CsvBackedUsgsGateway.Sensor.LANDSAT_OT

class CsvBackedUsgsGatewayTest extends Specification {
    def workingDir = File.createTempDir()
    def sceneId = 'LC80390222013076EDC00'
    def sceneId2 = 'LE70390222013076EDC00'

    def cleanup() {
        workingDir.deleteDir()
    }

    def 'Uninitialized and no csv sources, when iterating, no scenes are returned'() {
        def gateway = new CsvBackedUsgsGateway(workingDir, [:], [:])
        def updates = []

        when:
        gateway.eachSceneUpdatedSince([:]) {
            updates << it
        }
        then:
        updates.empty
    }

    def 'Uninitialized and init source, when iterating, scenes are returned'() {
        def gateway = new CsvBackedUsgsGateway(workingDir, [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId): new Date())]], [:])

        when:
        def updates = iterate(gate∫way, [:])

        then:
        updates.size() == 1
        def scenes = updates.first()
        scenes.size() == 1
        def scene = scenes.first()
        scene.id == sceneId
        scene.dataSet == 'LANDSAT_8'
    }

    def 'Uninitialized and sources, when iterating, only init sources are used'() {
        def gateway = new CsvBackedUsgsGateway(workingDir,
                [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId): new Date())]],
                [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId2): new Date())]])

        when:
        def updates = iterate(gateway, [:])

        then:
        updates.size() == 1
        def scenes = updates.first()
        scenes.size() == 1
        scenes.first().id == sceneId
    }

    def 'Initialized and last update same as acquisition date, when iterating, scene is returned'() {
        initAll()
        def acquisitionDate = new Date()
        def gateway = new CsvBackedUsgsGateway(workingDir,
                [:],
                [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId): acquisitionDate)]])

        when:
        def updates = iterate(gateway, [(LANDSAT_OT.name()): acquisitionDate])

        then:
        updates.size() == 1
        def scenes = updates.first()
        scenes.size() == 1
        scenes.first().id == sceneId
    }

    def 'Initialized and last update between acquisition dates, when iterating, scene with new date is returned'() {
        initAll()
        def lastUpdated = new Date() - 10
        def gateway = new CsvBackedUsgsGateway(workingDir,
                [:],
                [(LANDSAT_OT.name()): [new FakeCsvReader(
                        (sceneId): lastUpdated + 1,
                        (sceneId2): lastUpdated - 1,
                )]])

        when:
        def updates = iterate(gateway, [(LANDSAT_OT.name()): lastUpdated])

        then:
        updates.size() == 1
        def scenes = updates.first()
        scenes.size() == 1
        scenes.first().id == sceneId
    }

    def 'Given successfully iterated unititialized, when iterating, initialized sources are used'() {
        def gateway = new CsvBackedUsgsGateway(workingDir,
                [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId): new Date())]],
                [(LANDSAT_OT.name()): [new FakeCsvReader((sceneId2): new Date())]])

        iterate(gateway, [:])

        when:
        def updates = iterate(gateway, [(LANDSAT_OT.name()): new Date() - 10])

        then:
        updates.size() == 1
        def scenes = updates.first()
        scenes.size() == 1
        scenes.first().id == sceneId2
    }

    private List<List<SceneMetaData>> iterate(CsvBackedUsgsGateway gateway, Map lastUpdateBySensor) {
        def updates = []
        gateway.eachSceneUpdatedSince(lastUpdateBySensor) {
            updates << it
        }
        return updates
    }

    private initAll() {
        new CsvBackedUsgsGateway(workingDir, [:], [:]).eachSceneUpdatedSince([:]) {}
    }

    private static class FakeCsvReader implements CsvReader {
        private final Map<String, Date> acquisitionDateById

        FakeCsvReader(Map<String, Date> acquisitionDateById) {
            this.acquisitionDateById = acquisitionDateById
        }

        void eachLine(Closure callback) {
            acquisitionDateById.each { id, acquisitionDate ->
                callback.call(metaData(id, acquisitionDate))

            }
        }

        private Map metaData(String id, Date acquisitionDate) {
            [
                    'Landsat Scene Identifier': id,
                    'WRS Path': '123',
                    'WRS Row': '123',
                    'Date Acquired': toDateString(acquisitionDate),
                    'Scene Cloud Cover L1': 1.2,
                    'Sun Azimuth L0RA': 100.2,
                    'Sun Elevation L0RA': 40.2,
                    'Browse Link': 'http://browse.url',
                    'Date Product Generated L1': toDateString(acquisitionDate),
                    'Collection Category': 'T1',
                    'Day/Night Indicator': 'DAY'
            ]
        }

        private String toDateString(date) {
            new SimpleDateFormat('yy/MM/dd').format(date)
        }
    }
}
