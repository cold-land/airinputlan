// Package network provides shared logging utilities
package network

import (
	"flag"
	"fmt"
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

// LogInfo 一般信息日志（始终显示）
// 用于显示关键操作，如启动、分段、退出等
func LogInfo(format string, args ...interface{}) {
	log.Printf(format, args...)
}

// LogDebug 调试信息日志（仅在 --debug 模式显示）
// 用于显示详细的调试信息
func LogDebug(format string, args ...interface{}) {
	if enableDebugLog {
		log.Printf(format, args...)
	}
}

// LogFormat 格式化日志（仅在 --debug 模式显示）
// opType: 操作类型（接收、发送、处理等）
// protocol: 协议类型（HTTP、SSE、系统）
// flow: 消息流向（手机端 --> 服务端 等）
// format: 详细内容格式
func LogFormat(opType, protocol, flow, format string, args ...interface{}) {
	if enableDebugLog {
		message := fmt.Sprintf(format, args...)
		log.Printf("[%s][%s] %s %s", opType, protocol, flow, message)
	}
}

// logPrintf 包内私有函数（小写开头），只能在 network 包内使用
func logPrintf(format string, args ...interface{}) {
	if enableDebugLog {
		log.Printf(format, args...)
	}
}