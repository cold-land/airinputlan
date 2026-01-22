// Package netif 提供网卡扫描功能，识别并分类系统中的网络接口
// Package netif provides network interface scanning functionality to identify and classify system network interfaces
package netif

import (
	"fmt"
	"net"
	"runtime"
	"sort"
	"strings"
	"sync"
)

// ScanValidIps 扫描系统中所有有效的 IPv4 地址，按优先级排序返回
// ScanValidIps scans all valid IPv4 addresses in the system and returns them sorted by priority
func ScanValidIps() ([]IpInfo, error) {
	var ips []IpInfo
	var mu sync.Mutex

	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("获取网卡列表失败: %w", err)
	}

	var wg sync.WaitGroup
	for _, iface := range interfaces {
		// 跳过禁用网卡和回环网卡
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		wg.Add(1)
		go func(i net.Interface) {
			defer wg.Done()

			addrs, err := i.Addrs()
			if err != nil {
				return
			}

			for _, addr := range addrs {
				ipNet, ok := addr.(*net.IPNet)
				if !ok {
					continue
				}

				ip := ipNet.IP
				// 仅保留 IPv4，过滤回环地址
				if ip.To4() == nil || ip.IsLoopback() {
					continue
				}

				nicType := getNicType(i.Name)

				mu.Lock()
				ips = append(ips, IpInfo{
					IP:        ip.String(),
					NicType:   nicType,
					IfaceName: i.Name,
				})
				mu.Unlock()
			}
		}(iface)
	}
	wg.Wait()

	// 去重
	ips = deduplicateIps(ips)

	// 排序：以太网 > USB共享网卡 > WiFi > 虚拟网卡
	sort.Slice(ips, func(i, j int) bool {
		// 虚拟网卡排最后
		if ips[i].NicType == "虚拟网卡" && ips[j].NicType != "虚拟网卡" {
			return false
		}
		if ips[i].NicType != "虚拟网卡" && ips[j].NicType == "虚拟网卡" {
			return true
		}
		// 以太网优先
		if ips[i].NicType == "以太网" && ips[j].NicType != "以太网" {
			return true
		}
		if ips[i].NicType != "以太网" && ips[j].NicType == "以太网" {
			return false
		}
		// USB 共享网卡次之
		if ips[i].NicType == "USB共享网卡" && ips[j].NicType != "USB共享网卡" {
			return true
		}
		return false
	})

	return ips, nil
}

// getNicType 确定网络接口类型
// getNicType determines the network interface type
func getNicType(ifaceName string) string {
	// 检测虚拟机网卡
	if isVirtualNic(ifaceName) {
		return "虚拟网卡"
	}
	if detectUsbNic(ifaceName) {
		return "USB共享网卡"
	}
	if strings.HasPrefix(ifaceName, "wlan") || strings.HasPrefix(ifaceName, "wlp") {
		return "WiFi"
	}
	return "以太网"
}

// isVirtualNic 检测是否为虚拟网卡
// isVirtualNic detects if the network interface is a virtual network card
func isVirtualNic(ifaceName string) bool {
	virtualPrefixes := []string{
		// Linux 虚拟网卡
		"virbr", "veth", "docker", "br-", "tun", "tap", "vnet", "utun", "awdl",
		// VMware 虚拟网卡
		"vmnet", "vmware",
		// VirtualBox 虚拟网卡
		"vbox", "vnic",
		// Hyper-V 虚拟网卡
		"vEthernet",
		// KVM/QEMU 虚拟网卡
		"kvm", "qemu",
		// 其他虚拟网卡
		"lxc", "lxd", "podman", "flannel", "cni",
	}
	lowerName := strings.ToLower(ifaceName)
	for _, prefix := range virtualPrefixes {
		if strings.HasPrefix(lowerName, prefix) {
			return true
		}
	}
	return false
}

// detectUsbNic 检测是否为 USB 共享网卡
func detectUsbNic(ifaceName string) bool {
	switch runtime.GOOS {
	case "windows":
		// Windows: RNDIS、USB 字样
		return strings.Contains(strings.ToLower(ifaceName), "rndis") ||
			strings.Contains(strings.ToLower(ifaceName), "usb")
	case "darwin":
		// macOS: bridge、usb 字样
		return strings.Contains(strings.ToLower(ifaceName), "bridge") ||
			strings.Contains(strings.ToLower(ifaceName), "usb")
	case "linux":
		// Linux: usb、enx 前缀
		return strings.Contains(strings.ToLower(ifaceName), "usb") ||
			strings.HasPrefix(ifaceName, "enx")
	default:
		return false
	}
}

// deduplicateIps 去重 IP 地址
// deduplicateIps removes duplicate IP addresses
func deduplicateIps(ips []IpInfo) []IpInfo {
	seen := make(map[string]bool)
	result := make([]IpInfo, 0)

	for _, ip := range ips {
		if !seen[ip.IP] {
			seen[ip.IP] = true
			result = append(result, ip)
		}
	}
	return result
}

// GetUsbShareIp 获取 USB 共享网卡 IP
func GetUsbShareIp() (string, error) {
	ips, err := ScanValidIps()
	if err != nil {
		return "", err
	}

	for _, ip := range ips {
		if ip.NicType == "USB共享网卡" {
			return ip.IP, nil
		}
	}

	// 无 USB 共享网卡，返回第一个有效 IP
	if len(ips) > 0 {
		return ips[0].IP, nil
	}

	return "", fmt.Errorf("未找到有效网卡")
}