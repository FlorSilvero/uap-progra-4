import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { metaMask, injected } from "wagmi/connectors";
import "./index.css"; // Tailwind
import "./fallback.css"; // Fallback styles

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;
const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL as string;

// Validar que las variables de entorno estén configuradas
if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl || "https://ethereum-sepolia-rpc.publicnode.com"),
  },
});

// Crear Web3Modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: false,
  enableOnramp: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
