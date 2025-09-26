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

    console.log('Returning nonce successfully')
    return NextResponse.json({
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