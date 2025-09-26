import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { authenticateRequest, createAuthErrorResponse } from '@/lib/auth'
import { FAUCET_TOKEN_ABI } from '@/lib/abi'

const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x3e2117c19a921507ead57494bbf29032f33c7412'
const PRIVATE_KEY = process.env.PRIVATE_KEY

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required')
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth) {
      return createAuthErrorResponse()
    }

    const { address } = auth

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY!, provider)

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, FAUCET_TOKEN_ABI, wallet)

    // Check if address has already claimed
    const hasClaimed = await contract.hasAddressClaimed(address)
    
    if (hasClaimed) {
      return NextResponse.json(
        { error: 'La dirección ya reclamó tokens' },
        { status: 400 }
      )
    }

    // Use mint() as owner to mint tokens to the user's address
    // This assumes the backend wallet is the owner of the contract
    const faucetAmount = ethers.parseEther("100") // 100 tokens
    const tx = await contract.mint(address, faucetAmount)
    await tx.wait()

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
    })
  } catch (error) {
    console.error('Error claiming tokens:', error)
    
    // Handle specific contract errors
    if (error instanceof Error) {
      if (error.message.includes('Address has already claimed')) {
        return NextResponse.json(
          { error: 'La dirección ya reclamó tokens' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Fondos insuficientes para gas en la wallet del backend' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Error al reclamar tokens' },
      { status: 500 }
    )
  }
}