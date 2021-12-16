#!/bin/bash
set -e

echo
echo "***********************"
echo "*** Installing Java ***"
echo "***********************"
export SDKMAN_DIR=/usr/local/lib/sdkman
curl -s get.sdkman.io | bash
source "$SDKMAN_DIR/bin/sdkman-init.sh"
yes | sdk install java 11.0.11.hs-adpt
sdk install groovy

source "$SDKMAN_DIR/bin/sdkman-init.sh"
ln -s `which java` /usr/local/bin/java
ln -s `which groovy` /usr/local/bin/groovy

echo "export SDKMAN_DIR=/usr/local/lib/sdkman" >> /etc/profile
echo 'source "$SDKMAN_DIR/bin/sdkman-init.sh"' >> /etc/profile
