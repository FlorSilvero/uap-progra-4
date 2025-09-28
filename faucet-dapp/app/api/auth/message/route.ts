import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from 'siwe'
import { CONFIG, MESSAGES } from '@/lib/constants'

// Store nonces temporarily (in production, use Redis or database)
const nonces = new Map<string, { nonce: string; expires: number }>()

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
    
    // Store nonce for this address with expiration
    const expires = Date.now() + CONFIG.NONCE_EXPIRY_MS
    nonces.set(address.toLowerCase(), { nonce, expires })
    
    // Clean up expired nonces
    setTimeout(() => {
      const addressKey = address.toLowerCase()
      const storedNonce = nonces.get(addressKey)
      if (storedNonce && Date.now() >= storedNonce.expires) {
        nonces.delete(addressKey)
        console.log('Nonce expired and deleted for:', address)
      }
    }, CONFIG.NONCE_EXPIRY_MS)

    // Generate complete SIWE message following EIP-4361
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000'
    const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000'
    const statement = MESSAGES.INFO.SIGN_MESSAGE
    const issuedAt = new Date().toISOString()

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: ${CONFIG.CHAIN_ID}
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

// Helper function to get valid nonce
export function getValidNonce(address: string): string | null {
  const addressKey = address.toLowerCase()
  const storedNonce = nonces.get(addressKey)
  
  if (!storedNonce || Date.now() >= storedNonce.expires) {
    nonces.delete(addressKey)
    return null
  }
  
  return storedNonce.nonce
}