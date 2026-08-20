export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;  
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;     
  last_login: Date | null; 
  created_at: Date;       
  updated_at: Date;       
  otp_code_hash: string | null;
  otp_expires_at: Date | null;
  two_fa_enabled: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;     
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  status: string;
  message: string;
  data?: {
    user?: {
      id: string;
      email: string;
      username: string;
      role: string;
    };
    tokens?: AuthTokens;
  };
}