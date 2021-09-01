import {normalize} from 'app/home/map/visParams/visParams'

export const getPreSetVisualizations = () => Object.values(visualizations).flat()

export const visualizations = {
    BAND_COMBINATIONS: [
        normalize({
            type: 'rgb',
            bands: ['red', 'green', 'blue'],
            min: [300, 100, 0],
            max: [2500, 2500, 2300],
            gamma: [1.3, 1.3, 1.3]
        }),
        normalize({
            type: 'rgb',
            bands: ['nir', 'red', 'green'],
            min: [500, 200, 100],
            max: [5000, 2400, 2500],
        })
    ],
    INDEXES: [
        normalize({type: 'continuous', bands: ['ndvi'], min: [-10000], max: [10000], palette: ['#112040', '#1c67a0', '#6db6b3', '#fffccc', '#abac21', '#177228', '#172313']})
    ]
}
