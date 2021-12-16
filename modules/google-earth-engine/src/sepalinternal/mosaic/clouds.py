import ee
from sepal.ee.image import select_and_add_missing

from ..image_operation import ImageOperation


def mask_clouds(mosaic_def, collection):
    if not mosaic_def.mask_clouds:
        reduced = collection.select('cloud') \
            .reduce(ee.Reducer.sum()
            .combine(ee.Reducer.count(), "", True)
            .combine(ee.Reducer.min(), "", True))
        # Proportion of pixels that are cloudy
        cloud_proportion = select_and_add_missing(reduced, ['cloud_sum']) \
            .divide(select_and_add_missing(reduced, ['cloud_count']))
        # A representative proportion of pixels that are cloudy cloudy for the neighborhood
        normal_cloud_proportion = cloud_proportion.reproject(crs='EPSG:4326', scale=10000) \
            .max(cloud_proportion.reproject(crs='EPSG:4326', scale=20000))
        # Measure of how a locations cloud proportion differs from the general area
        cloud_proportion_diff = cloud_proportion.subtract(normal_cloud_proportion)
        only_clouds = select_and_add_missing(reduced, ['cloud_min'])

        # When there is higher proportion of clouds than the normally, keep the clouds.
        # It's probably something (typically buildings) misclassified as clouds.
        # Also, don't trust the cloud classification enough to completely mask area with only clouds
        # Desert sand can be classified as cloud.
        keep_clouds = cloud_proportion_diff.gt(0.4).And(normal_cloud_proportion.lt(0.3))
        keep_clouds = keep_clouds.Or(only_clouds)
    else:
        keep_clouds = False

    return collection.map(lambda image: _MaskClouds(image, mosaic_def).apply(keep_clouds))


class _MaskClouds(ImageOperation):
    def __init__(self, image, mosaic_def):
        super(_MaskClouds, self).__init__(image)
        self.mosaic_def = mosaic_def

    def apply(self, keep_clouds):
        cloud_free = self.toImage('!i.cloud')
        buffer_meters = self.mosaic_def.cloud_buffer
        if buffer_meters:
            cloud_free = buffer_mask(self.toImage('!i.cloud'), buffer_meters).And(cloud_free)
        to_mask = self.image.select('toMask')
        if keep_clouds:
            mask = to_mask.Not().And(cloud_free.Or(keep_clouds))
        else:
            mask = to_mask.Not().And(cloud_free)
        return self.image.updateMask(mask)


def buffer_mask(mask, meters):
    cloud = mask.Not()
    min_cloud_radius = 50

    # Clouds with radius < min_cloud_radius will not have any inner pixels, and will not get buffered
    inner_pixel = mask \
        .fastDistanceTransform(256, 'pixels').sqrt() \
        .multiply(ee.Image.pixelArea().sqrt()) \
        .gt(min_cloud_radius) \
        .And(cloud)

    distance_to_inner_pixel = inner_pixel \
        .fastDistanceTransform(256, 'pixels').sqrt() \
        .multiply(ee.Image.pixelArea().sqrt())

    return distance_to_inner_pixel \
        .lt(ee.Number(meters).add(min_cloud_radius)) \
        .Or(cloud) \
        .Not()
