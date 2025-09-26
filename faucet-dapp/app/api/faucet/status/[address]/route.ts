import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { authenticateRequest, createAuthErrorResponse } from '@/lib/auth'
import { FAUCET_TOKEN_ABI } from '@/lib/abi'

const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x3e2117c19a921507ead57494bbf29032f33c7412'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth) {
      return createAuthErrorResponse()
    }

    const { address } = await params

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Valid address is required' },
        { status: 400 }
      )
    }

    // Create provider (read-only, no private key needed)
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, FAUCET_TOKEN_ABI, provider)

    // Get faucet status
    const [hasClaimed, balance, users, faucetAmount] = await Promise.all([
      contract.hasAddressClaimed(address),
      contract.balanceOf(address),
      contract.getFaucetUsers(),
      contract.getFaucetAmount(),
    ])

    return NextResponse.json({
      hasClaimed,
      balance: balance.toString(),
      users,
      faucetAmount: faucetAmount.toString(),
    })
  } catch (error) {
    console.error('Error getting faucet status:', error)
    return NextResponse.json(
      { error: 'Failed to get faucet status' },
      { status: 500 }
    )
  }
}