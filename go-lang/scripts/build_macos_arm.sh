#!/bin/bash
cd "$(dirname "$0")/.."
CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w" -o dist/AirInputLan-arm64-macos