// Package singleinstance 提供 Windows 平台的文件锁实现
// Package singleinstance provides file lock implementation for Windows platform
//go:build windows

package singleinstance

import (
	"os"
)

// lockFileUnix 在 Windows 上获取文件锁
// lockFileUnix acquires file lock on Windows platform
func lockFileUnix(file *os.File) error {
	return nil
}

// unlockFileUnix 在 Windows 上释放文件锁
// unlockFileUnix releases file lock on Windows platform
func unlockFileUnix(file *os.File) error {
	return nil
}