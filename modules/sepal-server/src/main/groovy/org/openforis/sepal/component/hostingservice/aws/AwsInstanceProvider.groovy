package org.openforis.sepal.component.hostingservice.aws

import com.amazonaws.auth.BasicAWSCredentials
import com.amazonaws.services.ec2.AmazonEC2Client
import com.amazonaws.services.ec2.model.*
import groovy.time.TimeCategory
import org.openforis.sepal.component.workerinstance.WorkerInstanceConfig
import org.openforis.sepal.component.workerinstance.api.InstanceProvider
import org.openforis.sepal.component.workerinstance.api.WorkerInstance
import org.openforis.sepal.component.workerinstance.api.WorkerReservation
import org.openforis.sepal.util.DateTime
import org.openforis.sepal.util.JobScheduler
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import java.util.concurrent.TimeUnit

final class AwsInstanceProvider implements InstanceProvider {
    private static final Logger LOG = LoggerFactory.getLogger(this)
    private static final String SECURITY_GROUP = 'Sandbox'
    private static final int PUBLIC_IP_RETRIES = 300
    private final JobScheduler jobScheduler
    private final String currentSepalVersion
    private final String region
    private final String availabilityZone
    private final String environment
    private final AmazonEC2Client client
    private final String imageId
    private final List<Closure> launchListeners = []

    AwsInstanceProvider(JobScheduler jobScheduler, AwsConfig config) {
        this.jobScheduler = jobScheduler
        currentSepalVersion = config.sepalVersion
        region = config.region
        availabilityZone = config.availabilityZone
        environment = config.environment
        def credentials = new BasicAWSCredentials(config.accessKey, config.secretKey)
        client = new AmazonEC2Client(credentials)
        client.endpoint = "https://ec2.${region}.amazonaws.com"
        imageId = fetchImageId(region)
    }

    List<WorkerInstance> launchIdle(String instanceType, int count) {
        return launch(instanceType, count).collect {
            tagInstance(it.instanceId, launchTags(), idleTags())
            return toWorkerInstance(it)
        }
    }

    WorkerInstance launchReserved(String instanceType, WorkerReservation reservation) {
        def awsInstance = launch(instanceType, 1).first()
        tagInstance(awsInstance.instanceId, launchTags(), reserveTags(reservation))
        def instance = toWorkerInstance(awsInstance).reserve(reservation)
        return waitForPublicIpToBecomeAvailable(instance, instanceType, reservation)
    }

    private WorkerInstance waitForPublicIpToBecomeAvailable(WorkerInstance instance, String instanceType, WorkerReservation reservation) {
        LOG.debug("Waiting for public IP to be come available on instance $instance, " +
                "instanceType: $instanceType, reservation: $reservation")
        int retries = 0
        while (!instance.host && retries < PUBLIC_IP_RETRIES) {
            retries++
            LOG.debug("Getting instance $instance.id to see if the public ID is assigned yet, " +
                    "instanceType: $instanceType, reservation: $reservation")

            try {
                instance = getInstance(instance.id)
                LOG.debug("Got instance $instance")
            } catch (AmazonEC2Exception ignore) {
                // Instance might not be available straight away
                LOG.warn("Failed to get instance $instance.id. Will still keep on waiting for it to become available.")
            }
            Thread.sleep(1000)
        }
        if (!instance.host)
            throw new FailedToLaunchInstance("Unable to get public IP of instance $instance.id, " +
                    "instanceType: $instanceType, reservation: $reservation")
        return instance
    }

    void terminate(String instanceId) {
        LOG.info("Terminating instance " + instanceId)
        retry(10) {
            def request = new TerminateInstancesRequest()
                    .withInstanceIds(instanceId)
            client.terminateInstances(request)
            LOG.info("Terminated instance " + instanceId)
        }
    }

    void reserve(WorkerInstance instance) {
        tagInstance(instance.id, reserveTags(instance.reservation))
    }

    void release(String instanceId) {
        tagInstance(instanceId, idleTags())
    }

    List<WorkerInstance> idleInstances(String instanceType) {
        findInstances(
                true,
                taggedWith('State', 'idle'),
                ofInstanceType(instanceType)
        )
    }

    List<WorkerInstance> idleInstances() {
        findInstances(
                true,
                taggedWith('State', 'idle')
        )
    }

    List<WorkerInstance> reservedInstances() {
        findInstances(
                false,
                taggedWith('State', 'reserved'),
        )
    }

    WorkerInstance getInstance(String instanceId) {
        def instances = findInstances(false, new DescribeInstancesRequest()
                .withInstanceIds(instanceId)
        )
        if (instances.size() != 1)
            throw new IllegalStateException("Expected exactly one instance with id $instanceId, got $instances")
        return instances.first()
    }

    void onInstanceLaunched(Closure listener) {
        launchListeners << listener
    }

    void start() {
        jobScheduler.schedule(0, 10, TimeUnit.SECONDS) {
            try {
                notifyAboutStartedInstance()
            } catch (Throwable e) {
                LOG.error('Failed to notify about started instances', e)
            }
        }
    }

    private void notifyAboutStartedInstance() {
        def instances = findInstances(false, running(), taggedWith('Starting', 'true'))
        instances.findAll {
            it.running
        }.each {
            tagInstance(it.id, [tag('Starting', '')])
            launchListeners*.call(it)
        }
    }

    void stop() {
        jobScheduler.stop()
    }

    private List<Tag> launchTags() {
        [
                tag('Environment', environment),
                tag('Type', 'Worker'),
                tag('Version', currentSepalVersion),
                tag('Starting', 'true')
        ]
    }

    private List<Tag> reserveTags(WorkerReservation reservation) {
        [
                tag('State', 'reserved'),
                tag('Username', reservation.username),
                tag('WorkerType', reservation.workerType),
                tag('InStateSince', DateTime.toDateTimeString(new Date())),
                tag('Name', "$environment: $reservation.workerType, $reservation.username")
        ]
    }

    private List<Tag> idleTags() {
        [
                tag('State', 'idle'),
                tag('Username', ''),
                tag('WorkerType', ''),
                tag('InStateSince', DateTime.toDateTimeString(new Date())),
                tag('Name', "$environment: Idle worker")
        ]
    }

    private Tag tag(String name, String value) {
        return new Tag(name, value)
    }

    private Filter taggedWith(String tagName, String value) {
        new Filter("tag:$tagName", [value])
    }

    private Filter running() {
        new Filter('instance-state-name', ['running'])
    }

    private Filter ofInstanceType(String instanceType) {
        new Filter('instance-type', [(instanceType as InstanceType).toString()])
    }

    private List<WorkerInstance> findInstances(boolean onlyCorrectVersion, Filter... filters) {
        findInstances(onlyCorrectVersion, new DescribeInstancesRequest().withFilters(
                filters.toList() + [
                        taggedWith('Type', 'Worker'),
                        taggedWith('Environment', environment),
                        new Filter('instance-state-name', ['pending', 'running'])
                ]))
    }

    private List<WorkerInstance> findInstances(boolean onlyCorrectVersion, DescribeInstancesRequest request) {
        def awsInstances = client.describeInstances(request).reservations
                .collect { it.instances }.flatten() as List<Instance>
        def instancesWithValidVersion = onlyCorrectVersion ? awsInstances.findAll {
            !WorkerInstanceConfig.isOlderVersion(instanceVersion(it), currentSepalVersion)
        } : awsInstances
        terminateOldIdle(awsInstances)
        terminateUntagged()
        return instancesWithValidVersion.collect { toWorkerInstance(it) }
    }

    private List<Instance> terminateOldIdle(List<Instance> awsInstances) {
        awsInstances.findAll {
            WorkerInstanceConfig.isOlderVersion(instanceVersion(it), currentSepalVersion) && tagValue(it, 'State') == 'idle'
        }.each {
            terminate(it.instanceId)
        }
    }

    private String instanceVersion(Instance instance) {
        tagValue(instance, 'Version')
    }

    private List<Instance> launch(String instanceType, int count) {
        LOG.info("Launching $instanceType")
        def request = new RunInstancesRequest()
                .withKeyName(region)
                .withInstanceType(instanceType as InstanceType)
                .withSecurityGroups(SECURITY_GROUP)
                .withImageId(imageId)
                .withMinCount(count).withMaxCount(count)
                .withPlacement(new Placement(availabilityZone: availabilityZone))

        def response = client.runInstances(request)
        return response.reservation.instances
    }

    private String fetchImageId(String region) {
        def request = new DescribeImagesRequest()
        request.withFilters(
                new Filter("tag:Version", [currentSepalVersion]),
                new Filter('tag:Region', [region])
        )
        def response = client.describeImages(request)
        if (!response?.images)
            throw new UnableToGetImageId("sepalVersion: $currentSepalVersion, region: $region, availabilityZone: $availabilityZone")
        def image = response.images.first()
        LOG.info("Using sandbox image $image.imageId")
        return image.imageId
    }

    private void tagInstance(String instanceId, Collection<Tag>... tagCollections) {
        try {
            retry(10, ({
                def tags = tagCollections.toList().flatten() as Tag[]
                LOG.info("Tagging instance $instanceId with $tags")
                def request = new CreateTagsRequest()
                        .withResources(instanceId)
                        .withTags(tags)
                client.createTags(request)
            } as Closure<Void>))
        } catch (Exception e) {
            terminate(instanceId)
            throw new FailedToTagInstance("Failed to tag instance $instanceId with $tagCollections", e)
        }
    }

    private void retry(int tries, Closure<Void> operation) {
        for (int retries = 0; retries - 1 < tries; retries++) {
            try {
                operation()
                return
            } catch (Exception e) {
                if (retries - 1 < tries) {
                    backoff(retries)
                    LOG.warn("Retry #${retries + 1} after exception: ${e}")
                } else
                    throw e
            }
        }
    }

    private void backoff(int retries) {
        def millis = (long) Math.pow(2, retries ?: 0) * 1000
        Thread.sleep(millis)
    }

    private WorkerInstance toWorkerInstance(Instance awsInstance) {
        def idle = tagValue(awsInstance, 'State') == 'idle'
        def running = awsInstance.state.name == 'running'
        def reservation = idle ? null :
                new WorkerReservation(
                        username: tagValue(awsInstance, 'Username'),
                        workerType: tagValue(awsInstance, 'WorkerType')
                )
        return new WorkerInstance(
                id: awsInstance.instanceId,
                type: instanceType(awsInstance),
                host: awsInstance.publicIpAddress,
                running: running,
                launchTime: awsInstance.launchTime,
                reservation: reservation
        )
    }

    private String tagValue(Instance awsInstance, String key) {
        awsInstance.tags.find { it.key == key }?.value
    }

    private String instanceType(Instance awsInstance) {
        InstanceType.fromValue(awsInstance.instanceType).name()
    }

    void terminateUntagged() {
        use(TimeCategory) {
            def request = new DescribeInstancesRequest().withFilters(
                    running()
            )
            def awsInstances = client.describeInstances(request).reservations
                    .collect { it.instances }.flatten() as List<Instance>
            awsInstances
                    .findAll {
                        def untagged = it.tags.empty
                        def minutesSinceLaunched = (new Date() - it.launchTime).minutes
                        untagged && minutesSinceLaunched > 1
                    }
                    .forEach { terminate(it.instanceId) }
        }
    }

    class UnableToGetImageId extends RuntimeException {
        UnableToGetImageId(String message) {
            super(message)
        }
    }

    class FailedToLaunchInstance extends RuntimeException {
        FailedToLaunchInstance(String message) {
            super(message)
        }
    }

    class FailedToTagInstance extends RuntimeException {
        FailedToTagInstance(String message, Exception e) {
            super(message, e)
        }
    }
}
