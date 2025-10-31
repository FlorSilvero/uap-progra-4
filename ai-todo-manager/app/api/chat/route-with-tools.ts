// @ts-nocheck
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { prisma } from '@/lib/prisma';

// Configuración de OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

// Funciones helper para tareas
async function createTask(userId: string, title: string, priority?: string, category?: string) {
  const task = await prisma.task.create({
    data: {
      userId,
      title: title.trim(),
      priority: priority || 'medium',
      category: category || 'other',
    },
  });
  return task;
}

async function getTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return tasks;
}

async function getTaskStats(userId: string) {
  const total = await prisma.task.count({ where: { userId, deletedAt: null } });
  const completed = await prisma.task.count({ where: { userId, deletedAt: null, completed: true } });
  return { total, completed, pending: total - completed };
}

// API Route para el chat
export async function POST(req: Request) {
  console.log('🚀 Chat API con herramientas llamada');
  
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    console.log('📝 Último mensaje:', lastMessage);
    
    // Detectar intención y ejecutar acción
    let actionResult = null;
    const lowerMessage = lastMessage.toLowerCase();
    
    // Detectar creación de tarea
    if (lowerMessage.includes('crear') || lowerMessage.includes('agregar') || lowerMessage.includes('añadir') || lowerMessage.includes('nueva tarea')) {
      const title = lastMessage.replace(/^(crear|agregar|añadir|nueva)\s+(tarea|recordatorio)?\s*(de|:)?\s*/i, '').trim();
      if (title) {
        const priority = lowerMessage.includes('urgente') || lowerMessage.includes('importante') ? 'high' : 'medium';
        const task = await createTask('demo-user', title, priority, 'other');
        actionResult = `✅ Tarea creada: "${task.title}" (ID: ${task.id})`;
      }
    }
    
    // Detectar listado de tareas
    if (lowerMessage.includes('tareas') && (lowerMessage.includes('mostrar') || lowerMessage.includes('ver') || lowerMessage.includes('listar') || lowerMessage.includes('cuál') || lowerMessage.includes('qué') || lowerMessage.includes('tengo'))) {
      const tasks = await getTasks('demo-user');
      if (tasks.length === 0) {
        actionResult = '📋 No tienes tareas registradas.';
      } else {
        actionResult = `📋 Tienes ${tasks.length} tarea(s):\n\n` + tasks.map((t, i) => 
          `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title} (${t.priority})`
        ).join('\n');
      }
    }
    
    // Detectar estadísticas
    if (lowerMessage.includes('estadística') || lowerMessage.includes('cuántas') || lowerMessage.includes('completadas')) {
      const stats = await getTaskStats('demo-user');
      actionResult = `📊 Estadísticas:\n- Total: ${stats.total}\n- Completadas: ${stats.completed}\n- Pendientes: ${stats.pending}`;
    }

    // Preparar contexto con el resultado de la acción
    const systemPrompt = `Eres un asistente inteligente para gestión de tareas en español.

${actionResult ? `RESULTADO DE LA ACCIÓN:\n${actionResult}\n\n` : ''}

Responde de forma amigable y concisa. Si se ejecutó una acción, confírmala al usuario de manera natural.

Puedes ayudar con:
- Crear tareas: "agregar tarea de hacer X"
- Ver tareas: "qué tareas tengo" o "mostrar mis tareas"  
- Estadísticas: "cuántas tareas tengo completadas"

Sé amigable y usa emojis cuando sea apropiado.`;

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
            content: systemPrompt
          },
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: lastMessage
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de OpenRouter:', errorText);
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('❌ ERROR:', error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
