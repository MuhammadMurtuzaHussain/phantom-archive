#!/usr/bin/env bash
# Creates the oracle droplet. Needs `doctl auth init` done and DO_SERVICE_TOKEN in .env.
# About $0.018 an hour on s-1vcpu-2gb. Prints the oracle's URL for ORACLE_URL.
#
#   infra/do/oracle-up.sh            # REGION=lon1 SIZE=s-1vcpu-2gb by default
set -euo pipefail
cd "$(dirname "$0")"
token=$(grep '^DO_SERVICE_TOKEN=' ../../.env | cut -d= -f2-)
[ -n "$token" ] || { echo "DO_SERVICE_TOKEN is empty in .env" >&2; exit 1; }

userdata=$(mktemp)
trap 'rm -f "$userdata"' EXIT
sed "s|__DO_SERVICE_TOKEN__|$token|" oracle-cloud-init.yaml > "$userdata"
keys=$(doctl compute ssh-key list --format ID --no-header 2>/dev/null | paste -sd, - || true)

id=$(doctl compute droplet create phantom-oracle \
  --region "${REGION:-lon1}" --size "${SIZE:-s-1vcpu-2gb}" --image ubuntu-24-04-x64 \
  --user-data-file "$userdata" ${keys:+--ssh-keys "$keys"} --tag-name phantom-archive \
  --wait --format ID --no-header)
# The public address can land a moment after the droplet reports active.
ip=""
until [ -n "$ip" ]; do sleep 2; ip=$(doctl compute droplet get "$id" --format PublicIPv4 --no-header); done
echo "droplet $id at $ip"
echo "ORACLE_URL=https://${ip//./-}.sslip.io  (ready once cloud-init finishes, ~5 min)"
