import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { metaMask } from "wagmi/connectors";

const SEPOLIA_ID = 11155111;

export default function WalletStatus() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const wrongNetwork = isConnected && chainId !== SEPOLIA_ID;

  const handleConnect = async () => {
    console.log('=== DEBUG INFO ===');
    console.log('Botón clickeado!', { isConnected });
    console.log('window.ethereum exists?', typeof window.ethereum !== 'undefined');
    console.log('window.ethereum:', window.ethereum);
    console.log('window.ethereum.isMetaMask?', window.ethereum?.isMetaMask);
    console.log('hasMetaMask calculated:', hasMetaMask);
    console.log('Multiple providers?', window.ethereum?.providers);
    console.log('==================');
    
    if (isConnected) {
      console.log('Desconectando...');
      disconnect();
      return;
    }
    
    console.log('Conectando...');
    
    // Verificación más específica
    if (typeof window.ethereum === 'undefined') {
      alert('No se detectó ninguna wallet. Por favor instala MetaMask: https://metamask.io/');
      return;
    }
    
    if (!window.ethereum.isMetaMask && !window.ethereum.providers?.some((p: any) => p.isMetaMask)) {
      alert('MetaMask no detectado. Asegúrate de tenerlo instalado y habilitado.');
      return;
    }
    
    try {
      console.log('Intentando conectar con metaMask()...');
      await connect({ connector: metaMask() });
      console.log('¡Conexión exitosa!');
    } catch (error: any) {
      console.error('Error al conectar:', error);
      alert(`Error de conexión: ${error.message || error.toString()}`);
    }
  };

  console.log('WalletStatus render:', { status, isConnected, address, connectError });

  const hasMetaMask = typeof window !== 'undefined' && 
    typeof window.ethereum !== 'undefined' && 
    (window.ethereum.isMetaMask || window.ethereum.providers?.some((p: any) => p.isMetaMask));

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
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <span>⚠️</span>
                    <span className="text-xs">Necesitas cambiar a la red Sepolia en MetaMask</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {!hasMetaMask ? (
            <a
              href="https://metamask.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all hover:scale-105 text-center"
            >
              📥 Instalar MetaMask
            </a>
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
                : "🦊 Conectar MetaMask"
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
