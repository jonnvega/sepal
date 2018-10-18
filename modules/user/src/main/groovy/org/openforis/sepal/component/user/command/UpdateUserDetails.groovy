package org.openforis.sepal.component.user.command

import groovy.transform.Canonical
import groovy.transform.EqualsAndHashCode
import org.openforis.sepal.command.AbstractCommand
import org.openforis.sepal.command.CommandHandler
import org.openforis.sepal.component.user.api.UserRepository
import org.openforis.sepal.component.user.internal.UserChangeListener
import org.openforis.sepal.messagebroker.MessageBroker
import org.openforis.sepal.messagebroker.MessageQueue
import org.openforis.sepal.user.User

@EqualsAndHashCode(callSuper = true)
@Canonical
class UpdateUserDetails extends AbstractCommand<User> {
    String usernameToUpdate
    String name
    String email
    String organization
}

class UpdateUserDetailsHandler implements CommandHandler<User, UpdateUserDetails> {
    private final UserRepository userRepository
    private final MessageQueue<Map> messageQueue

    UpdateUserDetailsHandler(
        UserRepository userRepository,
        MessageBroker messageBroker,
        UserChangeListener changeListener) {
        this.userRepository = userRepository
        this.messageQueue = messageBroker.createMessageQueue('user.update_user_details', Map) {
            def user = it.user
            changeListener.changed(user.username, user.toMap())
        }
    }

    User execute(UpdateUserDetails command) {
        def user = userRepository.lookupUser(command.usernameToUpdate)
            .withDetails(
            command.name,
            command.email,
            command.organization
        )
        userRepository.updateUserDetails(user)
        messageQueue.publish(user: user)
        return user
    }
}
