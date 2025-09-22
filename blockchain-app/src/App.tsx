import { useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import WalletStatus from "./components/WalletStatus";
import FaucetInfo from "./components/FaucetInfo";
import ClaimButton from "./components/ClaimButton";
import UsersList from "./components/UsersList";
import { faucetAddress, faucetAbi } from "./contracts/faucet";

const SEPOLIA_ID = 11155111;

export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [refreshKey, setRefreshKey] = useState(0);

  // Lecturas compartidas para decidir estados globales
  const { data: claimed } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "hasAddressClaimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: amountRaw } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "getFaucetAmount",
    // Removed unsupported queryKey property
  });

  const amount = useMemo(
    () => (amountRaw ? formatUnits(amountRaw as bigint, 18) : null),
    [amountRaw]
  );

  const wrongNetwork = isConnected && chainId !== SEPOLIA_ID;

  function onConfirmed() {
    // fuerza relecturas en componentes
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-green-50 dark:from-zinc-900 dark:via-slate-800 dark:to-zinc-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header Hero */}
        <header className="text-center py-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-blue-400 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">💧</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
              Token Faucet
            </h1>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto mb-6">
            ¡Bienvenido! 🎉 Aquí puedes obtener <strong>tokens gratuitos</strong> para probar aplicaciones blockchain. 
            Es como un <span className="font-semibold text-blue-600">grifo de monedas virtuales</span> - ¡completamente seguro y gratuito!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 bg-white/50 dark:bg-zinc-800/50 rounded-full px-4 py-2 inline-flex">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Red de pruebas: Sepolia (segura para aprender)
          </div>
        </header>

      <WalletStatus />

      <FaucetInfo refreshKey={refreshKey} />

      <section className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-3xl border border-green-200/50 dark:border-green-700/50 shadow-xl backdrop-blur-sm">
        {/* Explicación del proceso */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            🎁 <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              ¡Reclama tus Tokens Gratis!
            </span>
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
            Obtén <strong>{amount ?? "—"} FTK</strong> instantáneamente. Solo necesitas hacer clic y confirmar en MetaMask.
          </p>
        </div>

        {/* Pasos del proceso */}
        {!claimed && isConnected && !wrongNetwork && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-zinc-800/60 rounded-xl">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Haz clic en reclamar</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-zinc-800/60 rounded-xl">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Confirma en MetaMask</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-zinc-800/60 rounded-xl">
              <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>¡Recibe tus tokens!</span>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <ClaimButton
            disabled={!isConnected || wrongNetwork}
            alreadyClaimed={Boolean(claimed)}
            onConfirmed={onConfirmed}
            amount={amount}
          />
        </div>
      </section>

      <UsersList refreshKey={refreshKey} current={address} />

        {/* Footer educativo */}
        <footer className="text-center py-6 border-t border-zinc-200/50 dark:border-zinc-700/50">
          <div className="text-sm text-zinc-500 space-y-2">
            <p>💡 <strong>¿Nuevo en blockchain?</strong> ¡No te preocupes! Esta es una red de pruebas segura.</p>
            <p>🔒 Usa tokens falsos - No hay riesgo de perder dinero real</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
