#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.build.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  echo "Copie .build.env.example para .build.env e preencha as credenciais."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  DOCKERHUB_USERNAME
  DOCKERHUB_TOKEN
  BACKEND_IMAGE
  FRONTEND_IMAGE
  VITE_API_URL
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Variavel obrigatoria ausente: $var_name"
    exit 1
  fi
done

for cmd in docker curl python3; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Comando obrigatorio nao encontrado: $cmd"
    exit 1
  fi
done

get_next_version() {
  local image_ref="$1"
  local namespace="${image_ref%%/*}"
  local repository="${image_ref##*/}"
  local api_url="https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags?page_size=100"
  local tags_json
  local latest_version

  tags_json="$(curl -fsSL "$api_url" 2>/dev/null || true)"

  latest_version="$(
    TAGS_JSON="$tags_json" python3 - <<'PY'
import json
import os
import re

raw = os.environ.get("TAGS_JSON", "").strip()
if not raw:
    print("")
    raise SystemExit(0)

try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    print("")
    raise SystemExit(0)

pattern = re.compile(r"^v(\d+)\.(\d+)$")
versions = []
for item in payload.get("results", []):
    name = item.get("name", "")
    match = pattern.match(name)
    if match:
      versions.append((int(match.group(1)), int(match.group(2))))

if not versions:
    print("")
else:
    versions.sort()
    major, minor = versions[-1]
    print(f"v{major}.{minor}")
PY
  )"

  if [[ -z "$latest_version" ]]; then
    echo "v1.0"
    return
  fi

  VERSION="$latest_version" python3 - <<'PY'
import os
import re

version = os.environ["VERSION"]
match = re.match(r"^v(\d+)\.(\d+)$", version)
if not match:
    print("v1.0")
else:
    major = int(match.group(1))
    minor = int(match.group(2)) + 1
    print(f"v{major}.{minor}")
PY
}

VERSION="$(get_next_version "$BACKEND_IMAGE")"

echo "Nova versao detectada: $VERSION"
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

echo "Buildando backend..."
docker build \
  --target api-runner \
  -t "${BACKEND_IMAGE}:${VERSION}" \
  -t "${BACKEND_IMAGE}:latest" \
  .

echo "Buildando frontend..."
docker build \
  --target web-runner \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  -t "${FRONTEND_IMAGE}:${VERSION}" \
  -t "${FRONTEND_IMAGE}:latest" \
  .

echo "Enviando backend..."
docker push "${BACKEND_IMAGE}:${VERSION}"
docker push "${BACKEND_IMAGE}:latest"

echo "Enviando frontend..."
docker push "${FRONTEND_IMAGE}:${VERSION}"
docker push "${FRONTEND_IMAGE}:latest"

echo "Build concluido com sucesso."
echo "Backend:  ${BACKEND_IMAGE}:${VERSION}"
echo "Frontend: ${FRONTEND_IMAGE}:${VERSION}"
