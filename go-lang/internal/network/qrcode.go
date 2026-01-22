// Package network 提供二维码生成相关功能（简化实现）
// Package network provides QR code generation functionality (simplified implementation)
package network

import (
	"fmt"
)

// GenerateQRCodeText 生成二维码的文本描述（占位实现）
// GenerateQRCodeText generates QR code text description (placeholder implementation)
func GenerateQRCodeText(url string) string {
	// 简化版：返回 URL 和说明
	// 实际项目中应使用 github.com/skip2/go-qrcode 生成真实二维码
	return fmt.Sprintf("QR Code: %s\n请扫描或手动输入此地址", url)
}

// GenerateQRCodeData 生成二维码相关数据，包括 URL、IP、端口等信息
// GenerateQRCodeData generates QR code related data, including URL, IP, port, etc.
func GenerateQRCodeData(ip string, port int) map[string]interface{} {
	// 手机端访问地址：http://IP:端口（不需要 /mobile 路径） / Mobile access address: http://IP:port (no /mobile path needed)
	url := fmt.Sprintf("http://%s:%d", ip, port)
	return map[string]interface{}{
		"url":     url,
		"ip":      ip,
		"port":    port,
		"text":    GenerateQRCodeText(url),
		"message": "请扫描二维码或手动输入地址 / Scan QR code or enter address manually",
	}
}
