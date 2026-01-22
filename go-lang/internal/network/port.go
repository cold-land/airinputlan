// Package network 提供端口适配功能，自动查找可用端口
// Package network provides port adaptation functionality for automatically finding available ports
package network

import (
	"fmt"
	"net"
)

const (
	DefaultPortStart = 5000
	MaxPortTry       = 100
)

// GetAvailablePort 从 5000 端口开始查找可用的端口号
// GetAvailablePort finds an available port starting from port 5000
func GetAvailablePort() (int, error) {
	maxPort := DefaultPortStart + MaxPortTry

	for port := DefaultPortStart; port < maxPort; port++ {
		// 尝试绑定端口
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
		if err == nil {
			listener.Close()
			return port, nil
		}
	}

	return 0, fmt.Errorf("端口适配失败：连续 %d 个端口被占用", MaxPortTry)
}