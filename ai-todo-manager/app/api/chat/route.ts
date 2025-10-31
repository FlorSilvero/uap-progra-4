// @ts-nocheck
import { OpenAIStream, StreamingTextResponse } from 'ai';

// Configuración de OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free';

// API Route para el chat
export async function POST(req: Request) {
  console.log('🚀 Chat API llamada recibida');
  
  try {
    console.log('📝 Parseando body del request...');
    const { messages } = await req.json();
    console.log('✅ Messages recibidos:', messages.length, 'mensajes');

    console.log('🔧 Configurando llamada a OpenRouter...');
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Todo Manager',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres un asistente inteligente para gestión de tareas en español. Ayudas a los usuarios a:
- Crear, actualizar y eliminar tareas
- Buscar y filtrar tareas según diversos criterios
- Ver estadísticas de productividad
- Organizar su día de manera eficiente

Cuando el usuario te pida crear una tarea, responde de forma amigable confirmando que la crearías y explica cómo hacerlo.
Sé amigable, conciso y útil. Usa emojis cuando sea apropiado para hacer la experiencia más agradable.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    console.log('✅ Respuesta de OpenRouter recibida, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de OpenRouter:', errorText);
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Creando stream...');
    const stream = OpenAIStream(response);
    console.log('✅ Stream creado, enviando respuesta...');
    
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('❌ ERROR en chat API:', error);
    console.error('   Stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Error processing request', 
      details: error.message,
      stack: error.stack 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
