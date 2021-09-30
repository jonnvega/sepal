package org.openforis.sepal.sshgateway

class SshSessionCommand {
    private final File privateKey
    private final File output

    SshSessionCommand(File privateKey, File output) {
        this.privateKey = privateKey
        this.output = output
    }

    void write(Map session) {
        output.executable = true
        output.write("#!/usr/bin/env bash\n" +
                "\$(alive.sh $session.id > ~/alive.log 2>&1 &) && ssh " +
                "-i $privateKey " +
                "-l $session.username " +
                "-q " +
                "-oStrictHostKeyChecking=no " +
                "-oUserKnownHostsFile=/dev/null " +
                "-oBatchMode=yes " +
                "-p 222 " +
                "$session.host \$1", 'UTF-8')
    }
}
