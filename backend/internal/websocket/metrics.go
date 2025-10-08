package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Client represents a WebSocket client
type Client struct {
	ID       string
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
	LastPing time.Time
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mutex      sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	ticker := time.NewTicker(1 * time.Second) // Send metrics every second
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client %s connected. Total clients: %d", client.ID, len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mutex.Unlock()
			log.Printf("Client %s disconnected. Total clients: %d", client.ID, len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()

		case <-ticker.C:
			// Send metrics to all connected clients
			metrics, err := collectRealtimeMetrics()
			if err != nil {
				log.Printf("Error collecting metrics: %v", err)
				continue
			}

			data, err := json.Marshal(metrics)
			if err != nil {
				log.Printf("Error marshaling metrics: %v", err)
				continue
			}

			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.Send <- data:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// RealtimeMetrics represents real-time system metrics
type RealtimeMetrics struct {
	Timestamp time.Time `json:"timestamp"`
	CPU       float64   `json:"cpu"`
	Memory    float64   `json:"memory"`
	Disk      float64   `json:"disk"`
	Network   NetworkIO `json:"network"`
}

// NetworkIO represents network I/O statistics
type NetworkIO struct {
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
}

var (
	lastNetworkBytesSent uint64
	lastNetworkBytesRecv uint64
	lastNetworkPacketsSent uint64
	lastNetworkPacketsRecv uint64
	networkMutex sync.Mutex
)

// collectRealtimeMetrics collects real-time system metrics
func collectRealtimeMetrics() (*RealtimeMetrics, error) {
	// CPU usage
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return nil, err
	}

	var cpuUsage float64
	if len(cpuPercent) > 0 {
		cpuUsage = cpuPercent[0]
	}

	// Memory usage
	memStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	// Disk usage
	diskUsage, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	// Network I/O
	networkIO, err := collectNetworkIO()
	if err != nil {
		return nil, err
	}

	return &RealtimeMetrics{
		Timestamp: time.Now(),
		CPU:       cpuUsage,
		Memory:    memStat.UsedPercent,
		Disk:      diskUsage.UsedPercent,
		Network:   *networkIO,
	}, nil
}

// collectNetworkIO collects network I/O statistics
func collectNetworkIO() (*NetworkIO, error) {
	ioCounters, err := net.IOCounters(true)
	if err != nil {
		return nil, err
	}

	var totalBytesSent, totalBytesRecv, totalPacketsSent, totalPacketsRecv uint64
	for _, ioCounter := range ioCounters {
		totalBytesSent += ioCounter.BytesSent
		totalBytesRecv += ioCounter.BytesRecv
		totalPacketsSent += ioCounter.PacketsSent
		totalPacketsRecv += ioCounter.PacketsRecv
	}

	networkMutex.Lock()
	defer networkMutex.Unlock()

	// Calculate deltas
	bytesSentDelta := totalBytesSent - lastNetworkBytesSent
	bytesRecvDelta := totalBytesRecv - lastNetworkBytesRecv
	packetsSentDelta := totalPacketsSent - lastNetworkPacketsSent
	packetsRecvDelta := totalPacketsRecv - lastNetworkPacketsRecv

	// Update last values
	lastNetworkBytesSent = totalBytesSent
	lastNetworkBytesRecv = totalBytesRecv
	lastNetworkPacketsSent = totalPacketsSent
	lastNetworkPacketsRecv = totalPacketsRecv

	return &NetworkIO{
		BytesSent:   bytesSentDelta,
		BytesRecv:   bytesRecvDelta,
		PacketsSent: packetsSentDelta,
		PacketsRecv: packetsRecvDelta,
	}, nil
}

// Global hub instance
var GlobalHub *Hub

// InitializeWebSocket initializes the WebSocket hub
func InitializeWebSocket() {
	GlobalHub = NewHub()
	go GlobalHub.Run()
	log.Println("WebSocket hub initialized")
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(c *gin.Context) {
	// Check for authentication token in query parameters
	token := c.Query("token")
	if token == "" {
		log.Printf("WebSocket connection rejected: no token provided")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// TODO: Validate token here if needed
	// For now, we'll just check if it exists
	log.Printf("WebSocket connection with token: %s", token[:10]+"...")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		ID:       generateClientID(),
		Conn:     conn,
		Send:     make(chan []byte, 256),
		Hub:      GlobalHub,
		LastPing: time.Now(),
	}

	client.Hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// generateClientID generates a unique client ID
func generateClientID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.LastPing = time.Now()
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
