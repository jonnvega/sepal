package org.openforis.sepal.component.user.command

import groovy.transform.Canonical
import groovy.transform.EqualsAndHashCode
import org.openforis.sepal.command.AbstractCommand
import org.openforis.sepal.command.CommandHandler
import org.openforis.sepal.component.user.adapter.GoogleAccessTokenFileGateway
import org.openforis.sepal.component.user.adapter.GoogleOAuthClient
import org.openforis.sepal.component.user.adapter.InvalidToken
import org.openforis.sepal.component.user.api.UserRepository
import org.openforis.sepal.component.user.internal.UserChangeListener
import org.openforis.sepal.messagebroker.MessageBroker
import org.openforis.sepal.messagebroker.MessageQueue
import org.openforis.sepal.user.GoogleTokens
import org.slf4j.Logger
import org.slf4j.LoggerFactory

@EqualsAndHashCode(callSuper = true)
@Canonical
class RefreshGoogleAccessToken extends AbstractCommand<GoogleTokens> {
    GoogleTokens tokens
}

class RefreshGoogleAccessTokenHandler implements CommandHandler<GoogleTokens, RefreshGoogleAccessToken> {
    private static final Logger LOG = LoggerFactory.getLogger(this)

    private final GoogleOAuthClient oAuthClient
    private final UserRepository userRepository
    private final GoogleAccessTokenFileGateway googleAccessTokenFileGateway
    private final MessageQueue<Map> messageQueue

    RefreshGoogleAccessTokenHandler(
        GoogleOAuthClient oAuthClient,
        UserRepository userRepository,
        GoogleAccessTokenFileGateway googleAccessTokenFileGateway,
        MessageBroker messageBroker,
        UserChangeListener changeListener) {
        this.oAuthClient = oAuthClient
        this.userRepository = userRepository
        this.googleAccessTokenFileGateway = googleAccessTokenFileGateway
        this.messageQueue = messageBroker.createMessageQueue('user.refresh_google_access_token', Map) {
            def user = it.user
            googleAccessTokenFileGateway.save(user.username, it.tokens)
            changeListener.changed(user.username, user.toMap())
        }
    }

    GoogleTokens execute(RefreshGoogleAccessToken command) {
        def tokens = command.tokens ?: userRepository.lookupUser(command.username).googleTokens
        if (!tokens)
            return null
        if (!tokens.shouldBeRefreshed(System.currentTimeMillis()))
            return tokens

        def refreshedToken = null
        try {
            refreshedToken = oAuthClient.refreshAccessToken(command.username, tokens)
        } catch (InvalidToken e) {
            LOG.info("Invalid refresh token. Sepal credentials will be used. command: $command, error: $e.message")
        }
        userRepository.updateGoogleTokens(command.username, refreshedToken)
        def user = userRepository.lookupUser(command.username)
        messageQueue.publish(user: user, tokens: refreshedToken)
        return refreshedToken
    }
}
