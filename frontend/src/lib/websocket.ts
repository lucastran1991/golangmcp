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
      console.log('WebSocket connect() called');
      console.log('Current WebSocket state:', this.ws ? this.ws.readyState : 'null');
      console.log('Is connecting:', this.isConnecting);
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already open, resolving immediately');
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('Connection already in progress, rejecting');
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      console.log('Starting WebSocket connection process');

      try {
        // Get auth token from localStorage (check both possible keys)
        let token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
          const error = new Error('No authentication token found. Please log in first.');
          console.error('WebSocket connection failed:', error.message);
          throw error;
        }

        // Create WebSocket connection with auth token
        const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
        console.log('Attempting WebSocket connection to:', wsUrl);
        console.log('Token length:', token.length);
        console.log('WebSocket support:', typeof WebSocket !== 'undefined');
        
        try {
          this.ws = new WebSocket(wsUrl);
          console.log('WebSocket object created:', !!this.ws);
          console.log('Initial readyState:', this.ws.readyState);
          
          // Verify WebSocket was created successfully
          if (!this.ws) {
            throw new Error('WebSocket creation returned null');
          }
        } catch (wsError) {
          console.error('Failed to create WebSocket:', wsError);
          this.isConnecting = false;
          reject(new Error(`Failed to create WebSocket: ${wsError.message}`));
          return;
        }

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error('WebSocket connection timeout');
            this.ws.close();
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        // Verify WebSocket is still valid before setting up event handlers
        if (!this.ws) {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          reject(new Error('WebSocket object became null before setting up event handlers'));
          return;
        }

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          console.log('WebSocket URL:', wsUrl);
          console.log('WebSocket readyState:', this.ws ? this.ws.readyState : 'WebSocket is null');
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
          clearTimeout(connectionTimeout);
          console.error('WebSocket error occurred');
          console.error('WebSocket URL:', wsUrl);
          console.error('WebSocket readyState:', this.ws ? this.ws.readyState : 'WebSocket is null');
          console.error('WebSocket state constants:', {
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED
          });
          console.error('Error event details:', {
            type: error.type,
            target: error.target,
            currentTarget: error.currentTarget,
            bubbles: error.bubbles,
            cancelable: error.cancelable,
            defaultPrevented: error.defaultPrevented,
            eventPhase: error.eventPhase,
            isTrusted: error.isTrusted,
            timeStamp: error.timeStamp
          });
          this.isConnecting = false;
          
          // Provide more specific error messages based on readyState
          let errorMessage = 'WebSocket connection failed';
          if (this.ws) {
            switch (this.ws.readyState) {
              case WebSocket.CONNECTING:
                errorMessage = 'WebSocket connection failed during handshake';
                break;
              case WebSocket.OPEN:
                errorMessage = 'WebSocket connection failed after opening';
                break;
              case WebSocket.CLOSING:
                errorMessage = 'WebSocket connection failed during closing';
                break;
              case WebSocket.CLOSED:
                errorMessage = 'WebSocket connection failed and is closed';
                break;
              default:
                errorMessage = 'WebSocket connection failed with unknown state';
            }
          } else {
            errorMessage = 'WebSocket connection failed - WebSocket object is null';
          }
          
          // Call error callback if it exists
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          
          reject(new Error(errorMessage));
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
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
        clearTimeout(connectionTimeout);
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
