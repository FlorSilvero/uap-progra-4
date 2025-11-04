// app/api/chat/route.ts
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
});

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';

const parseISOorNull = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
};

const USER_ID = 'demo-user';

// ======================= TOOL FUNCTIONS =======================
async function createTask(params: { title: string; priority?: string; category?: string; dueDate?: string }) {
  const { title, priority = 'medium', category = 'other', dueDate } = params;
  
  const parsedDueDate = dueDate ? parseISOorNull(dueDate) : null;
  if (parsedDueDate && parsedDueDate < new Date()) {
    return {
      success: false,
      error: 'La fecha límite debe ser futura',
      message: '❌ Error: La fecha límite debe ser una fecha futura',
    };
  }

  const task = await prisma.task.create({
    data: {
      userId: USER_ID,
      title: title.trim(),
      priority: priority as any,
      category: category as any,
      dueDate: parsedDueDate,
    },
  });

  return {
    success: true,
    task,
    message: `✅ Tarea creada: "${task.title}"`,
  };
}

async function searchTasks(params: { completed?: boolean }) {
  const { completed } = params;
  
  const where: any = { userId: USER_ID, deletedAt: null };
  if (completed !== undefined) where.completed = completed;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalMessage = completed === undefined 
    ? `📋 Encontradas ${tasks.length} tarea${tasks.length === 1 ? '' : 's'}`
    : completed 
    ? `✅ Encontradas ${tasks.length} tarea${tasks.length === 1 ? '' : 's'} completada${tasks.length === 1 ? '' : 's'}`
    : `⏳ Encontradas ${tasks.length} tarea${tasks.length === 1 ? '' : 's'} pendiente${tasks.length === 1 ? '' : 's'}`;

  return {
    success: true,
    tasks,
    total: tasks.length,
    message: tasks.length > 0 ? totalMessage : '📭 No hay tareas',
  };
}

async function updateTask(params: { taskId: string; completed?: boolean }) {
  const { taskId, completed } = params;
  
  const existing = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null, userId: USER_ID },
  });
  
  if (!existing) {
    return { success: false, error: `No se encontró la tarea ${taskId}` };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { completed },
  });

  return {
    success: true,
    task,
    message: `✏️ Tarea ${completed ? 'completada' : 'marcada como pendiente'}: "${task.title}"`,
  };
}

async function deleteTask(params: { taskId: string }) {
  const { taskId } = params;
  
  const existing = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null, userId: USER_ID },
  });
  
  if (!existing) {
    return { success: false, error: `No se encontró la tarea ${taskId}` };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  return {
    success: true,
    task: { id: task.id, title: task.title },
    message: `🗑️ Tarea eliminada: "${task.title}"`,
  };
}

async function getTaskStats(params: { period?: string }) {
  const { period = 'all-time' } = params;
  const now = new Date();
  let createdAtFilter: any | undefined;

  const beginOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (period === 'today') {
    createdAtFilter = { gte: beginOfDay(now) };
  } else if (period === 'week') {
    const dow = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dow);
    createdAtFilter = { gte: beginOfDay(start) };
  } else if (period === 'month') {
    createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (period === 'year') {
    createdAtFilter = { gte: new Date(now.getFullYear(), 0, 1) };
  }

  const commonWhere = {
    userId: USER_ID,
    deletedAt: null,
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const [totalTasks, completedTasks] = await Promise.all([
    prisma.task.count({ where: commonWhere }),
    prisma.task.count({ where: { ...commonWhere, completed: true } }),
  ]);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    success: true,
    stats: {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate,
    },
    message: `📊 Estadísticas: ${totalTasks} tareas, ${completedTasks} completadas (${completionRate}%)`,
  };
}

// Map tool names to functions
const toolFunctions: Record<string, Function> = {
  createTask,
  searchTasks,
  updateTask,
  deleteTask,
  getTaskStats,
};

// ======================= SYSTEM PROMPT =======================
const systemPrompt = `Eres un asistente de tareas en español llamado "AI Todo Manager".

IMPORTANTE: Tienes acceso a las siguientes funciones que DEBES usar para realizar acciones:

**searchTasks** - Buscar y listar tareas
Parámetros: {completed: boolean}
Uso: Para mostrar tareas pendientes o completadas

**createTask** - Crear una nueva tarea  
Parámetros: {title: string, priority: "low"|"medium"|"high", category: "work"|"personal"|"shopping"|"health"|"other", dueDate: string}
Uso: Cuando el usuario quiere agregar/crear una tarea

**updateTask** - Actualizar una tarea existente
Parámetros: {taskId: string, completed: boolean}
Uso: Para marcar tareas como completadas o pendientes

**deleteTask** - Eliminar una tarea
Parámetros: {taskId: string}
Uso: Para eliminar tareas

**getTaskStats** - Obtener estadísticas
Parámetros: {period: "today"|"week"|"month"|"year"|"all-time"}
Uso: Para ver estadísticas de productividad

INSTRUCCIONES CRÍTICAS:
1. Cuando el usuario pida "mostrar/ver/listar tareas/recordatorios", PRIMERO ejecuta searchTasks({completed: false}) y LUEGO presenta los resultados
2. Para crear una tarea, usa createTask con todos los parámetros necesarios  
3. Primero ejecuta las funciones, luego responde basándote en los resultados
4. Responde en español con emojis (✅📋🗑️📊)
5. Sé breve, claro y amigable

Ejemplo: Si el usuario dice "muestra mis tareas", tú ejecutas search Tasks({completed: false}) y presentas la lista de tareas encontradas.`;

// ======================= ROUTE =======================
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    console.log(`📨 Received ${messages.length} messages`);

    // Normalizar mensajes
    const normalizedMessages = messages
      .map((msg: any) => {
        if (!['user', 'assistant'].includes(msg.role)) return null;
        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
            .filter(Boolean)
            .join(' ');
        }
        return content.trim() ? { role: msg.role, content: content.trim() } : null;
      })
      .filter(Boolean);

    if (normalizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron mensajes válidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Detectar si el usuario pide ver tareas/recordatorios y ejecutar la función directamente
    const lastUserMessage = normalizedMessages[normalizedMessages.length - 1];
    const userText = lastUserMessage?.content.toLowerCase() || '';
    
    console.log('🔍 Analyzing user message:', userText);
    
    // ✅ TOOL CALLING: Detectar intenciones y ejecutar funciones
    const showTasksPattern = /(muestra|mostra|mostrar|ver|lista|listar|cuales|cuáles|dame|dime|enseña|enseñar).*(tarea|recordatorio|pendiente)/i;
    const createTaskPattern = /(crea|crear|agrega|agregar|añade|añadir|nueva|nuevo).*(tarea|recordatorio)/i;
    
    if (showTasksPattern.test(userText)) {
      console.log('🔧 TOOL CALLING: Executing searchTasks');
      
      // Determinar si pide solo pendientes, solo completadas, o todas
      let completed: boolean | undefined = undefined;
      
      if (userText.includes('pendiente') || userText.includes('por hacer') || userText.includes('sin completar')) {
        completed = false;
      } else if (userText.includes('completada') || userText.includes('terminada') || userText.includes('hecha')) {
        completed = true;
      }
      // Si no especifica, mostrar TODAS (completed = undefined)
      
      const result = await searchTasks({ completed });
      
      console.log('📊 Search result:', JSON.stringify(result, null, 2));
      
      let response = result.message + '\n\n';
      if (result.tasks && result.tasks.length > 0) {
        response += result.tasks.map((t: any, i: number) => 
          `${i + 1}. ${t.completed ? '✅' : '⏳'} **${t.title}**\n   - Prioridad: ${t.priority}\n   - Categoría: ${t.category}\n   - Estado: ${t.completed ? 'Completada' : 'Pendiente'}${t.dueDate ? `\n   - Vence: ${new Date(t.dueDate).toLocaleDateString('es-AR')}` : ''}\n`
        ).join('\n');
      } else {
        response = completed === false 
          ? '📭 No tienes tareas pendientes. ¡Buen trabajo!' 
          : completed === true
          ? '📭 No tienes tareas completadas aún.'
          : '📭 No tienes ninguna tarea.';
      }
      
      console.log('✅ Sending response:', response);
      
      return new Response(response, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    
    // Detectar creación de tareas
    if (createTaskPattern.test(userText)) {
      console.log('🔧 TOOL CALLING: Detected create task intention');
      // Extraer el título de la tarea del mensaje
      const titleMatch = userText.match(/(tarea|recordatorio)\s+(.+)/i);
      if (titleMatch) {
        const title = titleMatch[2].trim();
        console.log('📝 Creating task:', title);
        
        const result = await createTask({
          title,
          priority: 'medium',
          category: 'other',
          dueDate: '',
        });
        
        console.log('✅ Task created:', result);
        
        return new Response(result.message, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    // Para otras consultas, usar el modelo
    console.log(`🚀 Streaming response from ${MODEL}`);
    const result = await streamText({
      model: openrouter(MODEL),
      temperature: 0.7,
      system: systemPrompt,
      messages: normalizedMessages,
    });

    return result.toTextStreamResponse();
  } catch (e: any) {
    console.error('❌ API /chat error:', e);
    return new Response(
      JSON.stringify({ 
        error: 'Error procesando la solicitud', 
        details: e?.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}