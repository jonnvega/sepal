package org.openforis.sepal.sandbox

import groovymvc.Controller
import org.openforis.sepal.command.CommandDispatcher
import org.openforis.sepal.endpoint.SepalEndpoint

import static groovy.json.JsonOutput.toJson


class SandboxManagerEndpoint extends SepalEndpoint{

    SandboxManagerEndpoint(CommandDispatcher commandDispatcher) {
        super(commandDispatcher)
    }

    @Override
    void registerWith(Controller controller) {
        controller.with {

            get('sandbox/{user}') {
                response.contentType = "application/json"
                def commandResult = commandDispatcher.submit(new ObtainUserSandboxCommand(params.user as String))
                send(toJson(commandResult))
            }

            put('container/${id}/alive') {
                response.status = 204
                commandDispatcher.submit(new ContainerAliveCommand(params.id as int))
            }
        }
    }
}
