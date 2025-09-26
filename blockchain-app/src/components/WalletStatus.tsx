import { useAccount, useChainId, useConnect, useDisconnect, useConnectors, useSwitchChain } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";

const SEPOLIA_ID = 11155111;

export default function WalletStatus() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== SEPOLIA_ID;

  // Función para cambiar a la red Sepolia
  const handleSwitchToSepolia = async () => {
    try {
      await switchChain({ chainId: sepolia.id });
    } catch (error: any) {
      console.error('Error switching to Sepolia:', error);
      
      // Manejar errores específicos
      if (error.code === 4902 || error.message?.includes('Unrecognized chain ID')) {
        // La red no está agregada, intentar agregarla
        try {
          if (window.ethereum) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7', // Sepolia en hexadecimal
                chainName: 'Sepolia test network',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              }],
            });
          }
        } catch (addError: any) {
          alert(`Error agregando la red Sepolia: ${addError.message || 'Error desconocido'}`);
        }
      } else if (error.code === 4001) {
        // Usuario rechazó el cambio de red
        return;
      } else {
        alert(`Error cambiando a Sepolia: ${error.message || 'Error desconocido'}`);
      }
    }
  };

  // Función para obtener el mejor conector disponible
  const getBestConnector = () => {
    // 1. Priorizar MetaMask si está disponible
    const metaMaskConnector = connectors.find(
      (connector) => connector.name?.toLowerCase().includes('metamask')
    );
    
    if (metaMaskConnector) {
      return { connector: metaMaskConnector, type: 'MetaMask' };
    }

    // 2. Buscar WalletConnect si está disponible
    const walletConnectConnector = connectors.find(
      (connector) => connector.name?.toLowerCase().includes('walletconnect')
    );
    
    if (walletConnectConnector) {
      return { connector: walletConnectConnector, type: 'WalletConnect' };
    }

    // 3. Fallback a injected (para otros wallets como Brave, etc.)
    const injectedConnector = connectors.find(
      (connector) => connector.name?.toLowerCase().includes('injected')
    );
    
    if (injectedConnector) {
      return { connector: injectedConnector, type: 'Injected' };
    }

    // 4. Si hay al menos un conector disponible, usar el primero
    if (connectors.length > 0) {
      return { connector: connectors[0], type: connectors[0].name || 'Unknown' };
    }

    // 5. Como último recurso, crear nuevo conector MetaMask
    return { connector: metaMask(), type: 'MetaMask (fallback)' };
  };

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
      return;
    }
    
    // Verificar si hay un proveedor Ethereum disponible
    if (typeof window.ethereum === 'undefined') {
      alert('No se detectó ninguna wallet. Por favor instala MetaMask: https://metamask.io/');
      return;
    }
    
    try {
      const { connector, type } = getBestConnector();
      
      console.log(`Conectando usando: ${type}`, { 
        connector: connector.name, 
        availableConnectors: connectors.map(c => ({ name: c.name }))
      });
      
      await connect({ connector });
      
      console.log('¡Conexión exitosa!');
    } catch (error: any) {
      console.error('Error al conectar:', error);
      
      // Mejorar el manejo de errores
      if (error.message?.includes('User rejected')) {
        // Usuario canceló la conexión - no mostrar error
        return;
      }
      
      if (error.message?.includes('No connector provided')) {
        alert('Error: No se pudo encontrar un conector de wallet válido. Asegúrate de tener MetaMask instalado.');
        return;
      }
      
      alert(`Error de conexión: ${error.message || 'Error desconocido'}`);
    }
  };

  // Verificar disponibilidad de wallets con mejor detección
  const hasMetaMask = typeof window !== 'undefined' && 
    typeof window.ethereum !== 'undefined' && 
    (window.ethereum.isMetaMask || 
     window.ethereum.providers?.some((p: any) => p.isMetaMask) ||
     connectors.some(c => c.name?.toLowerCase().includes('metamask')));
     
  const hasConnectors = connectors.length > 0;

  return (
    <section className="p-6 bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl backdrop-blur-sm">
      {/* Explicación sobre wallets */}
      {!isConnected && (
        <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border-l-4 border-blue-500">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm">?</span>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                ¿Qué es una billetera digital (wallet)?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Es como tu <strong>cuenta bancaria digital</strong> para criptomonedas. 
                <strong> MetaMask</strong> es la más popular - te permite recibir, enviar y usar tokens de forma segura.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">🔐 Tu Conexión</h2>
            {isConnected && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Conectado
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {!hasMetaMask && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <strong>MetaMask no detectado</strong>
                  <p className="text-xs mt-1">Necesitas instalar MetaMask para continuar</p>
                </div>
              </div>
            )}
            
            {status === "connecting" && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Conectando a tu billetera...
              </div>
            )}
            
            {status === "reconnecting" && (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                Reconectando...
              </div>
            )}
            
            {status === "disconnected" && (
              <div className="text-zinc-500">
                👋 Conéctate para comenzar a reclamar tokens gratuitos
              </div>
            )}
            
            {status === "connected" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <span>✅</span>
                  <span>¡Genial! Estás conectado</span>
                </div>
                <div className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded font-mono break-all">
                  {address}
                </div>
                {wrongNetwork && (
                  <div className="space-y-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <span>⚠️</span>
                      <span className="text-sm font-medium">Red incorrecta</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Estás conectado a una red diferente. Esta aplicación requiere la red Sepolia.
                    </p>
                    <button
                      onClick={handleSwitchToSepolia}
                      disabled={isSwitching}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSwitching ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Cambiando red...
                        </>
                      ) : (
                        <>
                          🔄 Cambiar a Sepolia
                        </>
                      )}
                    </button>
                    {switchError && (
                      <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                        Error: {switchError.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {!hasMetaMask && typeof window.ethereum === 'undefined' ? (
            <div className="flex flex-col gap-2">
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all hover:scale-105 text-center"
              >
                🦊 Instalar MetaMask
              </a>
              {hasConnectors && (
                <button
                  onClick={handleConnect}
                  disabled={isPending}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all hover:scale-105"
                >
                  📱 Otras Wallets (WalletConnect)
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isPending}
              className={`px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
                isPending 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : isConnected
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              }`}
            >
              {isPending 
                ? "🔄 Conectando..." 
                : isConnected 
                ? "🔓 Desconectar" 
                : hasMetaMask
                ? "🦊 Conectar MetaMask"
                : "💼 Conectar Wallet"
              }
            </button>
          )}
          
          {connectError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              ❌ {connectError.message}
            </div>
          )}
          
          {!isConnected && hasMetaMask && (
            <p className="text-xs text-zinc-500 text-center">
              🔐 Seguro y privado - Solo tú controlas tu billetera
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
