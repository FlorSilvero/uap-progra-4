// Application constants and configuration
export const CONFIG = {
  // Blockchain
  CHAIN_ID: 11155111, // Sepolia
  CONTRACT_ADDRESS: '0x3e2117c19a921507ead57494bbf29032f33c7412',
  RPC_URL: 'https://ethereum-sepolia-rpc.publicnode.com',
  
  // Security
  JWT_EXPIRY: '24h',
  NONCE_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  MESSAGE_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  
  // Rate Limiting
  AUTH_RATE_LIMIT: {
    maxAttempts: 3,
    windowMs: 60000, // 1 minute
  },
  CLAIM_RATE_LIMIT: {
    maxAttempts: 2,
    windowMs: 30000, // 30 seconds
  },
  
  // UI
  LOADING_DELAY_MS: 2000,
  ADDRESS_TRUNCATE: {
    start: 6,
    end: 4,
  },
  
  // External URLs
  SEPOLIA_FAUCET_URL: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
  ETHERSCAN_URL: 'https://sepolia.etherscan.io',
} as const

export const MESSAGES = {
  ERRORS: {
    WALLET_NOT_CONNECTED: 'Wallet no conectada',
    AUTHENTICATION_FAILED: 'Falló la autenticación',
    INVALID_SIGNATURE: 'Firma inválida',
    INVALID_CHAIN_ID: 'Chain ID inválido. Usa Sepolia testnet.',
    MESSAGE_EXPIRED: 'El mensaje ha expirado. Genera uno nuevo.',
    ALREADY_CLAIMED: 'La dirección ya reclamó tokens',
    INSUFFICIENT_FUNDS: 'Fondos insuficientes para gas en la wallet del backend',
    TRANSACTION_REVERTED: 'La transacción fue revertida. Verifica que puedas reclamar tokens.',
    NONCE_ERROR: 'Error de nonce. Intenta nuevamente.',
    CONNECTION_ERROR: 'Error de conexión',
    INTERNAL_SERVER_ERROR: 'Error interno del servidor',
  },
  SUCCESS: {
    TOKENS_CLAIMED: '¡Tokens reclamados exitosamente!',
    AUTHENTICATION_SUCCESS: 'Autenticación exitosa',
  },
  INFO: {
    SIGN_MESSAGE: 'Sign in with Ethereum to the app.',
    LOADING: 'Cargando...',
    AUTHENTICATING: 'Iniciando Sesión...',
    CLAIMING: 'Reclamando Tokens...',
  },
} as const