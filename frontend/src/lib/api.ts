import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  updateProfile: (data: UpdateProfileRequest) => api.put('/profile', data),
  changePassword: (data: ChangePasswordRequest) => api.post('/profile/change-password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteAvatar: () => api.delete('/profile/avatar'),
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
