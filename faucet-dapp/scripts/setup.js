#!/usr/bin/env node

console.log(`
🚀 FaucetToken dApp - Configuración Inicial
===========================================

Para que la aplicación funcione correctamente, necesitas configurar las siguientes variables de entorno en el archivo .env.local:

📋 REQUERIDO - Variables del Backend:
1. PRIVATE_KEY - Clave privada de una wallet con ETH en Sepolia (para pagar gas del backend)
2. JWT_SECRET - Una clave secreta larga para firmar JWT tokens
3. RPC_URL - Ya configurada (usando nodo público de Sepolia)
4. CONTRACT_ADDRESS - Ya configurada (contrato desplegado)

📋 REQUERIDO - Variables del Frontend:
1. NEXT_PUBLIC_PROJECT_ID - Tu Project ID de WalletConnect Cloud (https://cloud.walletconnect.com)

🔧 Pasos para configurar:

1. Obtener Project ID de WalletConnect:
   • Ve a https://cloud.walletconnect.com
   • Crea una cuenta gratuita
   • Crea un nuevo proyecto
   • Copia el Project ID

2. Configurar wallet del backend:
   • Crea una nueva wallet en MetaMask (para el backend)
   • Ve al faucet de Sepolia: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   • Obtén ETH de prueba para pagar gas
   • Exporta la clave privada (Settings > Security & Privacy > Reveal Private Key)

3. Editar .env.local:
   PRIVATE_KEY=tu_clave_privada_aqui
   JWT_SECRET=una_clave_super_secreta_y_larga_para_jwt
   NEXT_PUBLIC_PROJECT_ID=tu_project_id_de_walletconnect

⚠️ IMPORTANTE:
• La PRIVATE_KEY debe tener ETH en Sepolia para pagar gas
• El JWT_SECRET debe ser una cadena larga y aleatoria
• Nunca compartas tu PRIVATE_KEY con nadie

🎯 Una vez configurado:
• npm run dev - Inicia la aplicación
• Conecta tu wallet personal (diferente a la del backend)
• Cambia a Sepolia Testnet en MetaMask
• ¡Prueba la aplicación!

📚 Recursos útiles:
• Faucet ETH Sepolia: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
• WalletConnect Cloud: https://cloud.walletconnect.com
• Contrato en Etherscan: https://sepolia.etherscan.io/address/0x3e2117c19a921507ead57494bbf29032f33c7412

¿Necesitas ayuda? Revisa el README.md para más información detallada.
`)