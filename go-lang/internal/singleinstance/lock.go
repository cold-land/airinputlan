// Package singleinstance 提供 Unix-like 系统的文件锁实现
// Package singleinstance provides file lock implementation for Unix-like systems
//go:build !windows

package singleinstance

import (
	"os"
	"syscall"
)

// lockFileUnix 在 Unix-like 系统上获取文件锁
// lockFileUnix acquires file lock on Unix-like systems
func lockFileUnix(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
}

// unlockFileUnix 在 Unix-like 系统上释放文件锁
// unlockFileUnix releases file lock on Unix-like systems
func unlockFileUnix(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
}