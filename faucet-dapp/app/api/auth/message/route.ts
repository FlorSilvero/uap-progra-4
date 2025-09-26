import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from 'siwe'

// Store nonces temporarily (in production, use Redis or database)
const nonces = new Map<string, string>()

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    const nonce = generateNonce()
    
    // Store nonce for this address (expires in 10 minutes)
    nonces.set(address.toLowerCase(), nonce)
    setTimeout(() => {
      nonces.delete(address.toLowerCase())
    }, 10 * 60 * 1000)

    const message = `Sign in to FaucetToken dApp with your Ethereum account.`

    return NextResponse.json({
      message,
      nonce,
    })
  } catch (error) {
    console.error('Error generating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { nonces }