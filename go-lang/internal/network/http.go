// Package network 提供 HTTP 服务实现，用于处理静态文件和 API 请求
// Package network provides HTTP service implementation for handling static files and API requests
package network

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// HttpServer 表示 HTTP 服务实例
// HttpServer represents an HTTP service instance
type HttpServer struct {
	port   int
	ip     string
	mux    *http.ServeMux
	server *http.Server
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

// Start 启动 HTTP 服务，阻塞运行直到出错
// Start starts the HTTP service and blocks until an error occurs
func (hs *HttpServer) Start() error {
	addr := fmt.Sprintf("%s:%d", hs.ip, hs.port)
	LogFormat("启动", "HTTP", "系统", "启动服务，监听地址: %s", addr)
	LogFormat("提示", "HTTP", "系统", "如果手机无法访问，请检查防火墙和杀毒软件设置")
	
	// 创建 http.Server 实例 / Create http.Server instance
	hs.server = &http.Server{
		Addr:    addr,
		Handler: hs.mux,
	}
	
	err := hs.server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		LogFormat("错误", "HTTP", "系统", "服务启动失败: %v", err)
	}
	return err
}

// Shutdown 优雅关闭 HTTP 服务
// Shutdown gracefully shuts down the HTTP service
func (hs *HttpServer) Shutdown(ctx context.Context) error {
	if hs.server != nil {
		return hs.server.Shutdown(ctx)
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