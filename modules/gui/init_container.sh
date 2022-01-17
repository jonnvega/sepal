#!/usr/bin/env bash

function template {
    local template=$1
    local destination=$2
    local destination_dir
    destination_dir=$(dirname "${destination}")
    mkdir -p "${destination_dir}"
    rm -f "${destination}"
    envsubst < "${template}" > "${destination}"
}

if [ "${DEPLOY_ENVIRONMENT}" == "DEV" ]; then
  exec npm start
else
  if [ ! -f "${MODULE}/build/index-template.html" ]; then
      mv "${MODULE}/build/index.html" "${MODULE}/build/index-template.html"
  fi

  template "${MODULE}/build/index-template.html" "${MODULE}/build/index.html"

  service nginx start
  pid=$(ps aux | grep '[/]usr/sbin/nginx' | awk '{ print $2 }')
  exec tail --pid="${pid}" -f /dev/null
fi
