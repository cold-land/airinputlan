#!/bin/bash
cd "$(dirname "$0")/.."
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags "-s -w" -o dist/AirInputLan-arm64-linux