// Package singleinstance 提供 Windows 平台的文件锁实现
// Package singleinstance provides file lock implementation for Windows platform
//go:build windows

package singleinstance

import (
	"os"
	"syscall"
	"unsafe"
)

// Windows 常量定义 / Windows constants
const (
	LOCKFILE_EXCLUSIVE_LOCK   = 0x00000002
	LOCKFILE_FAIL_IMMEDIATELY = 0x00000001
)

// lockFileUnix 在 Windows 上获取文件锁
// lockFileUnix acquires file lock on Windows platform
func lockFileUnix(file *os.File) error {
	// 获取文件句柄 / Get file handle
	handle := syscall.Handle(file.Fd())

	// 创建 overlapped 结构体 / Create overlapped structure
	var overlapped syscall.Overlapped

	// 调用 LockFileEx 获取独占锁 / Call LockFileEx to acquire exclusive lock
	// 锁定整个文件（从 0 开始，锁定 0xFFFFFFFF 字节） / Lock entire file (from 0, lock 0xFFFFFFFF bytes)
	err := syscall.LockFileEx(
		handle,
		LOCKFILE_EXCLUSIVE_LOCK|LOCKFILE_FAIL_IMMEDIATELY,
		0,
		0xFFFFFFFF,
		0xFFFFFFFF,
		&overlapped,
	)
	
	if err != nil {
		return err
	}
	
	return nil
}

// unlockFileUnix 在 Windows 上释放文件锁
// unlockFileUnix releases file lock on Windows platform
func unlockFileUnix(file *os.File) error {
	// 获取文件句柄 / Get file handle
	handle := syscall.Handle(file.Fd())

	// 创建 overlapped 结构体 / Create overlapped structure
	var overlapped syscall.Overlapped

	// 调用 UnlockFileEx 释放锁 / Call UnlockFileEx to release lock
	// 解锁整个文件（从 0 开始，解锁 0xFFFFFFFF 字节） / Unlock entire file (from 0, unlock 0xFFFFFFFF bytes)
	err := syscall.UnlockFileEx(
		handle,
		0,
		0xFFFFFFFF,
		0xFFFFFFFF,
		&overlapped,
	)
	
	if err != nil {
		return err
	}
	
	return nil
}