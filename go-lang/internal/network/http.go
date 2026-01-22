// Package network 提供 HTTP 服务实现，用于处理静态文件和 API 请求
// Package network provides HTTP service implementation for handling static files and API requests
package network

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// HttpServer 表示 HTTP 服务实例
// HttpServer represents an HTTP service instance
type HttpServer struct {
	port int
	ip   string
	mux  *http.ServeMux
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
	fmt.Printf("[HTTP] 启动服务，监听地址: %s\n", addr)
	fmt.Printf("[HTTP] 如果手机无法访问，请检查防火墙和杀毒软件设置\n")
	err := http.ListenAndServe(addr, hs.mux)
	if err != nil {
		fmt.Printf("[HTTP] 服务启动失败: %v\n", err)
	}
	return err
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