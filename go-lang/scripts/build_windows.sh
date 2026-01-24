#!/bin/bash
cd "$(dirname "$0")/.."
CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -ldflags "-s -w -H=windowsgui" -o dist/AirInputLan-x86_64-win.exe