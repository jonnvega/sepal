from ..image_spec import ImageSpec
from ..gee import get_info


class RecipeRef(ImageSpec):
    def __init__(self, sepal_api, spec, create_image_spec):
        super(RecipeRef, self).__init__()
        self.image_spec = create_image_spec(sepal_api, {'recipe': sepal_api.get_recipe(spec['recipe']['id'])})
        self.aoi = self.image_spec.aoi
        self.scale = self.image_spec.scale
        self.bands = get_info(self._ee_image().bandNames())

    def _ee_image(self):
        return self.image_spec._ee_image()
