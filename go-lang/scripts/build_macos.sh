#!/bin/bash
cd "$(dirname "$0")/.."
CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 go build -ldflags "-s -w" -o dist/AirInputLan-x86_64-macos