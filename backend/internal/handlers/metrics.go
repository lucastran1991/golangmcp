package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// SystemMetrics represents system performance metrics
type SystemMetrics struct {
	Timestamp time.Time `json:"timestamp"`
	CPU       CPUInfo   `json:"cpu"`
	Memory    MemInfo   `json:"memory"`
	Disk      DiskInfo  `json:"disk"`
	Network   NetInfo   `json:"network"`
	Uptime    string    `json:"uptime"`
}

// CPUInfo represents CPU usage information
type CPUInfo struct {
	Usage       float64 `json:"usage"`
	Count       int     `json:"count"`
	LoadAverage []float64 `json:"load_average"`
}

// MemInfo represents memory usage information
type MemInfo struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Available   uint64  `json:"available"`
	Usage       float64 `json:"usage"`
	SwapTotal   uint64  `json:"swap_total"`
	SwapUsed    uint64  `json:"swap_used"`
	SwapFree    uint64  `json:"swap_free"`
	SwapUsage   float64 `json:"swap_usage"`
}

// DiskInfo represents disk usage information
type DiskInfo struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	Usage   float64 `json:"usage"`
	Devices []DiskDevice `json:"devices"`
}

// DiskDevice represents individual disk device information
type DiskDevice struct {
	Device     string  `json:"device"`
	Mountpoint string  `json:"mountpoint"`
	Fstype     string  `json:"fstype"`
	Total      uint64  `json:"total"`
	Used       uint64  `json:"used"`
	Free       uint64  `json:"free"`
	Usage      float64 `json:"usage"`
}

// NetInfo represents network statistics
type NetInfo struct {
	BytesSent     uint64 `json:"bytes_sent"`
	BytesRecv     uint64 `json:"bytes_recv"`
	PacketsSent   uint64 `json:"packets_sent"`
	PacketsRecv   uint64 `json:"packets_recv"`
	Interfaces    []NetInterface `json:"interfaces"`
}

// NetInterface represents network interface information
type NetInterface struct {
	Name        string `json:"name"`
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
	IsUp        bool   `json:"is_up"`
}

var startTime = time.Now()

// GetSystemMetricsHandler returns comprehensive system metrics
func GetSystemMetricsHandler(c *gin.Context) {
	metrics, err := collectSystemMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to collect system metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// GetCPUMetricsHandler returns CPU-specific metrics
func GetCPUMetricsHandler(c *gin.Context) {
	cpuInfo, err := collectCPUMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to collect CPU metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    cpuInfo,
	})
}

// GetMemoryMetricsHandler returns memory-specific metrics
func GetMemoryMetricsHandler(c *gin.Context) {
	memInfo, err := collectMemoryMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to collect memory metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    memInfo,
	})
}

// GetDiskMetricsHandler returns disk-specific metrics
func GetDiskMetricsHandler(c *gin.Context) {
	diskInfo, err := collectDiskMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to collect disk metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    diskInfo,
	})
}

// GetNetworkMetricsHandler returns network-specific metrics
func GetNetworkMetricsHandler(c *gin.Context) {
	netInfo, err := collectNetworkMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to collect network metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    netInfo,
	})
}

// collectSystemMetrics collects all system metrics
func collectSystemMetrics() (*SystemMetrics, error) {
	cpuInfo, err := collectCPUMetrics()
	if err != nil {
		return nil, fmt.Errorf("failed to collect CPU metrics: %w", err)
	}

	memInfo, err := collectMemoryMetrics()
	if err != nil {
		return nil, fmt.Errorf("failed to collect memory metrics: %w", err)
	}

	diskInfo, err := collectDiskMetrics()
	if err != nil {
		return nil, fmt.Errorf("failed to collect disk metrics: %w", err)
	}

	netInfo, err := collectNetworkMetrics()
	if err != nil {
		return nil, fmt.Errorf("failed to collect network metrics: %w", err)
	}

	uptime := time.Since(startTime)

	return &SystemMetrics{
		Timestamp: time.Now(),
		CPU:       *cpuInfo,
		Memory:    *memInfo,
		Disk:      *diskInfo,
		Network:   *netInfo,
		Uptime:    uptime.String(),
	}, nil
}

// collectCPUMetrics collects CPU usage information
func collectCPUMetrics() (*CPUInfo, error) {
	// Get CPU usage percentage
	percentages, err := cpu.Percent(time.Second, false)
	if err != nil {
		return nil, err
	}

	var cpuUsage float64
	if len(percentages) > 0 {
		cpuUsage = percentages[0]
	}

	// Get CPU count
	cpuCount, err := cpu.Counts(true)
	if err != nil {
		return nil, err
	}

	// Get load average (Unix-like systems)
	var loadAvg []float64
	// Note: LoadAvg is not available in gopsutil v3, skipping for now
	loadAvg = []float64{0, 0, 0}

	return &CPUInfo{
		Usage:       cpuUsage,
		Count:       cpuCount,
		LoadAverage: loadAvg,
	}, nil
}

// collectMemoryMetrics collects memory usage information
func collectMemoryMetrics() (*MemInfo, error) {
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	swapStat, err := mem.SwapMemory()
	if err != nil {
		return nil, err
	}

	return &MemInfo{
		Total:     vmStat.Total,
		Used:      vmStat.Used,
		Free:      vmStat.Free,
		Available: vmStat.Available,
		Usage:     vmStat.UsedPercent,
		SwapTotal: swapStat.Total,
		SwapUsed:  swapStat.Used,
		SwapFree:  swapStat.Free,
		SwapUsage: swapStat.UsedPercent,
	}, nil
}

// collectDiskMetrics collects disk usage information
func collectDiskMetrics() (*DiskInfo, error) {
	// Get root partition usage
	usage, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	// Get all disk partitions
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, err
	}

	var devices []DiskDevice
	for _, partition := range partitions {
		// Skip certain filesystem types
		if partition.Fstype == "tmpfs" || partition.Fstype == "devtmpfs" {
			continue
		}

		deviceUsage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			continue // Skip devices we can't read
		}

		devices = append(devices, DiskDevice{
			Device:     partition.Device,
			Mountpoint: partition.Mountpoint,
			Fstype:     partition.Fstype,
			Total:      deviceUsage.Total,
			Used:       deviceUsage.Used,
			Free:       deviceUsage.Free,
			Usage:      deviceUsage.UsedPercent,
		})
	}

	return &DiskInfo{
		Total:   usage.Total,
		Used:    usage.Used,
		Free:    usage.Free,
		Usage:   usage.UsedPercent,
		Devices: devices,
	}, nil
}

// collectNetworkMetrics collects network statistics
func collectNetworkMetrics() (*NetInfo, error) {
	// Get network I/O counters
	ioCounters, err := net.IOCounters(true)
	if err != nil {
		return nil, err
	}

	var totalBytesSent, totalBytesRecv, totalPacketsSent, totalPacketsRecv uint64
	var interfaces []NetInterface

	for _, ioCounter := range ioCounters {
		totalBytesSent += ioCounter.BytesSent
		totalBytesRecv += ioCounter.BytesRecv
		totalPacketsSent += ioCounter.PacketsSent
		totalPacketsRecv += ioCounter.PacketsRecv

		interfaces = append(interfaces, NetInterface{
			Name:        ioCounter.Name,
			BytesSent:   ioCounter.BytesSent,
			BytesRecv:   ioCounter.BytesRecv,
			PacketsSent: ioCounter.PacketsSent,
			PacketsRecv: ioCounter.PacketsRecv,
			IsUp:        ioCounter.BytesSent > 0 || ioCounter.BytesRecv > 0,
		})
	}

	return &NetInfo{
		BytesSent:     totalBytesSent,
		BytesRecv:     totalBytesRecv,
		PacketsSent:   totalPacketsSent,
		PacketsRecv:   totalPacketsRecv,
		Interfaces:    interfaces,
	}, nil
}

// GetMetricsHistoryHandler returns historical metrics data (placeholder)
func GetMetricsHistoryHandler(c *gin.Context) {
	// This would typically query a time-series database
	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Historical metrics not implemented yet",
		"data":    []interface{}{},
	})
}

// GetMetricsConfigHandler returns metrics collection configuration
func GetMetricsConfigHandler(c *gin.Context) {
	config := gin.H{
		"collection_interval": "1s",
		"retention_period":    "24h",
		"enabled_metrics": []string{
			"cpu",
			"memory",
			"disk",
			"network",
		},
		"thresholds": gin.H{
			"cpu_warning":    80.0,
			"cpu_critical":   95.0,
			"memory_warning": 85.0,
			"memory_critical": 95.0,
			"disk_warning":   90.0,
			"disk_critical":  95.0,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    config,
	})
}
