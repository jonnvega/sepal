RabbitMQ "sepal.topic" exchange documentation

- email.send: {from, to, cc, bcc, subject, content, contentType}
- files.FilesDeleted: {username, path}
    - pub: sepal-server
    - sub: user-storage

- files.update: {username}
    - pub: user-files
    - sub: <none>

- user.emailNotificationsEnabled: {username, enabled}
    - pub: ???
    - sub: email

- user.UserLocked: {user}
    - pub: user
    - sub: gateway, sepal-server

- user.UserUpdated: {user}
    - pub: user
    - sub: <none>

- userStorage.size: {username, size}
    - pub: user-storage
    - sub: sepal-server

- workerSession.WorkerSessionActivated: {username}
    - pub: ???
    - sub: user-storage

- workerSession.WorkerSessionClosed: {username}
    - pub: ???
    - sub: user-storage
