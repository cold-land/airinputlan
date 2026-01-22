// Package main 是 AirInputLan 的主程序入口，负责启动 HTTP/SSE 服务、管理单实例、扫描网卡等
// Package main is the main program entry point for AirInputLan.
// It handles HTTP/SSE service startup, single instance management,
// network interface scanning, and browser auto-opening.
package main

import (
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"
	"unicode"

	"airinputlan/internal/netif"
	"airinputlan/internal/network"
	"airinputlan/internal/singleinstance"
	"airinputlan/internal/state"
)

//go:embed web/pc web/mobile
var webFS embed.FS

var (
	contentState *state.ContentState
	httpServer   *network.HttpServer
	sseServer    *network.SSEServer
)

func main() {
	log.Println("AirInputLan 启动中...")
	fmt.Println("AirInputLan - 局域网手机输入同步工具")
	fmt.Println()

	// 单实例检查 / Single instance check
	lock, err := singleinstance.NewLock("main")
	if err != nil {
		log.Fatal("错误: ", err)
		fmt.Println("\n错误: 程序已经在运行中！")
		fmt.Println("请检查系统托盘或任务管理器。")
		return
	}
	defer lock.Release()

	log.Println("单实例检查通过")

	// 扫描网卡 / Scan network interfaces
	ips, err := netif.ScanValidIps()
	if err != nil {
		log.Fatalf("网卡扫描失败: %v", err)
	}

	if len(ips) == 0 {
		log.Fatal("未找到有效网卡")
	}

	// 使用第一个 IP（已按优先级排序：以太网 > USB共享网卡 > WiFi） / Use first IP (sorted by priority: Ethernet > USB Shared > WiFi)
	defaultIP := ips[0].IP

	// 获取可用端口 / Get available port
	port, err := network.GetAvailablePort()
	if err != nil {
		log.Fatalf("端口适配失败: %v", err)
	}

	log.Printf("服务绑定成功: 0.0.0.0:%d", port)
	fmt.Printf("扫描到 %d 个网卡\n", len(ips))
	for _, ip := range ips {
		fmt.Printf("  - IP: %-15s 类型: %-12s 网卡: %s", ip.IP, ip.NicType, ip.IfaceName)
		if ip.IP == defaultIP {
			fmt.Printf(" [默认]")
		}
		fmt.Println()
	}
	fmt.Printf("\n默认访问地址: %s\n", defaultIP)
	fmt.Printf("服务端口: %d\n", port)
	fmt.Println()

	// 初始化内容状态 / Initialize content state
	contentState = state.NewContentState(2*time.Second, 50, 500)

	// 清空之前的内容（防止重启后保留旧内容） / Clear previous content (prevent old content retention)
	contentState.Clear()

	// 初始化 SSE 服务 / Initialize SSE service
	sseServer = network.NewSSEServer()
	sseServer.SetOnMessage(handleMessage)
	go sseServer.Run()

	// 初始化 HTTP 服务（绑定到 0.0.0.0 以支持所有网卡访问） / Initialize HTTP service (bind to 0.0.0.0 for all interfaces)
	httpServer = network.NewHttpServer(port, "0.0.0.0")

	// 注册路由 / Register routes
	httpServer.HandleFunc("/", handleIndex) // Auto-detect based on client IP
	httpServer.HandleFunc("/pc", handlePCIndex)
	httpServer.HandleFunc("/mobile", handleMobileIndex)
	httpServer.HandleFunc("/ws", sseServer.HandleSSE) // Keep /ws for backward compatibility
	httpServer.HandleFunc("/ws/message", sseServer.HandlePostMessage)
	httpServer.HandleFunc("/api/ip", network.HandleGetIP(convertIps(ips)))
	httpServer.HandleFunc("/api/port", network.HandleGetPort(port))

	// 启动 HTTP 服务 / Start HTTP service
	go func() {
		log.Println("HTTP 服务启动...")
		if err := httpServer.Start(); err != nil {
			log.Fatalf("HTTP 服务启动失败: %v", err)
		}
	}()

	// 等待服务启动 / Wait for service startup
	time.Sleep(500 * time.Millisecond)

	// 自动打开浏览器访问电脑端界面 / Auto-open browser to access PC interface
	pcURL := fmt.Sprintf("http://127.0.0.1:%d/", port)
	log.Printf("自动打开浏览器: %s", pcURL)
	openBrowser(pcURL)

	// 启动自动分段定时器 / Start auto-segmentation timer
	go segmentTimer()

	// 显示二维码 / Display QR code
	qrData := network.GenerateQRCodeData(defaultIP, port)
	fmt.Println("=== 连接信息 ===")
	fmt.Printf("手机端访问地址: %s\n", qrData["url"])
	fmt.Printf("二维码文本: %s\n", qrData["text"])
	fmt.Println()

	// 等待退出信号 / Wait for exit signal / Wait for exit signal
	waitForExit()
}

// handleIndex 根据访问 IP 自动判断显示哪个页面
func handleIndex(w http.ResponseWriter, r *http.Request) {
	// 获取客户端 IP / Get client IP
	clientIP := getClientIP(r)
	log.Printf("[HTTP] 收到请求: %s from %s", r.URL.Path, clientIP)

	// 判断是否为本地访问 / Determine if local access
	if isLocalIP(clientIP) {
		// 本地访问，显示电脑端页面 / Local access, show PC interface
		log.Printf("[HTTP] 本地访问，显示电脑端页面")
		handlePCIndex(w, r)
	} else {
		// 远程访问，显示手机端页面 / Remote access, show mobile interface
		log.Printf("[HTTP] 远程访问，显示手机端页面")
		handleMobileIndex(w, r)
	}
}

// getClientIP 获取客户端 IP
func getClientIP(r *http.Request) string {
	// 优先从 X-Forwarded-For 获取 / Prefer X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	
	// 从 RemoteAddr 获取 / Get from RemoteAddr
	if r.RemoteAddr != "" {
		lastColon := strings.LastIndex(r.RemoteAddr, ":")
		if lastColon > 0 {
			return r.RemoteAddr[:lastColon]
		}
	}
	
	return ""
}

// isLocalIP 判断是否为本地 IP
func isLocalIP(ip string) bool {
	return ip == "127.0.0.1" || ip == "::1" || ip == "localhost"
}

// handlePCIndex 处理电脑端首页
func handlePCIndex(w http.ResponseWriter, r *http.Request) {
	log.Printf("[HTTP] 请求 PC 页面: %s", r.URL.Path)
	content, err := webFS.ReadFile("web/pc/index.html")
	if err != nil {
		log.Printf("[HTTP] 读取 PC 页面失败: %v", err)
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(content)
}

// handleMobileIndex 处理手机端首页
func handleMobileIndex(w http.ResponseWriter, r *http.Request) {
	log.Printf("[HTTP] 请求 Mobile 页面: %s", r.URL.Path)
	content, err := webFS.ReadFile("web/mobile/index.html")
	if err != nil {
		log.Printf("[HTTP] 读取 Mobile 页面失败: %v", err)
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(content)
}

// handleMessage 处理接收到的消息（增量内容）
func handleMessage(content string) {
	// 更新当前输入内容（累加） / Update current input content (accumulate)
	if content != "" {
		contentState.UpdateContent(content)
		
		// 立即发送到PC端底部显示（type: "text"） / Immediately send to PC bottom display (type: "text")
		// 注意：这里使用广播 / Note: using broadcast，因为 SendToCurrent 只发送给最后连接的客户端 / Note: using broadcast, SendToCurrent only sends to last connected client
		fullContent := contentState.GetCurrentContent()
		if fullContent != "" {
			sseServer.Broadcast(network.Message{
				Type: "text",
				Data: fullContent,
			})
		}
	}
}

// segmentTimer 自动分段定时器
func segmentTimer() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if contentState.ShouldSegment() {
			content := contentState.GetCurrentContent()
			if content != "" {
				// 检查是否是单独一个空格 / Check if single space
				isSingleSpace := false
				if len(content) == 1 {
					for _, r := range content {
						if unicode.IsSpace(r) {
							isSingleSpace = true
						}
					}
				}
				
				// 如果是单独一个空格，不生成卡片，只清空内容 / If single space, do not create card, just clear content
				if isSingleSpace {
					log.Printf("过滤单独空格")
					contentState.Clear()
					continue
				}
				
				// 添加到历史卡片 / Add to history cards
				contentState.AddCard(content)

				// 发送分段信号给PC端（type: "segment"） / Send segmentation signal to PC (type: "segment")
				// 注意：这里使用广播 / Note: using broadcast
				sseServer.Broadcast(network.Message{
					Type: "segment",
					Data: content,
				})

				log.Printf("自动分段: %s", content)
			}
		}
	}
}

// convertIps 转换 IP 信息
func convertIps(ips []netif.IpInfo) []interface{} {
	result := make([]interface{}, len(ips))
	for i, ip := range ips {
		result[i] = map[string]interface{}{
			"ip":        ip.IP,
			"nicType":   ip.NicType,
			"ifaceName": ip.IfaceName,
		}
	}
	return result
}

// waitForExit 等待退出信号
func waitForExit() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	log.Println("正在退出...")

	// 清理资源 / Clean up resources
	contentState.Clear()
	log.Println("程序已安全退出")

	os.Exit(0)
}

// openBrowser 打开浏览器
func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
	}

	if err != nil {
		log.Printf("无法自动打开浏览器: %v", err)
		fmt.Printf("\n请手动在浏览器中打开: %s\n", url)
	}
}