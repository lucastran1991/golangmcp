import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL, // Remove /api prefix since backend doesn't use it
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for CSRF tokens
});

// CSRF token management
let csrfToken: string | null = null;

// Function to get CSRF token
const getCSRFToken = async () => {
  if (!csrfToken) {
    try {
      const response = await axios.get(`${API_BASE_URL}/security/csrf-token`, {
        withCredentials: true,
      });
      csrfToken = response.data.csrf_token;
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }
  }
  return csrfToken;
};

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      const csrf = await getCSRFToken();
      if (csrf) {
        config.headers['X-CSRF-Token'] = csrf;
      }
    }
    
    // For multipart form data, let axios set the Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session data using session utilities
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('tokenExpiry');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('sessionId');
      
      // Dispatch session expire event
      const event = new CustomEvent('session:expire', { 
        detail: { reason: 'unauthorized' } 
      });
      window.dispatchEvent(event);
      
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: RegisterRequest) => api.post('/register', data),
  login: (data: LoginRequest) => api.post('/login', data),
  logout: () => api.post('/logout'),
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: async (data: UpdateProfileRequest) => {
    const token = await getCSRFToken();
    return api.put('/profile', data, {
      headers: {
        'X-CSRF-Token': token || '',
      },
    });
  },
  changePassword: async (data: ChangePasswordRequest) => {
    const token = await getCSRFToken();
    return api.post('/profile/change-password', data, {
      headers: {
        'X-CSRF-Token': token || '',
      },
    });
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Get CSRF token before making the request
    const token = await getCSRFToken();
    
    return api.post('/profile/avatar', formData, {
      headers: {
        'X-CSRF-Token': token || '',
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
    });
  },
  deleteAvatar: async () => {
    // Get CSRF token before making the request
    const token = await getCSRFToken();
    
    return api.delete('/profile/avatar', {
      headers: {
        'X-CSRF-Token': token || '',
      },
    });
  },
  getSessions: () => api.get('/sessions'),
  invalidateSession: (sessionId: string) => api.delete(`/sessions/${sessionId}`),
  invalidateAllSessions: () => api.delete('/sessions'),
};

// Users API
export const usersAPI = {
  getUsers: () => api.get('/users'),
};

// Security API
export const securityAPI = {
  getCSRFToken: () => api.get('/security/csrf-token'),
  getSecurityStatus: () => api.get('/security/status'),
  getSecurityHeaders: () => api.get('/security/headers'),
};

// Metrics API
export const metricsAPI = {
  getSystemMetrics: () => api.get('/api/metrics/system'),
  getCPUMetrics: () => api.get('/api/metrics/cpu'),
  getMemoryMetrics: () => api.get('/api/metrics/memory'),
  getDiskMetrics: () => api.get('/api/metrics/disk'),
  getNetworkMetrics: () => api.get('/api/metrics/network'),
  getMetricsHistory: () => api.get('/api/metrics/history'),
  getMetricsConfig: () => api.get('/api/metrics/config'),
};

// File Management API
export const filesAPI = {
  getFiles: (params?: { type?: string; search?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    return api.get(`/api/files${queryString ? `?${queryString}` : ''}`);
  },
  getFile: (id: number) => api.get(`/api/files/${id}`),
  uploadFile: async (file: File, description?: string, tags?: string, isPublic?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags);
    if (isPublic !== undefined) formData.append('is_public', isPublic.toString());
    
    const token = await getCSRFToken();
    return api.post('/api/files/upload', formData, {
      headers: {
        'X-CSRF-Token': token || '',
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadFile: (id: number) => api.get(`/api/files/${id}/download`, { responseType: 'blob' }),
  deleteFile: async (id: number) => {
    const token = await getCSRFToken();
    return api.delete(`/api/files/${id}`, {
      headers: {
        'X-CSRF-Token': token || '',
      },
    });
  },
  getFileStats: () => api.get('/api/files/stats'),
  getFileLogs: (id: number, limit?: number, offset?: number) => {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (offset) queryParams.append('offset', offset.toString());
    
    const queryString = queryParams.toString();
    return api.get(`/api/files/${id}/logs${queryString ? `?${queryString}` : ''}`);
  },
};

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expires_at: string;
  session_id: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface SecurityStatus {
  rate_limiting: {
    enabled: boolean;
    limit_per_minute: number;
  };
  cors: {
    enabled: boolean;
    allowed_origins: string[];
  };
  csrf: {
    enabled: boolean;
  };
  headers: {
    xss_protection: boolean;
    hsts: boolean;
  };
  request_limits: {
    max_size_mb: number;
  };
}

// Metrics Types
export interface SystemMetrics {
  timestamp: string;
  cpu: CPUInfo;
  memory: MemInfo;
  disk: DiskInfo;
  network: NetInfo;
  uptime: string;
}

export interface CPUInfo {
  usage: number;
  count: number;
  load_average: number[];
}

export interface MemInfo {
  total: number;
  used: number;
  free: number;
  available: number;
  usage: number;
  swap_total: number;
  swap_used: number;
  swap_free: number;
  swap_usage: number;
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  usage: number;
  devices: DiskDevice[];
}

export interface DiskDevice {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  usage: number;
}

export interface NetInfo {
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  interfaces: NetInterface[];
}

export interface NetInterface {
  name: string;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  is_up: boolean;
}

export interface RealtimeMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: NetworkIO;
}

export interface NetworkIO {
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

// File Management Types
export interface File {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  mime_type: string;
  size: number;
  path: string;
  hash: string;
  user_id: number;
  user: User;
  is_public: boolean;
  description: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface FileStats {
  total_files: number;
  total_size: number;
  files_by_type: Record<string, number>;
  files_by_user: Record<number, number>;
  average_size: number;
  largest_file: number;
  oldest_file: string;
  newest_file: string;
}

export interface FileAccessLog {
  id: number;
  file_id: number;
  file: File;
  user_id: number;
  user: User;
  action: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface UploadFileRequest {
  file: File;
  description?: string;
  tags?: string;
  is_public?: boolean;
}

export default api;
