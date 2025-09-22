import { useReadContract } from "wagmi";
import { isAddress } from "viem";
import { faucetAddress, faucetAbi } from "../contracts/faucet";

type Props = {
  refreshKey?: number;
  current?: string | undefined;
};

export default function UsersList({ refreshKey: _refreshKey, current }: Props) {
  const { data: users, isLoading, error } = useReadContract({
    address: faucetAddress,
    abi: faucetAbi,
    functionName: "getFaucetUsers",
  });

  return (
    <section className="p-6 bg-white/80 dark:bg-zinc-900/80 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl backdrop-blur-sm">
      {/* Explicación de la lista */}
      <div className="mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border-l-4 border-indigo-500">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm">👥</span>
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
              ¿Por qué veo otros usuarios?
            </h3>
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              En blockchain, <strong>todo es público y transparente</strong>. Esta lista muestra todas las personas 
              que han usado este faucet antes. ¡Es como un registro público que no se puede borrar!
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">📜 Historial Público</h2>
        {Array.isArray(users) && users.length > 0 && (
          <span className="bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded-full font-medium">
            {users.length} usuario{users.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-indigo-600">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando historial desde blockchain...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl">
          ❌ Error al cargar el historial
        </div>
      ) : Array.isArray(users) && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((u, i) => {
            const addr = String(u);
            const itsMe = current && addr.toLowerCase() === current.toLowerCase();
            return (
              <div 
                key={`${addr}-${i}`} 
                className={`p-4 rounded-xl border transition-all hover:scale-102 ${
                  itsMe 
                    ? "bg-gradient-to-r from-green-50 to-blue-50 border-green-200 dark:from-green-900/20 dark:to-blue-900/20 dark:border-green-700" 
                    : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      itsMe ? "bg-green-500 text-white" : "bg-indigo-500 text-white"
                    }`}>
                      {itsMe ? "TÚ" : `#${i + 1}`}
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">
                        {itsMe ? "Tu dirección" : `Usuario ${i + 1}`}
                      </div>
                      <code className="text-xs bg-white dark:bg-zinc-900 px-2 py-1 rounded font-mono break-all">
                        {isAddress(addr) ? addr : "(dirección inválida)"}
                      </code>
                    </div>
                  </div>
                  {itsMe && (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <span>🎉</span>
                      <span>¡Eres tú!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          <div className="text-center text-xs text-zinc-500 mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
            💡 <strong>Dato curioso:</strong> Estos datos están guardados permanentemente en la blockchain y cualquier persona puede verlos.
            ¡Es la magia de la transparencia!
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500">
          <div className="text-4xl mb-2">👻</div>
          <div>Aún no hay usuarios registrados.</div>
          <div className="text-xs mt-1">¡Sé el primero en reclamar tokens!</div>
        </div>
      )}
    </section>
  );
}
