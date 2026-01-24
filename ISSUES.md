# AirInputLan 项目问题清单

> 本文档记录了代码审查中发现的所有问题和改进建议
>
> 审查日期：2026-01-24
> 项目版本：v1.1

---

## 🚨 严重问题

### 1. 允许多个手机端同时连接（已知 Bug）

**位置**: `go-lang/internal/network/sse.go:registerClient()`

**问题描述**:
- 当前代码允许任意数量的客户端连接，包括多个手机端
- 设计上应该只支持单设备连接（一个 PC + 一个手机）

**影响**:
- 多个手机同时输入会导致内容混乱
- 无法区分哪个手机在输入
- 可能导致数据竞争和状态不一致

**状态**: ⏳ 待修复（已制定修复计划）

---

### 2. Windows 单实例锁无效

**位置**: `go-lang/internal/singleinstance/lock_windows.go`

**问题描述**:
- Windows 平台的 `lockFileUnix()` 和 `unlockFileUnix()` 函数都是空实现
- Windows 仅依赖 `os.O_EXCL` 标志，但这不能防止多实例运行

**影响**:
- Windows 上可以启动多个程序实例
- 可能导致端口冲突、资源竞争

**建议修复**:
使用 Windows API 实现真正的文件锁：
```go
//go:build windows

package singleinstance

import (
    "os"
    "syscall"
    "unsafe"
)

var (
    kernel32           = syscall.NewLazyDLL("kernel32.dll")
    procLockFileEx     = kernel32.NewProc("LockFileEx")
    procUnlockFileEx   = kernel32.NewProc("UnlockFileEx")
)

const (
    LOCKFILE_EXCLUSIVE_LOCK = 0x00000002
)

func lockFileUnix(file *os.File) error {
    var overlapped syscall.Overlapped
    ret, _, err := procLockFileEx.Call(
        uintptr(file.Fd()),
        uintptr(LOCKFILE_EXCLUSIVE_LOCK),
        0, 1, 0,
        uintptr(unsafe.Pointer(&overlapped)),
    )
    if ret == 0 {
        return err
    }
    return nil
}

func unlockFileUnix(file *os.File) error {
    var overlapped syscall.Overlapped
    ret, _, err := procUnlockFileEx.Call(
        uintptr(file.Fd()),
        0, 1, 0,
        uintptr(unsafe.Pointer(&overlapped)),
    )
    if ret == 0 {
        return err
    }
    return nil
}
```

**状态**: ⏸️ 待修复

---

## ⚠️ 中等问题

### 3. SSE 客户端关闭时可能 panic

**位置**: `go-lang/internal/network/sse.go:unregisterClient()`

**问题描述**:
- `close(client.Send)` 可能在 channel 已关闭时 panic
- 没有检查 channel 是否已关闭

**建议修复**:
```go
func (s *SSEServer) unregisterClient(client *SSEClient) {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.clients[client.ID]; ok {
        delete(s.clients, client.ID)

        client.mu.Lock()
        if !client.isClosed {
            client.isClosed = true
            close(client.Send) // 只在未关闭时才关闭
        }
        client.mu.Unlock()

        // ... 其余代码
    }
}
```

**状态**: ⏸️ 待修复

---

### 4. HTTP 服务没有优雅关闭

**位置**: `go-lang/main.go:waitForExit()`

**问题描述**:
- 程序退出时直接调用 `os.Exit(0)`
- 没有优雅关闭 HTTP 服务和 SSE 连接
- 可能导致连接中断、数据丢失

**建议修复**:
```go
func waitForExit(httpServer *network.HttpServer) {
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    <-sigChan
    log.Println("正在退出...")

    // 清理资源
    contentState.Clear()

    // 优雅关闭 HTTP 服务（需要添加 Shutdown 方法）
    if httpServer != nil {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        httpServer.Shutdown(ctx)
    }

    log.Println("程序已安全退出")
    os.Exit(0)
}
```

**状态**: ⏸️ 待修复

---

### 5. 网卡扫描中的并发安全问题

**位置**: `go-lang/internal/netif/scanner.go:ScanValidIps()`

**问题描述**:
- 使用 `sync.Mutex` 保护 `ips` 切片，但 `append` 可能导致底层数组重新分配
- 虽然使用了互斥锁，但 `append` 的返回值没有被正确处理

**当前代码**:
```go
mu.Lock()
ips = append(ips, IpInfo{...}) // ⚠️ 可能有问题
mu.Unlock()
```

**建议修复**:
```go
mu.Lock()
newIps := append(ips, IpInfo{...})
ips = newIps // 更新外部变量
mu.Unlock()
```

**状态**: ⏸️ 待修复

---

### 6. 前端 XSS 安全风险

**位置**: `go-lang/web/pc/index.html`

**问题描述**:
- 使用 `innerHTML` 直接插入用户内容
- 没有进行 HTML 转义
- 可能导致 XSS 攻击

**影响**:
- 恶意用户可以通过输入注入恶意脚本
- 可能窃取用户数据或执行恶意操作

**建议修复**:
```javascript
// 使用 textContent 替代 innerHTML
card.textContent = text;

// 如果需要高亮，先转义 HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightDuplicates(text) {
    const escaped = escapeHtml(text);
    // ... 然后进行高亮处理
}
```

**状态**: ⏸️ 待修复

---

## 💡 轻微问题和改进建议

### 7. 缺少输入验证

**位置**: `go-lang/main.go:handleSegmentRequest()`

**问题**:
- 没有限制输入内容的最大长度
- 恶意用户可能发送超大内容导致内存耗尽

**建议**:
```go
const MaxContentLength = 10000 // 10KB

if len(req.Content) > MaxContentLength {
    http.Error(w, "Content too large", http.StatusRequestEntityTooLarge)
    return
}
```

**状态**: ⏸️ 待修复

---

### 8. 错误处理不完善

**位置**: 多处

**问题**:
- 一些错误只是记录日志，没有返回给用户
- 用户无法知道操作是否成功

**建议**:
- 在 API 响应中添加错误信息
- 统一错误响应格式

**状态**: ⏸️ 待修复

---

### 9. 缺少日志级别控制

**问题**:
- 所有日志都使用 `log.Println`
- 无法控制日志详细程度
- 生产环境可能产生过多日志

**建议**:
- 使用结构化日志库（如 `logrus` 或 `zap`）
- 添加日志级别配置

**状态**: ⏸️ 待修复

---

### 10. 二维码生成依赖外部 API

**位置**: `go-lang/web/pc/index.html`

**问题**:
- 使用 `api.qrserver.com` 生成二维码
- 依赖外部网络
- 如果 API 不可用，二维码无法显示

**建议**:
- 使用本地二维码生成库（如 `github.com/skip2/go-qrcode`）
- 在服务端生成二维码，返回图片数据

**状态**: ⏸️ 待修复

---

### 11. 端口绑定可能失败

**位置**: `go-lang/internal/network/port.go`

**问题**:
- `GetAvailablePort()` 先绑定再关闭
- 在极短时间内端口可能被其他程序占用
- HTTP 服务启动时可能失败

**建议**:
```go
// 在 HttpServer.Start 中直接尝试绑定
func (hs *HttpServer) Start() error {
    addr := fmt.Sprintf("%s:%d", hs.ip, hs.port)

    listener, err := net.Listen("tcp", addr)
    if err != nil {
        return fmt.Errorf("端口 %d 被占用: %w", hs.port, err)
    }

    return http.Serve(listener, hs.mux)
}
```

**状态**: ⏸️ 待修复

---

### 12. 前端重连逻辑可能累积定时器

**位置**: `go-lang/web/pc/index.html`, `go-lang/web/mobile/index.html`

**问题**:
- 重连时没有清除旧的 `reconnectInterval`
- 可能导致多个定时器同时运行

**建议**:
```javascript
function setupEventSource() {
    // 先清除旧的定时器
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    if (eventSource) {
        eventSource.close();
    }

    // ... 其余代码
}
```

**状态**: ⏸️ 待修复

---

### 13. 手机端分段定时器可能不触发

**位置**: `go-lang/web/mobile/index.html`

**问题**:
- 用户快速连续输入时，`segmentTimeout` 会被不断重置
- 如果用户持续输入，分段可能永远不会触发

**建议**:
- 添加最大输入长度限制
- 或者使用混合策略（时间 + 长度）

**状态**: ⏸️ 待修复

---

### 14. 缺少单元测试

**问题**:
- 整个项目没有单元测试
- 无法验证代码正确性
- 重构时容易引入 bug

**建议**:
- 为核心模块添加单元测试
- 特别是网卡扫描、状态管理、消息处理等

**状态**: ⏸️ 待修复

---

### 15. 缺少健康检查接口

**问题**:
- 没有 `/health` 或 `/ping` 接口
- 无法监控服务是否正常运行

**建议**:
```go
httpServer.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status": "ok",
        "uptime": time.Since(startTime).String(),
    })
})
```

**状态**: ⏸️ 待修复

---

## 📊 总结

### 严重程度统计
- 🚨 **严重问题**: 2 个
- ⚠️ **中等问题**: 4 个
- 💡 **轻微问题**: 11 个

### 优先修复建议
1. **立即修复**: 多设备连接限制（问题 1）✅ 已制定修复计划
2. **尽快修复**: Windows 单实例锁（问题 2）、XSS 安全风险（问题 6）
3. **计划修复**: 优雅关闭（问题 4）、并发安全（问题 5）
4. **持续改进**: 其他轻微问题

### 代码质量评价
- ✅ **优点**: 代码结构清晰、模块化良好、注释完整
- ⚠️ **不足**: 缺少测试、安全防护不足、错误处理不完善
- 🎯 **总体**: 7/10 - 功能完整但需要加强安全性和稳定性

---

## 修复进度

- [x] 问题 1: 多设备连接限制（已制定修复计划，待实施）
- [ ] 问题 2: Windows 单实例锁
- [ ] 问题 3: SSE 客户端关闭 panic
- [ ] 问题 4: HTTP 服务优雅关闭
- [ ] 问题 5: 网卡扫描并发安全
- [ ] 问题 6: 前端 XSS 安全风险
- [ ] 问题 7-15: 其他轻微问题