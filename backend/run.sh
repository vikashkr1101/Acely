#!/usr/bin/env bash
# Loads backend/.env into environment variables, then starts the Spring Boot app.
# Usage (from the backend folder):  ./run.sh
set -euo pipefail

if [ ! -f .env ]; then
  echo "No .env found - copy .env.example to .env and fill it in."
  exit 1
fi

# Export every non-comment KEY=VALUE line from .env
set -a
# shellcheck disable=SC1091
. ./.env
set +a

export JAVA_HOME="${JAVA_HOME:-/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot}"

echo "Loaded .env - starting PrepPal backend on http://localhost:8080"
./mvnw spring-boot:run
