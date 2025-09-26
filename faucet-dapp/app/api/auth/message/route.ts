import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from 'siwe'

// Store nonces temporarily (in production, use Redis or database)
const nonces = new Map<string, string>()

export async function POST(request: NextRequest) {
  try {
    console.log('Received message generation request')
    const { address } = await request.json()
    console.log('Request address:', address)

    if (!address) {
      console.error('Missing address in request')
      return NextResponse.json(
        { error: 'La dirección es requerida' },
        { status: 400 }
      )
    }

    const nonce = generateNonce()
    console.log('Generated nonce:', nonce, 'for address:', address)
    
    // Store nonce for this address (expires in 10 minutes)
    nonces.set(address.toLowerCase(), nonce)
    setTimeout(() => {
      nonces.delete(address.toLowerCase())
      console.log('Nonce expired and deleted for:', address)
    }, 10 * 60 * 1000)

    // Generate complete SIWE message following EIP-4361
    const domain = 'localhost:3000' // In production, use process.env.DOMAIN
    const origin = 'http://localhost:3000' // In production, use process.env.ORIGIN
    const statement = 'Sign in with Ethereum to the app.'
    const issuedAt = new Date().toISOString()

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${issuedAt}`

    console.log('Generated complete SIWE message')
    return NextResponse.json({
      message,
      nonce,
    })
  } catch (error) {
    console.error('Error generating message (detailed):', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export { nonces }