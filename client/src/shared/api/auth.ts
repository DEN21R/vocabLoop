import { api } from './api'

export interface RegisterRequest {
  name: string
  email: string
  password: string
}
export interface LoginRequest {
  email: string
  password: string
}
export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface IAuthResponse {
  user: AuthUser
  token: string
}
export interface CurrentUserResponse {
  user: AuthUser
}

export const register = async (
  user: RegisterRequest,
): Promise<IAuthResponse> => {
  const response = await api.post<IAuthResponse>('/auth/register', user)
  return response.data
}

export const login = async (user: LoginRequest): Promise<IAuthResponse> => {
  const response = await api.post<IAuthResponse>('/auth/login', user)
  return response.data
}

export const getMe = async (): Promise<CurrentUserResponse> => {
  const response = await api.get<CurrentUserResponse>('/auth/me')
  return response.data
}
