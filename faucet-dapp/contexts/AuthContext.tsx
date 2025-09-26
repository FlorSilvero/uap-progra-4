'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { apiService } from '@/lib/api'
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

    setIsLoading(true)
    setError(null)

    try {
      console.log('Obteniendo nonce para firmar...')
      // Get nonce from backend
      const messageResponse = await apiService.getMessage(address)
      console.log('Respuesta completa de getMessage:', JSON.stringify(messageResponse, null, 2))
      
      if (!messageResponse.success || !messageResponse.data) {
        console.error('Error obteniendo nonce:', messageResponse.error)
        throw new Error(messageResponse.error || 'Error al obtener nonce')
      }

      console.log('Datos de la respuesta:', JSON.stringify(messageResponse.data, null, 2))
      const { nonce } = messageResponse.data
      console.log('Nonce extraído:', nonce, 'tipo:', typeof nonce)

      console.log('Usando constructor básico de SiweMessage...')

      // Try using the basic constructor approach
      const domain = window.location.host
      const origin = window.location.origin
      const statement = 'Sign in with Ethereum to the app.'
      let messageToSign = ''
      
      try {
        // Create message text manually but in the exact format
        messageToSign = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`

        console.log('Mensaje para firmar:')
        console.log(messageToSign)
        console.log('Intentando crear SiweMessage para validar...')
        
        // Try to create SiweMessage just for validation
        const siweMessage = new SiweMessage(messageToSign)
        console.log('SiweMessage creado exitosamente para validación')
      } catch (validationError) {
        console.warn('Error en validación, usando mensaje de respaldo:', validationError)
        // Continue with the message even if validation fails
        messageToSign = `Please sign this message to authenticate with your Ethereum account:
Address: ${address}
Domain: ${domain}
Nonce: ${nonce}
Time: ${new Date().toISOString()}`
        
        console.log('Usando mensaje de respaldo:', messageToSign)
      }
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