// Package network 提供 SSE (Server-Sent Events) 服务实现，用于实时推送消息到客户端
// Package network provides SSE (Server-Sent Events) service implementation for real-time message push to clients
package network

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// Message 表示 SSE 推送的消息结构
// Message represents an SSE push message structure
type Message struct {
	Type string `json:"type"` // "text", "heartbeat"
	Data string `json:"data"`
}

// SSEClient 表示一个 SSE 客户端连接
// SSEClient represents an SSE client connection
type SSEClient struct {
	ID        string
	IP        string // 客户端 IP 地址
	Send      chan Message
	Close     chan struct{}
	mu        sync.RWMutex
	isClosed  bool
}

// SSEServer 表示 SSE 服务实例
// SSEServer represents an SSE service instance
type SSEServer struct {
	clients      map[string]*SSEClient
	mu           sync.RWMutex
	register     chan *SSEClient
	unregister   chan *SSEClient
	broadcast    chan Message
	onMessage    func(string) // 接收消息的回调
}

// NewSSEServer 创建 SSE 服务
func NewSSEServer() *SSEServer {
	return &SSEServer{
		clients:    make(map[string]*SSEClient),
		register:   make(chan *SSEClient),
		unregister: make(chan *SSEClient),
		broadcast:  make(chan Message, 256),
	}
}

// SetOnMessage 设置接收消息时的回调函数
// SetOnMessage sets the callback function for receiving messages
func (s *SSEServer) SetOnMessage(callback func(string)) {
	s.onMessage = callback
}

// Run 启动 SSE 服务，阻塞运行直到程序退出
// Run starts the SSE service and blocks until the program exits
func (s *SSEServer) Run() {
	for {
		select {
		case client := <-s.register:
			s.registerClient(client)

		case client := <-s.unregister:
			s.unregisterClient(client)

		case message := <-s.broadcast:
			s.broadcastMessage(message)
		}
	}
}

// registerClient 将新的客户端连接注册到服务中
// registerClient registers a new client connection to the service
func (s *SSEServer) registerClient(client *SSEClient) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 允许多个客户端同时连接 / Allow multiple clients to connect simultaneously
	s.clients[client.ID] = client

	// 判断连接类型 / Determine connection type
	connType := "Unknown device"
	isRemote := !isLocalIP(client.IP)
	if isLocalIP(client.IP) {
		connType = "PC (local)"
	} else {
		connType = "Mobile (remote)"
	}

	log.Printf("[%s] 客户端已连接，当前连接数: %d", connType, len(s.clients))

	// 如果远程设备（手机端）连接，发送信号隐藏二维码 / If remote device (mobile) connects, send signal to hide QR code
	if isRemote {
		s.broadcast <- Message{
			Type: "show_qr",
			Data: "false",
		}
	} else {
		// 如果是 PC 端连接，检查是否已有远程设备，如果有则隐藏二维码
		// If PC connects, check if there are already remote devices, if so hide QR code
		hasRemoteClient := false
		for _, c := range s.clients {
			if !isLocalIP(c.IP) {
				hasRemoteClient = true
				break
			}
		}
		if hasRemoteClient {
			log.Printf("[PC] 检测到已有远程设备连接，隐藏二维码")
			s.broadcast <- Message{
				Type: "show_qr",
				Data: "false",
			}
		}
	}
}

// unregisterClient 从服务中移除指定的客户端连接
func (s *SSEServer) unregisterClient(client *SSEClient) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.clients[client.ID]; ok {
		delete(s.clients, client.ID)

		// 判断连接类型 / Determine connection type
		connType := "Unknown device"
		isRemote := !isLocalIP(client.IP)
		if isLocalIP(client.IP) {
			connType = "PC (local)"
		} else {
			connType = "Mobile (remote)"
		}

		client.mu.Lock()
		client.isClosed = true
		client.mu.Unlock()
		close(client.Send)
		log.Printf("[%s] 客户端已断开，当前连接数: %d", connType, len(s.clients))

		// 如果远程设备（手机端）断开，检查是否还有其他远程设备 / If remote device (mobile) disconnects, check for other remote devices
		if isRemote {
			hasRemoteClient := false
			for _, c := range s.clients {
				if !isLocalIP(c.IP) {
					hasRemoteClient = true
					break
				}
			}
			// 如果没有其他远程设备，发送信号显示二维码 / If no other remote devices, send signal to show QR code
			if !hasRemoteClient {
				s.broadcast <- Message{
					Type: "show_qr",
					Data: "true",
				}
			}
		}
	}
}

// broadcastMessage 将消息发送给所有已连接的客户端
func (s *SSEServer) broadcastMessage(message Message) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, client := range s.clients {
		select {
		case client.Send <- message:
		default:
			// 发送失败，关闭连接 / Send failed, close connection
			client.Close <- struct{}{}
		}
	}
}

// Broadcast 将消息发送给所有已连接的客户端
// Broadcast sends the message to all connected clients
func (s *SSEServer) Broadcast(message Message) {
	s.broadcast <- message
}

// HandleSSE 处理 SSE 连接请求
// HandleSSE handles SSE connection requests
func (s *SSEServer) HandleSSE(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("SSE panic 恢复: %v", r)
		}
	}()

	// 获取客户端 IP / Get client IP
	clientIP := getClientIP(r)

	// 判断连接类型 / Determine connection type
	connType := "Unknown device"
	if isLocalIP(clientIP) {
		connType = "PC (local)"
	} else {
		connType = "Mobile (remote)"
	}

	log.Printf("[%s] 收到连接请求，IP: %s", connType, clientIP)

	// 使用 SSE (Server-Sent Events) 模拟 WebSocket / Use SSE (Server-Sent Events) to simulate WebSocket
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// 创建客户端 / Create client
	clientID := generateClientID()
	client := &SSEClient{
		ID:    clientID,
		IP:    clientIP,
		Send:  make(chan Message, 256),
		Close: make(chan struct{}, 1),
	}

	// 注册客户端 / Register client
	s.register <- client

	// 发送连接成功消息（包含 IP） / Send connection success message (including IP)
	fmt.Fprintf(w, "event: connected\ndata: {\"id\":\"%s\",\"ip\":\"%s\"}\n\n", clientID, clientIP)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	// 心跳定时器 / Heartbeat timer
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	// 处理发送 / Handle sending
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("发送协程 panic 恢复: %v", r)
			}
		}()

		for {
			select {
			case message := <-client.Send:
				client.mu.RLock()
				if client.isClosed {
					client.mu.RUnlock()
					return
				}
				client.mu.RUnlock()

				data, _ := json.Marshal(message)
				fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}

			case <-ticker.C:
				client.mu.RLock()
				if client.isClosed {
					client.mu.RUnlock()
					return
				}
				client.mu.RUnlock()

				fmt.Fprintf(w, "event: heartbeat\ndata: {}\n\n")
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}

			case <-client.Close:
				return
			}
		}
	}()

	// 处理接收（通过 POST 请求） / Handle receiving (via POST request)
	<-r.Context().Done()

	// 注销客户端 / Unregister client
	s.unregister <- client
}

// HandlePostMessage 处理客户端通过 POST 发送的消息
// HandlePostMessage handles messages sent by clients via POST requests
func (s *SSEServer) HandlePostMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 处理心跳 / Handle heartbeat
	if msg.Type == "heartbeat" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 调用回调（会自动广播消息） / Call callback (will automatically broadcast message)
	if s.onMessage != nil && msg.Data != "" {
		s.onMessage(msg.Data)
	}

	w.WriteHeader(http.StatusOK)
}

// getClientIP 从 HTTP 请求中提取客户端 IP 地址
// getClientIP extracts the client IP address from the HTTP request
func getClientIP(r *http.Request) string {
	// 优先从 X-Forwarded-For 获取
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// 从 RemoteAddr 获取
	if r.RemoteAddr != "" {
		lastColon := len(r.RemoteAddr)
		for i := len(r.RemoteAddr) - 1; i >= 0; i-- {
			if r.RemoteAddr[i] == ':' {
				lastColon = i
				break
			}
		}
		if lastColon > 0 {
			return r.RemoteAddr[:lastColon]
		}
	}

	return ""
}

// isLocalIP 判断给定的 IP 地址是否为本地地址
// isLocalIP determines if the given IP address is a local address
func isLocalIP(ip string) bool {
	return ip == "127.0.0.1" || ip == "::1" || ip == "localhost" || ip == ""
}

// generateClientID 生成唯一的客户端标识符
// generateClientID generates a unique client identifier
func generateClientID() string {
	return fmt.Sprintf("client_%d", time.Now().UnixNano())
}
