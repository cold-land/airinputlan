// Package network 提供 HTTP 服务实现，用于处理静态文件和 API 请求
// Package network provides HTTP service implementation for handling static files and API requests
package network

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
)

// HttpServer 表示 HTTP 服务实例
// HttpServer represents an HTTP service instance
type HttpServer struct {
	port     int
	ip       string
	mux      *http.ServeMux
	server   *http.Server
	listener net.Listener
}

// NewHttpServer 创建并返回一个新的 HTTP 服务实例
// NewHttpServer creates and returns a new HTTP service instance
func NewHttpServer(port int, ip string) *HttpServer {
	mux := http.NewServeMux()
	return &HttpServer{
		port: port,
		ip:   ip,
		mux:  mux,
	}
}

// HandleFunc 为指定的 URL 模式注册处理函数
// HandleFunc registers a handler function for the specified URL pattern
func (hs *HttpServer) HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request)) {
	hs.mux.HandleFunc(pattern, handler)
}

// Start 启动 HTTP 服务，从 5000 端口开始尝试绑定，阻塞运行直到出错
// Start starts the HTTP service, trying to bind from port 5000, and blocks until an error occurs
func (hs *HttpServer) Start() (int, error) {
	const (
		DefaultPortStart = 5000
		MaxPortTry       = 100
	)
	
	// 从 5000 端口开始尝试绑定
	for port := DefaultPortStart; port < DefaultPortStart+MaxPortTry; port++ {
		addr := fmt.Sprintf("%s:%d", hs.ip, port)
		
		// 创建 listener 尝试绑定端口
		listener, err := net.Listen("tcp", addr)
		if err == nil {
			// 绑定成功
			hs.port = port
			hs.listener = listener
			hs.server = &http.Server{
				Addr:    addr,
				Handler: hs.mux,
			}
			LogFormat("启动", "HTTP", "系统", "服务绑定成功: %s", addr)
			LogFormat("提示", "HTTP", "系统", "如果手机无法访问，请检查防火墙和杀毒软件设置")
			
			// 在 goroutine 中启动服务
			go func() {
				if err := hs.server.Serve(listener); err != nil && err != http.ErrServerClosed {
					LogFormat("错误", "HTTP", "系统", "服务运行错误 (端口 %d): %v", hs.port, err)
				}
			}()
			
			return port, nil
		}
	}
	
	// 所有端口都被占用
	err := fmt.Errorf("端口适配失败：连续 %d 个端口被占用", MaxPortTry)
	LogFormat("错误", "HTTP", "系统", "%v", err)
	return 0, err
}

// Shutdown 优雅关闭 HTTP 服务
// Shutdown gracefully shuts down the HTTP service
func (hs *HttpServer) Shutdown(ctx context.Context) error {
	if hs.server != nil {
		err := hs.server.Shutdown(ctx)
		if hs.listener != nil {
			hs.listener.Close()
		}
		return err
	}
	return nil
}

// HandleGetIP 返回一个处理函数，用于响应获取 IP 列表的请求
// HandleGetIP returns a handler function for responding to IP list requests
func HandleGetIP(ips []interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ips": ips,
		})
	}
}

// HandleGetPort 返回一个处理函数，用于响应获取端口号的请求
// HandleGetPort returns a handler function for responding to port number requests
func HandleGetPort(port int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"port": port,
		})
	}
}