// Package network provides shared logging utilities
package network

import (
	"flag"
	"log"
)

var enableDebugLog bool

func init() {
	// 延迟初始化，在 flag.Parse() 之后调用 initLogger
}

// InitLogger 初始化日志开关（必须在 flag.Parse() 之后调用）
func InitLogger() {
	if f := flag.Lookup("debug"); f != nil {
		enableDebugLog = f.Value.(flag.Getter).Get().(bool)
	}
}

// logPrintf 条件性打印日志
func logPrintf(format string, args ...interface{}) {
	if enableDebugLog {
		log.Printf(format, args...)
	}
}