import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { faucetAddress, faucetAbi } from "../contracts/faucet";

type Props = {
  refreshKey?: number; // cambia cuando confirmás tx para re-leer
};

export default function FaucetInfo({ refreshKey: _refreshKey }: Props) {
  const { address } = useAccount();

  const { data: amountRaw, isLoading: loadingAmount } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "getFaucetAmount",
  });

  const { data: claimed, isLoading: loadingClaimed } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "hasAddressClaimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: balanceRaw, isLoading: loadingBalance } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const amount = amountRaw ? formatUnits(amountRaw as bigint, 18) : null;
  const balance = balanceRaw ? formatUnits(balanceRaw as bigint, 18) : null;

  return (
    <section className="p-6 bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl backdrop-blur-sm">
      {/* Explicación del faucet */}
      <div className="mb-6 p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl border-l-4 border-purple-500">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm">💧</span>
          </div>
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              ¿Qué es un Faucet de Tokens?
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Es como un <strong>grifo gratuito de monedas digitales</strong>. Te da tokens de prueba para que puedas 
              experimentar sin usar dinero real. ¡Es completamente gratis y seguro!
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">📊 Información del Token</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <EnhancedStat
          icon="🎁"
          label="Tokens por reclamo"
          value={loadingAmount ? "Cargando…" : amount ? `${amount} FTK` : "—"}
          description="Cantidad gratuita que recibirás"
          isHighlight={true}
        />

        <EnhancedStat
          icon={claimed ? "✅" : "⏳"}
          label="Estado de reclamo"
          value={
            !address
              ? "Conéctate primero"
              : loadingClaimed
              ? "Verificando…"
              : claimed
              ? "Ya reclamaste"
              : "¡Disponible!"
          }
          description={claimed ? "Solo se puede reclamar una vez" : "Listo para reclamar"}
          isHighlight={!claimed && !!address}
        />

        <EnhancedStat
          icon="💰"
          label="Tu balance actual"
          value={!address ? "—" : loadingBalance ? "Cargando…" : `${balance ?? "0"} FTK`}
          description="Tokens que ya tienes"
        />
        
        <EnhancedStat
          icon="🔗"
          label="Contrato inteligente"
          value="Sepolia Network"
          description="Red de pruebas segura"
          address={faucetAddress}
        />
      </div>
    </section>
  );
}

function EnhancedStat({ 
  icon, 
  label, 
  value, 
  description, 
  isHighlight = false,
  address 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  description: string;
  isHighlight?: boolean;
  address?: string;
}) {
  return (
    <div className={`p-4 rounded-2xl border transition-all hover:scale-105 ${
      isHighlight 
        ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700" 
        : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</div>
      </div>
      <div className={`text-lg font-bold mb-1 ${isHighlight ? "text-blue-700 dark:text-blue-300" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-zinc-500">{description}</div>
      {address && (
        <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono break-all">
          {address}
        </div>
      )}
    </div>
  );
}
