# FaucetToken dApp

Una aplicación descentralizada (dApp) para reclamar tokens de un faucet en la red de prueba Ethereum Sepolia. La aplicación utiliza Next.js tanto para el frontend como para el backend, implementando autenticación Web3 con Sign-In with Ethereum (SIWE).

## 🚀 Características

- ✅ Conexión de Wallet (MetaMask y otros)
- ✅ Autenticación Web3 con SIWE
- ✅ Verificación de estado de reclamo
- ✅ Reclamar tokens (una vez por dirección)
- ✅ Vista de usuarios que han reclamado
- ✅ Información del balance de tokens
- ✅ Backend seguro con JWT
- ✅ Interfaz de usuario responsive

## 🛠 Tecnologías

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Wagmi (Web3 React Hooks)
- Web3Modal
- Viem

### Backend
- Next.js API Routes
- Sign-In with Ethereum (SIWE)
- JSON Web Tokens (JWT)
- Ethers.js

## 📋 Prerrequisitos

1. **Node.js** (versión 18 o superior)
2. **MetaMask** u otra wallet compatible con EVM
3. **ETH en Sepolia** para gas fees (obtener desde [faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
4. **Clave privada** para el backend (wallet con ETH para pagar gas)
5. **Project ID de WalletConnect** (gratis en [WalletConnect Cloud](https://cloud.walletconnect.com))

## 🔧 Instalación y Configuración

### 1. Clonar y setup inicial

```bash
cd faucet-dapp
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.local` y configura las siguientes variables:

```bash
# Backend Configuration
PRIVATE_KEY=your_private_key_here
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412

# Frontend Configuration
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id_here
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

#### Variables importantes:

- **PRIVATE_KEY**: Clave privada de una wallet con ETH en Sepolia (el backend usará esta wallet para pagar gas)
- **JWT_SECRET**: Una clave secreta larga para firmar JWT tokens
- **NEXT_PUBLIC_PROJECT_ID**: Tu Project ID de WalletConnect Cloud

### 3. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Cómo usar

### 1. Conectar Wallet
- Haz clic en "Connect Wallet"
- Selecciona MetaMask u otra wallet
- Asegúrate de estar en Sepolia Testnet

### 2. Autenticarse
- Después de conectar, haz clic en "Sign In with Ethereum"
- Firma el mensaje en tu wallet
- La autenticación usa SIWE para mayor seguridad

### 3. Reclamar Tokens
- Si tu dirección no ha reclamado, verás el botón "Claim Tokens"
- Haz clic y espera la confirmación
- El backend procesará la transacción

### 4. Ver Información
- Balance de tokens actual
- Estado de reclamo
- Lista de usuarios que han reclamado
- Información del contrato

## 🏗 Arquitectura

### Frontend
```
components/
├── Providers.tsx        # Configuración de proveedores Web3
├── WalletConnection.tsx # Manejo de conexión de wallet
└── FaucetDashboard.tsx  # Dashboard principal

lib/
├── config.ts           # Configuración Wagmi
├── abi.ts             # ABI del contrato
├── utils.ts           # Utilidades
└── api.ts             # Cliente API
```

### Backend API
```
app/api/
├── auth/
│   ├── message/route.ts  # POST - Generar mensaje SIWE
│   └── signin/route.ts   # POST - Verificar firma y generar JWT
└── faucet/
    ├── claim/route.ts              # POST - Reclamar tokens
    └── status/[address]/route.ts   # GET - Estado del faucet
```

## 🔐 Seguridad

- **Autenticación Web3**: Usa SIWE para verificar propiedad de wallet
- **JWT Tokens**: Tokens con expiración de 24 horas
- **Middleware de Auth**: Protege endpoints sensibles
- **Validación**: Verificación de firmas y nonces
- **Rate Limiting**: El contrato permite solo un reclamo por dirección

## 🚨 Solución de Problemas

### Error de conexión
- Verifica que estés en Sepolia Testnet
- Actualiza MetaMask si hay problemas

### Error de autenticación
- Revisa las variables de entorno
- Asegúrate de que JWT_SECRET esté configurado

### Error en claim
- Verifica que la wallet del backend tenga ETH
- Confirma que no hayas reclamado anteriormente

### Error de configuración
- Revisa que todas las variables de entorno estén configuradas
- Verifica el NEXT_PUBLIC_PROJECT_ID de WalletConnect

## 📚 Recursos Adicionales

- [Contrato en Sepolia Etherscan](https://sepolia.etherscan.io/address/0x3e2117c19a921507ead57494bbf29032f33c7412#code)
- [Faucet ETH Sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [WalletConnect Cloud](https://cloud.walletconnect.com)
- [Wagmi Documentation](https://wagmi.sh/)
- [SIWE Documentation](https://docs.login.xyz/)

## 🤝 Contribuciones

Este es un proyecto educativo. Las contribuciones son bienvenidas para mejorar la funcionalidad y agregar nuevas características.

## 📝 Licencia

MIT License - ver archivo LICENSE para más detalles.
