import { AuthResponse, MessageResponse, ClaimResponse, FaucetStatus, ApiResponse } from '@/types'

class ApiService {
  private baseUrl: string
  private token?: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
  }

  setToken(token: string) {
    this.token = token
  }

  removeToken() {
    this.token = undefined
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async getMessage(address: string): Promise<ApiResponse<MessageResponse>> {
    return this.request<MessageResponse>('/auth/message', {
      method: 'POST',
      body: JSON.stringify({ address }),
    })
  }

  async signin(message: string, signature: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    })
  }

  async claimTokens(): Promise<ApiResponse<ClaimResponse>> {
    return this.request<ClaimResponse>('/faucet/claim', {
      method: 'POST',
    })
  }

  async getFaucetStatus(address: string): Promise<ApiResponse<FaucetStatus>> {
    return this.request<FaucetStatus>(`/faucet/status/${address}`)
  }
}

export const apiService = new ApiService()