package org.openforis.sepal.taskexecutor

import groovymvc.security.BasicRequestAuthenticator
import groovymvc.security.PathRestrictions
import org.openforis.sepal.taskexecutor.endpoint.Endpoints
import org.openforis.sepal.taskexecutor.endpoint.LdapUsernamePasswordVerifier
import org.openforis.sepal.taskexecutor.endpoint.TaskExecutorEndpoint
import org.openforis.sepal.taskexecutor.endpoint.TaskExecutorUserProvider
import org.openforis.sepal.taskexecutor.landsatscene.GoogleLandsatDownload
import org.openforis.sepal.taskexecutor.landsatscene.LandsatSceneDownload
import org.openforis.sepal.taskexecutor.landsatscene.S3Landsat8Download
import org.openforis.sepal.taskexecutor.manager.BackgroundExecutingTaskManager
import org.openforis.sepal.taskexecutor.manager.ExecutorBackedBackgroundExecutor
import org.openforis.sepal.taskexecutor.manager.SepalNotifyingTaskProgressMonitor
import org.openforis.sepal.taskexecutor.util.Stoppable
import org.openforis.sepal.taskexecutor.util.download.BackgroundDownloader
import org.slf4j.Logger
import org.slf4j.LoggerFactory

class Main {
    private static final Logger LOG = LoggerFactory.getLogger(this)
    private final List<Stoppable> toStop = []

    Main() {
        def config = [:] // TODO: Read configuration from somewhere
        def userProvider = new TaskExecutorUserProvider()
        def usernamePasswordVerifier = new LdapUsernamePasswordVerifier(config.ldapHost)
        def pathRestrictions = new PathRestrictions(
                userProvider,
                new BasicRequestAuthenticator('Sepal-Task-Executor', usernamePasswordVerifier)
        )
        def backgroundExecutor = stoppable new ExecutorBackedBackgroundExecutor()
        def progressMonitor = stoppable new SepalNotifyingTaskProgressMonitor(config.sepalEndpoint)
        def backgroundDownloader = new BackgroundDownloader()
        def taskManager = stoppable new BackgroundExecutingTaskManager([
                'landsat-scene-download': new LandsatSceneDownload.Factory(
                        config.workingDir,
                        new S3Landsat8Download(config.s3Endpoint, backgroundDownloader),
                        new GoogleLandsatDownload(config.googleEndpoint, backgroundDownloader)
                )
        ], backgroundExecutor, progressMonitor)
        def endpoint = new TaskExecutorEndpoint(taskManager)
        Endpoints.deploy(config.webAppPort, pathRestrictions, endpoint)
        addShutdownHook { stop() }
    }

    private void stop() {
        Endpoints.undeploy()
        toStop.reverse()*.stop()
    }

    private <T extends Stoppable> T stoppable(T stoppable) {
        toStop << stoppable
        return stoppable
    }

    static void main(String[] args) {
        try {

        } catch (Exception e) {
            LOG.error('Failed to start Task-Executor', e)
            System.exit(1)
        }
    }
}
