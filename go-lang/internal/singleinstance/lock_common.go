// Package singleinstance 提供单实例锁功能，防止程序重复运行
// Package singleinstance provides single instance lock functionality to prevent program from running multiple times
package singleinstance

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

// Lock 表示单实例锁
// Lock represents a single instance lock
type Lock struct {
	file *os.File
}

// NewLock 创建并返回一个以指定名称命名的单实例锁
// NewLock creates and returns a single instance lock with the specified name
func NewLock(name string) (*Lock, error) {
	// Determine lock file path
	var lockFile string
	if runtime.GOOS == "windows" {
		// Windows: 使用 TEMP 目录
		tempDir := os.Getenv("TEMP")
		if tempDir == "" {
			tempDir = "."
		}
		lockFile = filepath.Join(tempDir, fmt.Sprintf("airinputlan_%s.lock", name))
	} else {
		// Unix-like: 使用 /tmp 目录
		lockFile = fmt.Sprintf("/tmp/airinputlan_%s.lock", name)
	}

	// 检查锁文件是否已存在
	if _, err := os.Stat(lockFile); err == nil {
		// 锁文件存在，检查是否是过期的（之前的程序已经崩溃）
		if isStaleLock(lockFile) {
			// 锁文件已过期，删除它
			os.Remove(lockFile)
		}
	}

	// 尝试以独占模式打开文件
	// 在 Windows 上，os.O_EXCL 会创建独占锁
// 在 Unix-like 上，我们使用文件锁
	flag := os.O_CREATE | os.O_WRONLY
	if runtime.GOOS == "windows" {
		flag |= os.O_EXCL
	}

	file, err := os.OpenFile(lockFile, flag, 0644)
	if err != nil {
		return nil, fmt.Errorf("程序已经在运行中，请检查是否已有实例在运行")
	}

	// 在 Unix-like 系统上，使用文件锁
	if runtime.GOOS != "windows" {
		err = lockFileUnix(file)
		if err != nil {
			file.Close()
			return nil, fmt.Errorf("程序已经在运行中，请检查是否已有实例在运行")
		}
	}

	// 写入当前进程ID
	pid := os.Getpid()
	file.WriteString(fmt.Sprintf("%d\n%d", pid, time.Now().Unix()))

	return &Lock{file: file}, nil
}

// isStaleLock 检查锁文件是否已过期（进程已不存在）
// isStaleLock checks if the lock file is expired (process no longer exists)
func isStaleLock(lockFile string) bool {
	// 读取锁文件内容
	data, err := os.ReadFile(lockFile)
	if err != nil {
		return true // 无法读取，认为是过期的
	}

	// 解析 PID
	var pid int
	_, err = fmt.Sscanf(string(data), "%d", &pid)
	if err != nil {
		return true // 无法解析，认为是过期的
	}

	// 检查进程是否还在运行
	return !isProcessRunning(pid)
}

// isProcessRunning 检查进程是否还在运行
// isProcessRunning checks if the process is still running
func isProcessRunning(pid int) bool {
	if runtime.GOOS == "windows" {
		// Windows: 使用 FindProcess 检查
		// 如果进程不存在，FindProcess 会返回错误
		process, err := os.FindProcess(pid)
		if err != nil {
			return false
		}
		// 发送信号 0 检查进程是否存在
		err = process.Signal(os.Signal(nil))
		if err != nil {
			return false
		}
		return true
	} else {
		// Unix-like: 发送信号 0 检查进程是否存在
		process, err := os.FindProcess(pid)
		if err != nil {
			return false
		}
		err = process.Signal(syscall.Signal(0))
		if err != nil {
			return false
		}
		return true
	}
}

// Release 释放单实例锁并删除锁文件
// Release releases the single instance lock and deletes the lock file
func (l *Lock) Release() error {
	if l.file != nil {
		lockFile := l.file.Name()

		// 在 Unix-like 系统上释放文件锁
		if runtime.GOOS != "windows" {
			if err := unlockFileUnix(l.file); err != nil {
				log.Printf("警告: 释放文件锁失败: %v", err)
			}
		}

		// 关闭文件
		if err := l.file.Close(); err != nil {
			// 如果关闭文件失败，不应该删除锁文件，避免状态不一致
			return fmt.Errorf("关闭锁文件失败: %w", err)
		}

		// 删除锁文件
		if err := os.Remove(lockFile); err != nil {
			// 如果文件不存在，不算错误
			if !os.IsNotExist(err) {
				return fmt.Errorf("删除锁文件失败: %w", err)
			}
		}

		return nil
	}
	return nil
}