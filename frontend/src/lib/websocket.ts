import { RealtimeMetrics } from './api';

export class MetricsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private maxReconnectInterval = 30000; // Max 30 seconds
  private onMessageCallback: ((data: RealtimeMetrics) => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private isConnecting = false;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
          const error = new Error('No authentication token found. Please log in first.');
          console.error('WebSocket connection failed:', error.message);
          throw error;
        }

        // Create WebSocket connection with auth token
        const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: RealtimeMetrics = JSON.parse(event.data);
            if (this.onMessageCallback) {
              this.onMessageCallback(data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL:', wsUrl);
          console.error('WebSocket readyState:', this.ws?.readyState);
          this.isConnecting = false;
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          reject(new Error(`WebSocket connection failed: ${error.type || 'Unknown error'}`));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;

          if (this.onCloseCallback) {
            this.onCloseCallback();
          }

          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  onMessage(callback: (data: RealtimeMetrics) => void) {
    this.onMessageCallback = callback;
  }

  onError(callback: (error: Event) => void) {
    this.onErrorCallback = callback;
  }

  onClose(callback: () => void) {
    this.onCloseCallback = callback;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Factory function to create WebSocket connection
export function createMetricsWebSocket(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'): MetricsWebSocket {
  const wsUrl = baseUrl.replace('http', 'ws') + '/ws/metrics';
  return new MetricsWebSocket(wsUrl);
}
