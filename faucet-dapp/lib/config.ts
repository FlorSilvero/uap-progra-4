import { defaultWagmiConfig } from '@web3modal/wagmi'
import { sepolia } from 'viem/chains'

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined')
}

const metadata = {
  name: 'FaucetToken dApp',
  description: 'A decentralized faucet application',
  url: 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const chains = [sepolia] as const

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
})

export { sepolia }