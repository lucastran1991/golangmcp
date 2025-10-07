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
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
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

// Security API
export const securityAPI = {
  getCSRFToken: () => api.get('/security/csrf-token'),
  getSecurityStatus: () => api.get('/security/status'),
  getSecurityHeaders: () => api.get('/security/headers'),
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

export default api;
