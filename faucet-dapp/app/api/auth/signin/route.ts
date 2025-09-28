import { NextRequest, NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'
import jwt from 'jsonwebtoken'
import { getValidNonce } from '../message/route'
import { CONFIG, MESSAGES } from '@/lib/constants'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export async function POST(request: NextRequest) {
  try {
    console.log('Received signin request')
    const { message, signature } = await request.json()
    console.log('Parsed request data, message length:', message?.length, 'signature length:', signature?.length)

    if (!message || !signature) {
      console.error('Missing message or signature')
      return NextResponse.json(
        { error: 'Mensaje y firma son requeridos' },
        { status: 400 }
      )
    }

    console.log('Parsing SIWE message text...')
    console.log('Message text to parse:', message)
    
    // Parse the SIWE message text
    const siweMessage = new SiweMessage(message)
    console.log('SIWE message parsed successfully, address:', siweMessage.address, 'nonce:', siweMessage.nonce)
    
    console.log('Verifying signature...')
    // Verify the signature
    const fields = await siweMessage.verify({ signature })
    console.log('Signature verification result:', fields.success)

    if (!fields.success) {
      console.error('Signature verification failed:', fields)
      return NextResponse.json(
        { error: 'Firma inválida' },
        { status: 401 }
      )
    }

    // Validate Chain ID (Sepolia testnet)
    if (siweMessage.chainId && siweMessage.chainId !== CONFIG.CHAIN_ID) {
      console.error('Invalid chain ID:', siweMessage.chainId)
      return NextResponse.json(
        { error: MESSAGES.ERRORS.INVALID_CHAIN_ID },
        { status: 400 }
      )
    }

    // Validate message expiration
    if (siweMessage.issuedAt) {
      const issuedAt = new Date(siweMessage.issuedAt)
      const now = new Date()
      
      if (now.getTime() - issuedAt.getTime() > CONFIG.MESSAGE_EXPIRY_MS) {
        console.error('Message expired')
        return NextResponse.json(
          { error: MESSAGES.ERRORS.MESSAGE_EXPIRED },
          { status: 401 }
        )
      }
    }

    const address = siweMessage.address.toLowerCase()
    console.log('Processing for address:', address)

    // Verify nonce (optional but recommended)
    const storedNonce = getValidNonce(address)
    console.log('Stored nonce:', storedNonce, 'Message nonce:', siweMessage.nonce)
    if (storedNonce && siweMessage.nonce !== storedNonce) {
      console.error('Nonce mismatch')
      return NextResponse.json(
        { error: 'Nonce inválido' },
        { status: 401 }
      )
    }

    console.log('Nonce validated, generating JWT...')

    // Generate JWT token
    const token = jwt.sign(
      { 
        address: siweMessage.address,
        chainId: siweMessage.chainId || CONFIG.CHAIN_ID,
      },
      JWT_SECRET!,
      { 
        expiresIn: CONFIG.JWT_EXPIRY,
        subject: siweMessage.address,
      }
    )

    console.log('JWT generated successfully for address:', siweMessage.address)

    return NextResponse.json({
      token,
      address: siweMessage.address,
    })
  } catch (error) {
    console.error('Error signing in (detailed):', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Falló la autenticación' },
      { status: 500 }
    )
  }
}