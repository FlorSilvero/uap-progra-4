'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useAuth } from '@/contexts/AuthContext'
import { truncateAddress } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function WalletConnection() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isAuthenticated, signIn, signOut, isLoading, error } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleConnect = async () => {
    try {
      const { createWeb3Modal } = await import('@web3modal/wagmi')
      const modal = createWeb3Modal({
        wagmiConfig: (await import('@/lib/config')).wagmiConfig,
        projectId: (await import('@/lib/config')).projectId,
        enableAnalytics: true,
        enableOnramp: true,
      })
      modal.open()
    } catch (error) {
      console.error('Failed to load Web3Modal:', error)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    signOut()
  }

  const handleSignIn = async () => {
    console.log('Iniciando proceso de autenticación...')
    const success = await signIn()
    if (!success) {
      console.error('Error al iniciar sesión')
    } else {
      console.log('Autenticación exitosa')
    }
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800">Conecta tu Wallet</h2>
        <p className="text-gray-600 text-center">
          Conecta tu wallet para interactuar con el contrato FaucetToken
        </p>
        <button
          onClick={handleConnect}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Conectar Wallet
        </button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800">Autenticación Requerida</h2>
        <p className="text-gray-600 text-center">
          Conectado como: <span className="font-mono">{truncateAddress(address || '')}</span>
        </p>
        <p className="text-gray-600 text-center">
          Inicia sesión con Ethereum para acceder al faucet
        </p>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión con Ethereum'}
          </button>
          <button
            onClick={handleDisconnect}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Desconectar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-green-800 font-medium">Conectado y Autenticado</span>
      </div>
      <p className="text-gray-700">
        Dirección: <span className="font-mono">{truncateAddress(address || '')}</span>
      </p>
      <button
        onClick={handleDisconnect}
        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
      >
        Desconectar
      </button>
    </div>
  )
}