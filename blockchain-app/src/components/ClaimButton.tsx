import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { faucetAddress, faucetAbi } from "../contracts/faucet";

type Props = {
  disabled?: boolean;
  alreadyClaimed?: boolean;
  onConfirmed?: () => void;
  amount?: string | null;
};

export default function ClaimButton({ disabled, alreadyClaimed, onConfirmed, amount }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleClaim = async () => {
    try {
      setIsProcessing(true);
      writeContract({
        address: faucetAddress,
        abi: faucetAbi,
        functionName: "claimTokens",
      });
    } catch (err) {
      console.error("Error claiming tokens:", err);
      setIsProcessing(false);
    }
  };

  // Usar useEffect para manejar cuando se confirma la transacción
  useEffect(() => {
    if (isConfirmed && isProcessing) {
      setIsProcessing(false);
      onConfirmed?.();
    }
  }, [isConfirmed, isProcessing, onConfirmed]);

  const isLoading = isPending || isConfirming || isProcessing;

  // Determinar el estado del botón
  const getButtonContent = () => {
    if (disabled && !alreadyClaimed) {
      return {
        text: "🔒 Conéctate primero",
        className: "bg-zinc-300 text-zinc-600 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400"
      };
    }
    
    if (alreadyClaimed) {
      return {
        text: "✅ Ya reclamaste tus tokens",
        className: "bg-green-100 text-green-700 cursor-not-allowed dark:bg-green-900/30 dark:text-green-400"
      };
    }
    
    if (isLoading) {
      return {
        text: isPending ? "🔄 Confirmando en MetaMask..." : isConfirming ? "⏳ Procesando transacción..." : "🔄 Preparando...",
        className: "bg-blue-400 text-white cursor-not-allowed animate-pulse"
      };
    }
    
    return {
      text: `🎁 Reclamar ${amount || "—"} FTK`,
      className: "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
    };
  };

  const buttonContent = getButtonContent();

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <button
        onClick={handleClaim}
        disabled={disabled || alreadyClaimed || isLoading}
        className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 w-full ${buttonContent.className}`}
      >
        {buttonContent.text}
      </button>

      {/* Estados informativos */}
      {isLoading && (
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {isPending && (
            <div className="flex items-center justify-center gap-2">
              <span>📱</span>
              <span>Confirma la transacción en MetaMask</span>
            </div>
          )}
          {isConfirming && (
            <div className="flex items-center justify-center gap-2">
              <span>⛓️</span>
              <span>Procesando en la blockchain...</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 w-full">
          <div className="text-red-600 text-sm font-medium mb-1">❌ Error al reclamar</div>
          <div className="text-red-500 text-xs">{error.message}</div>
        </div>
      )}

      {/* Éxito */}
      {hash && isConfirmed && (
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 w-full">
          <div className="text-green-600 text-sm font-medium mb-1">🎉 ¡Reclamo exitoso!</div>
          <div className="text-green-500 text-xs">
            <a 
              href={`https://sepolia.etherscan.io/tx/${hash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Ver en Etherscan →
            </a>
          </div>
        </div>
      )}

      {/* Hash de transacción durante procesamiento */}
      {hash && !isConfirmed && (
        <div className="text-center text-xs text-zinc-500">
          <div>Transacción enviada:</div>
          <code className="break-all bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
            {hash}
          </code>
        </div>
      )}
    </div>
  );
}
