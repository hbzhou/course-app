/bin/bash

sed -i "s|^appVersion:.*|appVersion: $1|" k8s/fullstackapp-chart/Chart.yaml
sed -i "s|^version:.*|version: $2|" k8s/fullstackapp-chart/Chart.yaml