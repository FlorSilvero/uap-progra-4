export interface AuthState {
  isAuthenticated: boolean
  address?: string
  token?: string
}

export interface FaucetStatus {
  hasClaimed: boolean
  balance: string
  users: string[]
  faucetAmount?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ClaimResponse {
  txHash: string
  success: boolean
}

export interface AuthResponse {
  token: string
  address: string
}

export interface MessageResponse {
  nonce: string
}