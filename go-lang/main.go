// Package main 是 AirInputLan 的主程序入口，负责启动 HTTP/SSE 服务、管理单实例、扫描网卡等
// Package main is the main program entry point for AirInputLan.
// It handles HTTP/SSE service startup, single instance management,
// network interface scanning, and browser auto-opening.
package main

import (
	"embed"
	"encoding/json"
	"flag"
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
	"context"

	"airinputlan/internal/netif"
	"airinputlan/internal/network"
	"airinputlan/internal/singleinstance"
	"airinputlan/internal/state"
)

//go:embed web/pc web/mobile
var webFS embed.FS

var (
	contentState      *state.ContentState
	httpServer        *network.HttpServer
	sseServer         *network.SSEServer
	mobileSegmentMode bool = true // 是否使用手机控制分段模式（默认单次输入）
	debugMode         bool
)

func main() {
	// 解析命令行参数 / Parse command line arguments
	flag.BoolVar(&debugMode, "debug", false, "启用调试日志")
	flag.Parse()

	// 初始化日志系统 / Initialize logging system
	network.InitLogger()

	network.LogInfo("AirInputLan 启动中...")
	fmt.Println("AirInputLan - 局域网手机输入同步工具")
	fmt.Println()

	// 单实例检查 / Single instance check
	_, err := singleinstance.NewLock("main")
	if err != nil {
		log.Fatal("错误: ", err)
		fmt.Println("\n错误: 程序已经在运行中！")
		fmt.Println("请检查系统托盘或任务管理器。")
		return
	}
	network.LogInfo("单实例检查通过")

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

	// 显示网卡信息 / Display network interface information
	fmt.Printf("扫描到 %d 个网卡\n", len(ips))
	for _, ip := range ips {
		fmt.Printf("  - IP: %-15s 类型: %-12s 网卡: %s", ip.IP, ip.NicType, ip.IfaceName)
		if ip.IP == defaultIP {
			fmt.Printf(" [默认]")
		}
		fmt.Println()
	}
	fmt.Printf("\n默认访问地址: %s\n", defaultIP)
	fmt.Println()

	// 初始化内容状态 / Initialize content state
	contentState = state.NewContentState(2*time.Second, 50, 1000)
	//contentState = state.NewContentState(6*time.Second, 1000, 500)

	// 清空之前的内容（防止重启后保留旧内容） / Clear previous content (prevent old content retention)
	contentState.Clear()

	// 初始化 SSE 服务 / Initialize SSE service
	sseServer = network.NewSSEServer()
	sseServer.SetOnMessage(handleMessage)
	go sseServer.Run()

	// 初始化 HTTP 服务（绑定到 0.0.0.0 以支持所有网卡访问） / Initialize HTTP service (bind to 0.0.0.0 for all interfaces)
	httpServer = network.NewHttpServer(0, "0.0.0.0")

	// 注册路由 / Register routes
	httpServer.HandleFunc("/", handleIndex) // Auto-detect based on client IP
	httpServer.HandleFunc("/pc", handlePCIndex)
	httpServer.HandleFunc("/mobile", handleMobileIndex)
	httpServer.HandleFunc("/ws", sseServer.HandleSSE) // Keep /ws for backward compatibility
	httpServer.HandleFunc("/ws/message", sseServer.HandlePostMessage)
	httpServer.HandleFunc("/api/ip", network.HandleGetIP(convertIps(ips)))
	httpServer.HandleFunc("/api/segment", handleSegmentRequest)
	httpServer.HandleFunc("/api/mode", handleModeChange)
	httpServer.HandleFunc("/api/mode/query", handleModeQuery)

	// 启动 HTTP 服务（内部会自动尝试端口绑定） / Start HTTP service (will automatically try to bind ports)
	network.LogInfo("HTTP 服务启动中...")
	port, err := httpServer.Start()
	if err != nil {
		log.Fatalf("HTTP 服务启动失败: %v", err)
	}

	// 注册端口 API（需要在端口确定后） / Register port API (after port is determined)
	httpServer.HandleFunc("/api/port", network.HandleGetPort(port))

	// 等待服务启动 / Wait for service startup
	time.Sleep(500 * time.Millisecond)

	// 显示端口信息 / Display port information
	fmt.Printf("服务端口: %d\n", port)
	fmt.Println()

	// 自动打开浏览器访问电脑端界面 / Auto-open browser to access PC interface
	pcURL := fmt.Sprintf("http://127.0.0.1:%d/", port)
	network.LogInfo("自动打开浏览器: %s", pcURL)
	openBrowser(pcURL)

	// 启动自动分段定时器（旧逻辑，兼容模式） / Start auto-segmentation timer (old logic, compatibility mode)
	go segmentTimer()

	// 显示二维码 / Display QR code
	qrData := network.GenerateQRCodeData(defaultIP, port)
	fmt.Println("=== 连接信息 ===")
	fmt.Printf("手机端访问地址: %s\n", qrData["url"])
	fmt.Printf("二维码文本: %s\n", qrData["text"])
	fmt.Println()

	// 等待退出信号 / Wait for exit signal
	waitForExit(httpServer)
}

// handleIndex 根据访问 IP 自动判断显示哪个页面
func handleIndex(w http.ResponseWriter, r *http.Request) {
	// 获取客户端 IP / Get client IP
	clientIP := getClientIP(r)
	network.LogFormat("接收", "HTTP", "客户端 --> 服务端", "收到请求: %s from %s", r.URL.Path, clientIP)

	// 判断是否为本地访问 / Determine if local access
	if isLocalIP(clientIP) {
		// 本地访问，显示电脑端页面 / Local access, show PC interface
		network.LogFormat("处理", "HTTP", "服务端", "本地访问，显示电脑端页面")
		handlePCIndex(w, r)
	} else {
		// 远程访问，显示手机端页面 / Remote access, show mobile interface
		network.LogFormat("处理", "HTTP", "服务端", "远程访问，显示手机端页面")
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
	network.LogFormat("接收", "HTTP", "PC端 --> 服务端", "请求 PC 页面: %s", r.URL.Path)
	content, err := webFS.ReadFile("web/pc/index.html")
	if err != nil {
		network.LogFormat("错误", "HTTP", "服务端", "读取 PC 页面失败: %v", err)
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(content)
}

// handleMobileIndex 处理手机端首页
func handleMobileIndex(w http.ResponseWriter, r *http.Request) {
	network.LogFormat("接收", "HTTP", "手机端 --> 服务端", "请求 Mobile 页面: %s", r.URL.Path)
	
	// 获取客户端 IP
	clientIP := getClientIP(r)
	
	// 检查是否已有手机端连接
	if !isLocalIP(clientIP) {
		// 远程设备（手机端），检查是否已有其他远程设备连接
		hasRemoteClient := false
		sseServer.RLock()
		for _, c := range sseServer.Clients {
			if !isLocalIP(c.IP) {
				hasRemoteClient = true
				break
			}
		}
		sseServer.RUnlock()
		
		if hasRemoteClient {
			network.LogFormat("拒绝", "HTTP", "服务端", "拒绝连接：已有手机端连接，IP: %s", clientIP)
			// 返回错误页面
			content, err := webFS.ReadFile("web/mobile/error.html")
			if err != nil {
				network.LogFormat("错误", "HTTP", "服务端", "读取错误页面失败: %v", err)
				http.Error(w, "已有手机端连接，请稍后再试", http.StatusServiceUnavailable)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Write(content)
			return
		}
	}
	
	content, err := webFS.ReadFile("web/mobile/index.html")
	if err != nil {
		network.LogFormat("错误", "HTTP", "服务端", "读取 Mobile 页面失败: %v", err)
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
				Type: network.TypeText,
				Data: fullContent,
			})
		}
	}
}

// handleSegmentRequest 处理分段请求（由手机端触发）
// handleSegmentRequest handles segmentation requests (triggered by mobile)
func handleSegmentRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 标记为手机控制分段模式 / Mark as mobile-controlled segmentation mode
	mobileSegmentMode = true

	// 检查内容是否有意义 / Check if content is meaningful
	if !state.IsContentMeaningful(req.Content) {
		network.LogDebug("过滤无意义内容: %q", req.Content)
		contentState.Clear()
		w.WriteHeader(http.StatusOK)
		return
	}

	// 生成卡片，获取过滤后的内容 / Add to history cards, get filtered content
	filteredContent := contentState.AddCard(req.Content)
	if filteredContent == "" {
		// 如果过滤后内容为空，跳过发送 / Skip sending if filtered content is empty
		w.WriteHeader(http.StatusOK)
		return
	}

	// 发送卡片消息给PC端（type: "card"） / Send card message to PC (type: "card")
	sseServer.Broadcast(network.Message{
		Type: network.TypeCard,
		Data: filteredContent,
	})

	// 发送清空输入框信号（type: "clear_input"） / Send clear input signal (type: "clear_input")
	sseServer.Broadcast(network.Message{
		Type: network.TypeClearInput,
		Data: "",
	})

	// 清空服务端累积的内容 / Clear accumulated content on server
	contentState.Clear()

	network.LogInfo("收到分段（手机控制）: %s", filteredContent)

	w.WriteHeader(http.StatusOK)
}

// handleModeQuery 处理模式查询请求
func handleModeQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 获取当前模式 / Get current mode
	mode := "continuous"
	if mobileSegmentMode {
		mode = "single"
	}

	// 通过 SSE 发送模式同步消息给所有客户端 / Send mode sync via SSE
	sseServer.Broadcast(network.Message{
		Type: "mode_sync",
		Data: mode,
	})
	if mode == "single" {
		network.LogFormat("查询", "HTTP", "手机端 --> 服务端", "当前为单次输入模式（手机控制分段）")
	} else {
		network.LogFormat("查询", "HTTP", "手机端 --> 服务端", "当前为连续输入模式（服务端控制分段）")
	}

	// 返回当前模式 / Return current mode
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"mode": mode,
	})
}

// handleModeChange 处理模式切换请求（由手机端触发）
// handleModeChange handles mode change requests (triggered by mobile)
func handleModeChange(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Mode string `json:"mode"` // "single" or "continuous"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 清空服务端累积的内容 / Clear accumulated content on server

		contentState.Clear()

		network.LogFormat("处理", "系统", "服务端", "清空服务端累积的内容")

	

		// 发送清空输入框信号给电脑端 / Send clear input signal to PC

		sseServer.Broadcast(network.Message{

			Type: network.TypeClearInput,

			Data: "",

		})

		network.LogFormat("发送", "SSE", "服务端 --> PC端", "发送清空输入框信号")

	

	

		// 更新模式标志 / Update mode flag

		if req.Mode == "single" {

			mobileSegmentMode = true

			network.LogFormat("处理", "系统", "服务端", "切换到单次输入模式（手机控制分段）")

		} else if req.Mode == "continuous" {

			mobileSegmentMode = false

			network.LogFormat("处理", "系统", "服务端", "切换到连续输入模式（服务端控制分段）")

		}

	

		// 发送确认信号给手机端 / Send acknowledgment to mobile

		sseServer.Broadcast(network.Message{

			Type: "mode_ack",

			Data: req.Mode,

		})

		if req.Mode == "single" {

			network.LogFormat("发送", "SSE", "服务端 --> 手机端", "发送确认信号: 单次输入模式")

		} else {

			network.LogFormat("发送", "SSE", "服务端 --> 手机端", "发送确认信号: 连续输入模式")

		}

	w.WriteHeader(http.StatusOK)
}

// segmentTimer 自动分段定时器（旧逻辑，服务端控制分段）
func segmentTimer() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// 只在非手机控制模式下才自动分段 / Only auto-segment when not in mobile control mode
		if !mobileSegmentMode && contentState.ShouldSegment() {
			content := contentState.GetCurrentContent()
			if content != "" {
				// 检查内容是否有意义 / Check if content is meaningful
				if !state.IsContentMeaningful(content) {
					network.LogDebug("过滤无意义内容: %q", content)
					contentState.Clear()
					continue
				}

				// 添加到历史卡片，获取过滤后的内容 / Add to history cards, get filtered content
				filteredContent := contentState.AddCard(content)
				if filteredContent == "" {
					// 如果过滤后内容为空，跳过发送 / Skip sending if filtered content is empty
					continue
				}

				// 发送分段信号给PC端（type: "segment"） / Send segmentation signal to PC (type: "segment")
				// 注意：这里使用广播 / Note: using broadcast
				sseServer.Broadcast(network.Message{
					Type: network.TypeSegment,
					Data: filteredContent,
				})

				// 发送模式同步信号给手机端（确保手机端按钮状态正确） / Send mode sync to mobile (ensure mobile button state is correct)
				mode := "continuous"
				if mobileSegmentMode {
					mode = "single"
				}
				sseServer.Broadcast(network.Message{
					Type: "mode_sync",
					Data: mode,
				})

				network.LogFormat("处理", "系统", "服务端", "自动分段（服务端控制）: %s", filteredContent)
				network.LogInfo("收到分段（服务端控制）: %s", filteredContent)
				network.LogFormat("发送", "SSE", "服务端 --> 手机端", "发送模式同步信号: 连续输入模式")			}
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
// waitForExit waits for exit signal
func waitForExit(httpServer *network.HttpServer) {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	<-sigChan
	network.LogInfo("正在退出...")
	exitStartTime := time.Now()

	// 清理资源 / Clean up resources
	network.LogInfo("清理资源...")
	contentState.Clear()
	network.LogInfo("资源清理完成，耗时: %v", time.Since(exitStartTime))

	// 关闭所有 SSE 连接 / Close all SSE connections
	if sseServer != nil {
		sseCloseStartTime := time.Now()
		network.LogInfo("开始关闭 SSE 连接...")
		sseServer.CloseAllClients()
		network.LogInfo("SSE 连接关闭完成，耗时: %v", time.Since(sseCloseStartTime))
		
		// 等待一小段时间，让 HTTP 请求的 context 被取消
		network.LogInfo("等待 HTTP 请求 context 取消...")
		time.Sleep(50 * time.Millisecond)
		network.LogInfo("HTTP 请求 context 取消完成")
	}

	// 优雅关闭 HTTP 服务 / Gracefully shutdown HTTP service
	if httpServer != nil {
		shutdownStartTime := time.Now()
		network.LogInfo("开始关闭 HTTP 服务...")
		
		// 创建一个通道来接收关闭完成信号
		shutdownDone := make(chan error, 1)
		
		// 在 goroutine 中执行关闭
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			defer cancel()
			shutdownDone <- httpServer.Shutdown(ctx)
		}()
		
		// 等待关闭完成
		err := <-shutdownDone
		shutdownDuration := time.Since(shutdownStartTime)
		
		if err != nil && err != http.ErrServerClosed && err != context.DeadlineExceeded {
			log.Printf("HTTP 服务关闭失败: %v", err)
		} else if err == http.ErrServerClosed {
			network.LogInfo("HTTP 服务已正常关闭，耗时: %v", shutdownDuration)
		} else if err == context.DeadlineExceeded {
			network.LogInfo("HTTP 服务关闭超时（200ms），强制退出，耗时: %v", shutdownDuration)
		} else {
			network.LogInfo("HTTP 服务关闭完成，耗时: %v", shutdownDuration)
		}
	}

	totalDuration := time.Since(exitStartTime)
	network.LogInfo("程序已安全退出，总耗时: %v", totalDuration)
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
		network.LogInfo("无法自动打开浏览器: %v", err)
		fmt.Printf("\n请手动在浏览器中打开: %s\n", url)
	}
}
