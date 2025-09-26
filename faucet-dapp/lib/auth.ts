import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

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
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload

    return payload
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function createAuthErrorResponse() {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}