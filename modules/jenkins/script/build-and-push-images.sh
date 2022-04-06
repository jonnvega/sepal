#!/usr/bin/env bash
set -e

export SEPAL_VERSION=$1
export SEPAL_DATA_DIR=/data
export SEPAL_BACKUP_DIR=/tmp/sepal-backup
export DEPLOY_ENVIRONMENT=OPS

echo "\$1: $1"
echo "\$2: $2"
echo "\$3: $3"
echo "\$BUILD_NUMBER: $BUILD_NUMBER"
echo "\$SEPAL_VERSION: $SEPAL_VERSION"
echo "\$GIT_COMMIT: $GIT_COMMIT"

function build {
  local MODULE=$1
  local MODULE_DIR=${WORKSPACE}/modules/${MODULE}
  echo
  echo "******* Building ${MODULE} *******"
  cd ${MODULE_DIR}
  set -o pipefail && BUILD_NUMBER=${SEPAL_VERSION} GIT_COMMIT=${GIT_COMMIT} docker-compose \
    --file ${MODULE_DIR}/docker-compose.yml \
    build \
    | tee /var/log/sepal-build/${MODULE}.log
}

function push {
  local MODULE=$1
  echo
  echo "******* Pushing ${MODULE} *******"
  docker push localhost/openforis/${MODULE}:${SEPAL_VERSION}
}

function start {
  local MODULE=$1
  local MODULE_DIR=${WORKSPACE}/modules/${MODULE}
  echo
  echo "******* Starting ${MODULE} *******"
  cd ${MODULE_DIR}
  docker-compose --file ${MODULE_DIR}/docker-compose.yml down
  docker-compose --file ${MODULE_DIR}/docker-compose.yml up -d
}

build sandbox-base

build r-proxy
start r-proxy

build email
build sys-monitor
build letsencrypt
build java
build rabbitmq
build ldap-backup
build ldap
build haproxy
build backup
build mysql-backup
build mysql
build gateway
build terminal
build ssh-gateway
build geospatial-toolkit
build sandbox
build task
build gee
build user
build user-storage
build user-storage-backup
build user-files
build gui
build ceo-gateway
build app-manager
build sepal-server

echo "${DOCKER_REGISTRY_PASSWORD}" | docker login localhost -u "${DOCKER_REGISTRY_USERNAME}" --password-stdin

push sys-monitor
push email
push backup
push rabbitmq
push ldap
push ldap-backup
push user
push user-storage
push user-storage-backup
push app-manager
push sepal
push user-files
push gui
push ceo-gateway
push mysql
push mysql-backup
push gee
push gateway
push ssh-gateway
push sandbox
push task
push terminal
push letsencrypt
push haproxy

docker logout localhost
docker system prune --force
