package org.openforis.sepal.component.processingrecipe.migration

class TimeSeriesMigrations extends AbstractMigrations {
    TimeSeriesMigrations() {
        super('TIME_SERIES')
        addMigration(5, {Map r ->
            r.model.options.cloudDetection = r.model.options.cloudMasking == 'AGGRESSIVE'
                    ? ['QA', 'CLOUD_MASK']
                    : ['QA']
            return r
        })
    }
}
