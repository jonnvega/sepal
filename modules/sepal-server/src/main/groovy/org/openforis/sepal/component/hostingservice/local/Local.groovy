package org.openforis.sepal.component.hostingservice.local

import org.openforis.sepal.component.budget.api.HostingService
import org.openforis.sepal.component.hostingservice.HostingServiceAdapter
import org.openforis.sepal.component.hostingservice.api.InstanceType
import org.openforis.sepal.component.workerinstance.WorkerInstanceConfig
import org.openforis.sepal.component.workerinstance.adapter.DockerInstanceProvisioner
import org.openforis.sepal.component.workerinstance.api.InstanceProvider
import org.openforis.sepal.component.workerinstance.api.InstanceProvisioner
import org.openforis.sepal.component.workerinstance.api.WorkerInstance

@SuppressWarnings("GroovyUnusedDeclaration")
class Local implements HostingServiceAdapter {
    private final config = new LocalConfig()
    private final double storageCostPerGbMonth = 0.33d + 2 * 0.023d // EFS + 2 * S3 backup (daily, weekly)
    final List<InstanceType> instanceTypes = [
            new InstanceType(id: 'T3aSmall', name: 't3a.small', tag: 't1', hourlyCost: 0.0204, cpuCount: 1, ramGiB: 2, idleCount: 1),
            new InstanceType(id: 'T3aMedium', name: 't3a.medium', tag: 't2', hourlyCost: 0.0408, cpuCount: 2, ramGiB: 4),
            new InstanceType(id: 'M5aLarge', name: 'm5a.large', tag: 'm2', hourlyCost: 0.096, cpuCount: 2, ramGiB: 8),
            new InstanceType(id: 'M5aXlarge', name: 'm5a.xlarge', tag: 'm4', hourlyCost: 0.192, cpuCount: 4, ramGiB: 16),
            new InstanceType(id: 'M5a2xlarge', name: 'm5a.2xlarge', tag: 'm8', hourlyCost: 0.384, cpuCount: 8, ramGiB: 32),
            new InstanceType(id: 'M5a4xlarge', name: 'm5a.4xlarge', tag: 'm16', hourlyCost: 0.768, cpuCount: 16, ramGiB: 64),
            new InstanceType(id: 'M5a12xlarge', name: 'm4.10xlarge', tag: 'm48', hourlyCost: 2.304, cpuCount: 48, ramGiB: 192),
            new InstanceType(id: 'M5a16xlarge', name: 'm5a.16xlarge', tag: 'm64', hourlyCost: 3.072, cpuCount: 64, ramGiB: 256),
            new InstanceType(id: 'C5Large', name: 'c5.large', tag: 'c2', hourlyCost: 0.096, cpuCount: 2, ramGiB: 4),
            new InstanceType(id: 'C5Xlarge', name: 'c5.xlarge', tag: 'c4', hourlyCost: 0.192, cpuCount: 4, ramGiB: 8),
            new InstanceType(id: 'C52xlarge', name: 'c5.2xlarge', tag: 'c8', hourlyCost: 0.384, cpuCount: 8, ramGiB: 16),
            new InstanceType(id: 'C54xlarge', name: 'c5.4xlarge', tag: 'c16', hourlyCost: 0.768, cpuCount: 16, ramGiB: 32),
            new InstanceType(id: 'C59xlarge', name: 'c5.9xlarge', tag: 'c36', hourlyCost: 1.728, cpuCount: 36, ramGiB: 72),
            new InstanceType(id: 'R5Large', name: 'r5.large', tag: 'r2', hourlyCost: 0.141, cpuCount: 2, ramGiB: 16),
            new InstanceType(id: 'R5Xlarge', name: 'r5.xlarge', tag: 'r4', hourlyCost: 0.282, cpuCount: 4, ramGiB: 32),
            new InstanceType(id: 'R52xlarge', name: 'r5.2xlarge', tag: 'r8', hourlyCost: 0.564, cpuCount: 8, ramGiB: 64),
            new InstanceType(id: 'R54xlarge', name: 'r5.4xlarge', tag: 'r16', hourlyCost: 1.128, cpuCount: 16, ramGiB: 128),
            new InstanceType(id: 'R58xlarge', name: 'r5.8xlarge', tag: 'r32', hourlyCost: 2.256, cpuCount: 32, ramGiB: 256),
            new InstanceType(id: 'R516xlarge', name: 'r5.16xlarge', tag: 'r64', hourlyCost: 4.512, cpuCount: 64, ramGiB: 512),
            new InstanceType(id: 'X116xlarge', name: 'x1.16xlarge', tag: 'x64', hourlyCost: 8.003, cpuCount: 64, ramGiB: 976),
            new InstanceType(id: 'X132xlarge', name: 'x1.32xlarge', tag: 'x128', hourlyCost: 16.006, cpuCount: 128, ramGiB: 1920),
            new InstanceType(id: 'T2Small', name: 't2.small', hourlyCost: 0.025, cpuCount: 1, ramGiB: 2),
            new InstanceType(id: 'M3Medium', name: 'm3.medium', hourlyCost: 0.073, cpuCount: 1, ramGiB: 3.75),
            new InstanceType(id: 'M4Large', name: 'm4.large', hourlyCost: 0.119, cpuCount: 2, ramGiB: 8),
            new InstanceType(id: 'M4Xlarge', name: 'm4.xlarge', hourlyCost: 0.238, cpuCount: 4, ramGiB: 16),
            new InstanceType(id: 'M42xlarge', name: 'm4.2xlarge', hourlyCost: 0.475, cpuCount: 8, ramGiB: 32),
            new InstanceType(id: 'M44xlarge', name: 'm4.4xlarge', hourlyCost: 0.95, cpuCount: 16, ramGiB: 64),
            new InstanceType(id: 'M410xlarge', name: 'm4.10xlarge', hourlyCost: 2.377, cpuCount: 40, ramGiB: 160),
            new InstanceType(id: 'M416xlarge', name: 'm4.16xlarge', hourlyCost: 3.803, cpuCount: 64, ramGiB: 256),
            new InstanceType(id: 'C4Large', name: 'c4.large', hourlyCost: 0.113, cpuCount: 2, ramGiB: 3.75),
            new InstanceType(id: 'C4Xlarge', name: 'c4.xlarge', hourlyCost: 0.226, cpuCount: 4, ramGiB: 7.5),
            new InstanceType(id: 'C42xlarge', name: 'c4.2xlarge', hourlyCost: 0.453, cpuCount: 8, ramGiB: 15),
            new InstanceType(id: 'C44xlarge', name: 'c4.4xlarge', hourlyCost: 0.905, cpuCount: 16, ramGiB: 30),
            new InstanceType(id: 'C48xlarge', name: 'c4.8xlarge', hourlyCost: 1.811, cpuCount: 36, ramGiB: 60),
            new InstanceType(id: 'R4Large', name: 'r4.large', hourlyCost: 0.148, cpuCount: 2, ramGiB: 15.25),
            new InstanceType(id: 'R4Xlarge', name: 'r4.xlarge', hourlyCost: 0.296, cpuCount: 4, ramGiB: 30.5),
            new InstanceType(id: 'R42xlarge', name: 'r4.2xlarge', hourlyCost: 0.593, cpuCount: 8, ramGiB: 61),
            new InstanceType(id: 'R44xlarge', name: 'r4.4xlarge', hourlyCost: 1.186, cpuCount: 16, ramGiB: 122),
            new InstanceType(id: 'R48xlarge', name: 'r4.8xlarge', hourlyCost: 2.371, cpuCount: 32, ramGiB: 244),
            new InstanceType(id: 'R416xlarge', name: 'r4.16xlarge', hourlyCost: 4.742, cpuCount: 64, ramGiB: 488),
            new InstanceType(id: 'G4dnXlarge', name: 'g4dn.xlarge', tag: 'g4', hourlyCost: 0.587, cpuCount: 4, ramGiB: 16,
                    devices: ['/dev/nvidiactl', '/dev/nvidia0', '/dev/nvidia-uvm']),
            new InstanceType(id: 'G4dn2xlarge', name: 'g4dn.2xlarge', tag: 'g8', hourlyCost: 0.838, cpuCount: 8, ramGiB: 32,
                    devices: ['/dev/nvidiactl', '/dev/nvidia0', '/dev/nvidia-uvm']),
    ].asImmutable()

    HostingService getHostingService() {
        return new LocalHostingService(instanceTypes, storageCostPerGbMonth)
    }

    InstanceProvider getInstanceProvider() {
        return new LocalInstanceProvider(config.host, instanceTypes.findAll {it.tag}.first())
    }

    InstanceProvisioner getInstanceProvisioner() {
        new DockerInstanceProvisioner(new WorkerInstanceConfig(), instanceTypes, null)
    }
}
