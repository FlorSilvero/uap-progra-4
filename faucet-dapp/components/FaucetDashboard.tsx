'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/lib/api'
import { formatTokenAmount, formatNumber, truncateAddress, copyToClipboard } from '@/lib/utils'
import { FaucetStatus } from '@/types'

export function FaucetDashboard() {
  const { address } = useAccount()
  const { isAuthenticated } = useAuth()
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadFaucetStatus = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.getFaucetStatus(address)
      
      if (response.success && response.data) {
        setFaucetStatus(response.data)
      } else {
        setError(response.error || 'Error al cargar el estado del faucet')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isAuthenticated && address) {
      loadFaucetStatus()
    }
  }, [isAuthenticated, address, loadFaucetStatus])

  const handleClaimTokens = async () => {
    setIsClaiming(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiService.claimTokens()
      
      if (response.success && response.data) {
        setSuccess(`¡Tokens reclamados exitosamente! TX: ${response.data.txHash}`)
        // Reload status after successful claim
        setTimeout(() => {
          loadFaucetStatus()
        }, 2000)
      } else {
        setError(response.error || 'Error al reclamar tokens')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setIsClaiming(false)
    }
  }

  const handleCopyAddress = async (addr: string) => {
    try {
      await copyToClipboard(addr)
      // You could add a toast notification here
    } catch {
      console.error('Error al copiar dirección')
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Faucet Status */}
      {faucetStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Token Balance */}
          <div className="p-6 bg-white rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tu Balance</h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatNumber(formatTokenAmount(faucetStatus.balance))}
            </p>
            <p className="text-sm text-gray-500">FaucetToken</p>
          </div>

          {/* Claim Status */}
          <div className="p-6 bg-white rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Estado del Reclamo</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${faucetStatus.hasClaimed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`font-medium ${faucetStatus.hasClaimed ? 'text-green-700' : 'text-yellow-700'}`}>
                {faucetStatus.hasClaimed ? 'Ya Reclamado' : 'Disponible para Reclamar'}
              </span>
            </div>
            {faucetStatus.faucetAmount && (
              <p className="text-sm text-gray-500 mt-1">
                Cantidad: {formatNumber(formatTokenAmount(faucetStatus.faucetAmount))} tokens
              </p>
            )}
          </div>

          {/* Total Users */}
          <div className="p-6 bg-white rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total de Usuarios</h3>
            <p className="text-3xl font-bold text-purple-600">
              {faucetStatus.users.length}
            </p>
            <p className="text-sm text-gray-500">Direcciones que reclamaron</p>
          </div>
        </div>
      )}

      {/* Claim Button */}
      {faucetStatus && !faucetStatus.hasClaimed && (
        <div className="flex justify-center">
          <button
            onClick={handleClaimTokens}
            disabled={isClaiming}
            className="px-8 py-4 bg-green-600 text-white font-semibold text-lg rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming ? 'Reclamando Tokens...' : 'Reclamar Tokens'}
          </button>
        </div>
      )}

      {/* Users List */}
      {faucetStatus && faucetStatus.users.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Usuarios que Reclamaron ({faucetStatus.users.length})
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {faucetStatus.users.map((user, index) => (
                <div
                  key={user}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="font-mono text-sm">
                    {index + 1}. {truncateAddress(user)}
                  </span>
                  <button
                    onClick={() => handleCopyAddress(user)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadFaucetStatus}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Actualizando...' : 'Actualizar Datos'}
        </button>
      </div>
    </div>
  )
}