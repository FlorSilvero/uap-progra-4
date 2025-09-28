import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export interface AuthPayload {
  address: string
  chainId: number
}

export async function authenticateRequest(request: NextRequest): Promise<AuthPayload | null> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload & AuthPayload

    // Validate payload structure
    if (!payload.address || typeof payload.address !== 'string') {
      return null
    }

    return {
      address: payload.address,
      chainId: payload.chainId || 11155111
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function createAuthErrorResponse() {
  return NextResponse.json(
    { error: 'Autenticación requerida' },
    { status: 401 }
  )
}