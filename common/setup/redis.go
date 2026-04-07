package setup

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"time"
)

// dialRedis 使用原生 TCP 连接测试 Redis 可用性
// 避免引入额外的 redis 客户端依赖
func dialRedis(addr, password string, db int) (net.Conn, error) {
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return nil, fmt.Errorf("TCP 连接失败: %w", err)
	}

	reader := bufio.NewReader(conn)

	// 如果有密码，先 AUTH
	if password != "" {
		cmd := fmt.Sprintf("*2\r\n$4\r\nAUTH\r\n$%d\r\n%s\r\n", len(password), password)
		if _, err := conn.Write([]byte(cmd)); err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("AUTH 命令发送失败: %w", err)
		}
		reply, err := reader.ReadString('\n')
		if err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("AUTH 响应读取失败: %w", err)
		}
		if !strings.HasPrefix(reply, "+OK") {
			_ = conn.Close()
			return nil, fmt.Errorf("Redis 认证失败: %s", strings.TrimSpace(reply))
		}
	}

	// SELECT 数据库
	if db > 0 {
		dbStr := fmt.Sprintf("%d", db)
		cmd := fmt.Sprintf("*2\r\n$6\r\nSELECT\r\n$%d\r\n%s\r\n", len(dbStr), dbStr)
		if _, err := conn.Write([]byte(cmd)); err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("SELECT 命令发送失败: %w", err)
		}
		reply, err := reader.ReadString('\n')
		if err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("SELECT 响应读取失败: %w", err)
		}
		if !strings.HasPrefix(reply, "+OK") {
			_ = conn.Close()
			return nil, fmt.Errorf("Redis SELECT DB %d 失败: %s", db, strings.TrimSpace(reply))
		}
	}

	// PING 测试
	if _, err := conn.Write([]byte("*1\r\n$4\r\nPING\r\n")); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("PING 命令发送失败: %w", err)
	}
	reply, err := reader.ReadString('\n')
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("PING 响应读取失败: %w", err)
	}
	if !strings.HasPrefix(reply, "+PONG") {
		_ = conn.Close()
		return nil, fmt.Errorf("Redis PING 失败: %s", strings.TrimSpace(reply))
	}

	return conn, nil
}
