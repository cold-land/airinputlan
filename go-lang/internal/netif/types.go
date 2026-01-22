// Package netif 定义网卡信息相关的数据结构
// Package netif defines data structures for network interface information
package netif

// IpInfo 表示网卡信息
// IpInfo represents network interface information
type IpInfo struct {
	IP        string `json:"ip"`        // IP 地址
	NicType   string `json:"nicType"`   // 网卡类型
	IfaceName string `json:"ifaceName"` // 网卡名称
}