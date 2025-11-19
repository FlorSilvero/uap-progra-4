import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener las últimas conversaciones y mensajes del usuario
export async function GET(request: NextRequest) {
  try {
    const userId = 'demo-user'; // Por ahora usamos el mismo userId hardcoded
    
    // Buscar la conversación más reciente del usuario
    const conversation = await prisma.conversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Últimos 50 mensajes
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    // Transformar mensajes al formato esperado por useChat
    const messages = conversation.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      toolInvocations: msg.toolCalls ? JSON.parse(msg.toolCalls as string) : undefined,
      createdAt: msg.createdAt
    }));

    return NextResponse.json({ 
      conversationId: conversation.id,
      messages 
    });

  } catch (error) {
    console.error('Error loading conversation:', error);
    return NextResponse.json(
      { error: 'Error al cargar la conversación' },
      { status: 500 }
    );
  }
}
