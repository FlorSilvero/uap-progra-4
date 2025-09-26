import { WalletConnection } from '@/components/WalletConnection'
import { FaucetDashboard } from '@/components/FaucetDashboard'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">FaucetToken dApp</h1>
              <p className="text-gray-600 mt-1">Reclama tus tokens en la testnet Ethereum Sepolia</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Testnet Sepolia
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Connection Section */}
          <WalletConnection />
          
          {/* Dashboard Section */}
          <FaucetDashboard />
          
          {/* Info Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 border">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Acerca de FaucetToken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">Información del Contrato</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Red: Ethereum Sepolia Testnet
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Contrato: 0x3e2117c19a921507ead57494bbf29032f33c7412
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Cantidad de Tokens: 1,000,000 tokens por reclamo
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Límite: Un reclamo por dirección
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">Cómo Usar</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">1</span>
                    Conecta tu MetaMask u otra wallet compatible
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">2</span>
                    Inicia sesión con autenticación de Ethereum
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">3</span>
                    Haz clic en &quot;Reclamar Tokens&quot; si están disponibles
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">4</span>
                    Ve tu balance e historial de transacciones
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Resources */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3">¿Necesitas ETH de Sepolia para gas?</h3>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Faucet de Google Cloud
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="https://sepolia.etherscan.io/address/0x3e2117c19a921507ead57494bbf29032f33c7412" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Ver en Etherscan
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p className="font-medium">Construido con Next.js, Wagmi y Sign-In with Ethereum (SIWE)</p>
            <p className="text-sm mt-2">Autenticación Web3 segura con integración de backend</p>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <span>Chain ID: 11155111</span>
              <span>•</span>
              <span>APIs Backend Protegidas</span>
              <span>•</span>
              <span>Autenticación JWT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
