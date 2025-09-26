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
              <p className="text-gray-600 mt-1">Claim your tokens on Ethereum Sepolia testnet</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Sepolia Testnet
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
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">About FaucetToken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">Contract Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Network: Ethereum Sepolia Testnet
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Contract: 0x3e2117c19a921507ead57494bbf29032f33c7412
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Token Amount: 1,000,000 tokens per claim
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Limit: One claim per address
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">How to Use</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">1</span>
                    Connect your MetaMask or compatible wallet
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">2</span>
                    Sign in with Ethereum authentication
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">3</span>
                    Click &quot;Claim Tokens&quot; if available
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">4</span>
                    View your balance and transaction history
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Resources */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3">Need Sepolia ETH for gas fees?</h3>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Google Cloud Faucet
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
                  View on Etherscan
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
            <p className="font-medium">Built with Next.js, Wagmi, and Sign-In with Ethereum (SIWE)</p>
            <p className="text-sm mt-2">Secure Web3 authentication with backend integration</p>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <span>Chain ID: 11155111</span>
              <span>•</span>
              <span>Backend Protected APIs</span>
              <span>•</span>
              <span>JWT Authentication</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
