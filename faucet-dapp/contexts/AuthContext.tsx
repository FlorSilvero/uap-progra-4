'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { apiService } from '@/lib/api'
import { authRateLimiter } from '@/lib/rateLimiter'
import { AuthState } from '@/types'

interface AuthContextType extends AuthState {
  signIn: () => Promise<boolean>
  signOut: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedAddress = localStorage.getItem('auth_address')

    if (savedToken && savedAddress && isConnected && address === savedAddress) {
      setAuthState({
        isAuthenticated: true,
        address: savedAddress,
        token: savedToken,
      })
      apiService.setToken(savedToken)
    }
  }, [address, isConnected])

  // Clear auth state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      signOut()
    }
  }, [isConnected])

  const signIn = async (): Promise<boolean> => {
    if (!address) {
      setError('Wallet no conectada')
      return false
    }

    // Check rate limiting
    if (!authRateLimiter.canMakeRequest(address)) {
      const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(address) / 1000)
      setError(`Demasiados intentos. Espera ${remainingTime} segundos antes de intentar nuevamente.`)
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Obteniendo mensaje SIWE del backend...')
      // Get complete SIWE message from backend
      const messageResponse = await apiService.getMessage(address)
      console.log('Respuesta completa de getMessage:', JSON.stringify(messageResponse, null, 2))
      
      if (!messageResponse.success || !messageResponse.data) {
        console.error('Error obteniendo mensaje:', messageResponse.error)
        throw new Error(messageResponse.error || 'Error al obtener mensaje')
      }

      console.log('Datos de la respuesta:', JSON.stringify(messageResponse.data, null, 2))
      const { message, nonce } = messageResponse.data
      console.log('Mensaje SIWE recibido del backend:', message)
      console.log('Nonce:', nonce)
      
      // Use the message directly from backend (no client-side generation needed)
      const messageToSign = message
      console.log('SIWE message preparado para firmar:', messageToSign)
      console.log('Solicitando firma del usuario...')

      // Sign message
      const signature = await signMessageAsync({
        message: messageToSign,
      })

      console.log('Mensaje firmado, enviando al backend...')

      // Send to backend for verification
      const authResponse = await apiService.signin(messageToSign, signature)

      if (!authResponse.success || !authResponse.data) {
        console.error('Error de autenticación del backend:', authResponse.error)
        throw new Error(authResponse.error || 'Falló la autenticación')
      }

      const { token, address: authAddress } = authResponse.data
      console.log('Autenticación exitosa, guardando token...')

      // Update state
      setAuthState({
        isAuthenticated: true,
        address: authAddress,
        token,
      })

      // Save to localStorage
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_address', authAddress)

      // Set token in API service
      apiService.setToken(token)

      return true
    } catch (err) {
      console.error('Error detallado de autenticación:', err)
      const errorMessage = err instanceof Error ? err.message : 'Falló la autenticación'
      console.error('Mensaje de error:', errorMessage)
      if (err instanceof Error) {
        console.error('Stack trace:', err.stack)
      }
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    setAuthState({
      isAuthenticated: false,
    })
    setError(null)

    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_address')

    // Clear API service token
    apiService.removeToken()
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signOut,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}