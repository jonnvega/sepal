import ee

from .gee import get_info


class Aoi:
    _table_by_data_set = {
        'LANDSAT': {
            'table_id': 'users/wiell/SepalResources/landsatSceneAreas',
            'id_column': 'name',
            'coordinates': lambda sceneArea: sceneArea[0]['coordinates'][0]
        },
        'SENTINEL_2': {
            'table_id': 'users/wiell/SepalResources/sentinel2SceneAreas',
            'id_column': 'name',
            'coordinates': lambda sceneArea: sceneArea[0]['coordinates'][0]
        }
    }

    def __init__(self, geometry, spec=None):
        self._geometry = geometry
        self.spec = spec

    @staticmethod
    def create(spec):
        """Creates an Aoi according to provided specs.

        :param spec: A dict specifying the Aoi
        :type spec: dict

        :return: An Aoi instance
        :rtype: Aoi
        """
        type = {
            'POLYGON': Polygon,
            'FUSION_TABLE': FusionTable,
            'EE_TABLE': EETable,
        }[spec['type']]
        return type(spec)

    def scene_areas(self, data_set):
        """Determines scene areas in the provided reference system this Aoi intersects.

        :param reference_system: The spatial reference system of the scene areas
        :return: A list of dicts scene areas
        :rtype: list
        """
        if data_set not in self._table_by_data_set:
            raise ValueError('Unsupported data set: ' + data_set)
        table = self._table_by_data_set[data_set]
        aoi = self._geometry
        scene_area_table = get_info(
            ee.FeatureCollection(table['table_id'])
                .filterBounds(aoi)
                .reduceColumns(ee.Reducer.toList(2), ['.geo', table['id_column']])
                .get('list')
        )
        scene_areas = [
            {
                'id': scene_area[1],
                'polygon': self._to_polygon(table, scene_area),
            }
            for scene_area in scene_area_table
        ]
        return scene_areas

    def _to_polygon(self, table, scene_area):
        return list(map(lambda lnglat: list(reversed(lnglat)), table['coordinates'](scene_area)))

    def geometry(self):
        """Gets the ee.Geometry of this Aoi.

        :return: The ee.Geometry
        :rtype: ee.Geometry
        """
        return self._geometry


class Polygon(Aoi):
    def __init__(self, spec):
        self.path = spec['path']
        geometry = ee.Geometry(ee.Geometry.Polygon(coords=[self.path]), opt_geodesic=False)
        Aoi.__init__(self, geometry, spec)

    def __str__(self):
        return 'Polygon(path: ' + self.path + ')'


class FusionTable(Aoi):
    def __init__(self, spec):
        self.table_name = spec['id']
        self.key_column = spec['keyColumn']
        table = ee.FeatureCollection('ft:' + self.table_name)
        number_column = is_number(spec['key']) and get_info(table)['columns'].get(self.key_column) == 'Number'
        self.value_column = float(spec['key']) if number_column else spec['key']

        self.feature_collection = table.filterMetadata(self.key_column, 'equals', self.value_column)
        geometry = self.feature_collection.geometry()
        Aoi.__init__(self, geometry, spec)

    def __str__(self):
        return 'FusionTable(table_name: ' + self.table_name \
               + ', key_column: ' + self.key_column \
               + ', value_column: ' + self.value_column + ')'



class EETable(Aoi):
    def __init__(self, spec):
        self.table_name = spec['id']
        self.key_column = spec['keyColumn']
        table = ee.FeatureCollection(self.table_name)
        self.value_column = spec['key']
        if self.key_column:
            filters = [ee.Filter.eq(self.key_column, self.value_column)]
            if is_number(self.value_column):
                filters.append(ee.Filter.eq(self.key_column, float(self.value_column)))
            self.feature_collection = table.filter(ee.Filter.Or(*filters))
        else:
            self.feature_collection = table
        geometry = self.feature_collection.geometry()
        Aoi.__init__(self, geometry, spec)

    def __str__(self):
        return 'EETable(table_name: ' + self.table_name \
               + ', key_column: ' + self.key_column \
               + ', value_column: ' + self.value_column + ')'


class AssetAoi(Aoi):
    def __init__(self, geometry, spec):
        Aoi.__init__(self, geometry, spec)


def is_number(s):
    try:
        float(s)
        return True
    except:
        pass

    try:
        import unicodedata
        unicodedata.numeric(s)
        return True
    except (TypeError, ValueError):
        pass

    return False
