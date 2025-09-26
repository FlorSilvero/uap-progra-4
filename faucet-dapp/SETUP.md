# 🔧 Configuración de Variables de Entorno

## Variables Requeridas

### 🔑 PRIVATE_KEY
```
PRIVATE_KEY=tu_clave_privada_aqui
```
- **Qué es**: Clave privada de una wallet con ETH en Sepolia
- **Para qué**: Pagar gas fees cuando los usuarios reclaman tokens
- **Importante**: Esta wallet solo paga gas, los tokens van al usuario
- **Cómo obtenerla**: 
  1. Crea una wallet nueva en MetaMask
  2. Ve a Configuración > Privacidad y Seguridad > Revelar clave privada
  3. Copia la clave (empieza con 0x)
  4. Obtén Sepolia ETH de: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### 🔐 JWT_SECRET
```
JWT_SECRET=mi_secreto_muy_largo_y_seguro_para_jwt_2024
```
- **Qué es**: String secreto para firmar tokens JWT
- **Para qué**: Autenticación segura del backend
- **Requerimientos**: Mínimo 32 caracteres, usa letras, números y símbolos
- **Ejemplo**: `FaucetToken_Super_Secret_Key_2024_$%&!`

### 🌐 NEXT_PUBLIC_PROJECT_ID
```
NEXT_PUBLIC_PROJECT_ID=tu_project_id_de_walletconnect
```
- **Qué es**: ID del proyecto WalletConnect
- **Para qué**: Conectar wallets mediante Web3Modal
- **Cómo obtenerlo**:
  1. Ve a https://cloud.walletconnect.com/
  2. Crea una cuenta
  3. Crea un nuevo proyecto
  4. Copia el "Project ID"

## Variables Pre-configuradas (opcional cambiar)

```env
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Archivo .env.local completo

```env
# Backend Configuration
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
JWT_SECRET=FaucetToken_Super_Secret_Key_2024_Very_Long_And_Secure
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412

# Frontend Configuration
NEXT_PUBLIC_PROJECT_ID=abcd1234efgh5678ijkl9012mnop3456
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3e2117c19a921507ead57494bbf29032f33c7412
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## ✅ Verificación

Después de configurar:

1. **Verifica la wallet**: 
   - Importa la PRIVATE_KEY en MetaMask
   - Cambia a red Sepolia
   - Verifica que tenga ETH

2. **Prueba WalletConnect**: 
   - El PROJECT_ID debería estar en tu dashboard de WalletConnect

3. **Inicia la aplicación**:
   ```bash
   npm run dev
   ```

4. **Prueba la conexión**:
   - Ve a http://localhost:3000
   - Conecta tu wallet
   - Firma el mensaje de autenticación

## 🚨 Seguridad

- **NUNCA** compartas tu PRIVATE_KEY
- **NUNCA** uses tu wallet principal para PRIVATE_KEY
- Crea una wallet específica solo para este proyecto
- El archivo `.env.local` ya está en `.gitignore`

## 🆘 Problemas Comunes

### "Authentication required"
- Verifica que hayas configurado JWT_SECRET
- Asegúrate de firmar el mensaje en la app

### "Insufficient gas fees"  
- La wallet de PRIVATE_KEY necesita más ETH en Sepolia
- Usa el faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### "Invalid Project ID"
- Verifica NEXT_PUBLIC_PROJECT_ID en WalletConnect
- Asegúrate de que el proyecto esté activo

### "Contract interaction failed"
- Verifica que CONTRACT_ADDRESS sea correcta
- Comprueba que RPC_URL funcione