import { NextRequest, NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'
import jwt from 'jsonwebtoken'
import { nonces } from '../message/route'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json()

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Message and signature are required' },
        { status: 400 }
      )
    }

    // Parse the SIWE message
    const siweMessage = new SiweMessage(message)
    
    // Verify the signature
    const fields = await siweMessage.verify({ signature })

    if (!fields.success) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const address = siweMessage.address.toLowerCase()

    // Verify nonce (optional but recommended)
    const storedNonce = nonces.get(address)
    if (storedNonce && siweMessage.nonce !== storedNonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      )
    }

    // Clean up used nonce
    nonces.delete(address)

    // Generate JWT token
    const token = jwt.sign(
      { 
        address: siweMessage.address,
        chainId: siweMessage.chainId,
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        subject: siweMessage.address,
      }
    )

    return NextResponse.json({
      token,
      address: siweMessage.address,
    })
  } catch (error) {
    console.error('Error signing in:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}