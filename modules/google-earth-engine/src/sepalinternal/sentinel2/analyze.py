from ..image_operation import ImageOperation


class Analyze(ImageOperation):
    def __init__(self, image, bands):
        super(Analyze, self).__init__(image)
        self.bands = bands

    def apply(self):
        self._mask_if_any_band_is_masked()
        self.setAll(self.image.divide(10000))
        bands = self.bands
        if not 'cirrus' in bands:
            self.set('cirrus', 0)
        self.set('cloud', 0)
        self.set('snow', 0)
        self.set('toMask', 0)
        return self.image

    def _mask_if_any_band_is_masked(self):
        has_masked = self.image.mask().reduce('min').eq(0)
        self.updateMask(has_masked.Not())
