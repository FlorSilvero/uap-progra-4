// app/api/chat/route.ts
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
});

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

const parseISOorNull = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
};

const USER_ID = 'demo-user';

// --- Small NLP helpers to extract params from free text ---
function extractQuotedText(text: string) {
  const m = text.match(/['"“”](.+?)['"“”]/);
  return m ? m[1].trim() : null;
}

function extractTitleFallback(text: string) {
  // Try quoted text first, then after the word 'tarea' or 'tareas'
  const q = extractQuotedText(text);
  if (q) return q;

  const m = text.match(/tarea[s]?\s+(?:de|:)?\s*(.+)/i);
  if (m && m[1]) return m[1].trim();

  // As last resort, return entire text (trimmed)
  return text.split(/[.\n]/)[0].trim();
}

function extractPriority(text: string) {
  if (/\balta\b|\burgente\b|\bimportante\b/i.test(text)) return 'high';
  if (/\bbaja\b|\bmenos importante\b/i.test(text)) return 'low';
  if (/\bmedia\b|\bnormal\b/i.test(text)) return 'medium';
  return undefined;
}

function extractDueDate(text: string) {
  // look for YYYY-MM-DD or DD/MM/YYYY
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dmy) {
    const parts = dmy[1].split('/');
    const reform = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return reform;
  }
  // relative dates: hoy, mañana, pasado mañana
  if (/\bhoy\b/i.test(text)) return new Date().toISOString().slice(0,10);
  if (/\bmañan/i.test(text)) {
    const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10);
  }
  if (/pasado mañana/i.test(text)) {
    const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().slice(0,10);
  }

  return undefined;
}

async function findTaskByTitlePart(titlePart: string) {
  if (!titlePart) return null;
  const t = await prisma.task.findFirst({
    where: { userId: USER_ID, deletedAt: null, title: { contains: titlePart, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
  });
  return t;
}

// Extract title from numbered list in assistant's last response
function extractTitleFromNumberedList(messages: any[], taskNumber: number): string | null {
  // Find the last assistant message
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistantMsg) return null;

  const content = lastAssistantMsg.content || '';
  // Split by lines and find the line starting with "taskNumber."
  const lines = content.split('\n');
  const targetLine = lines.find(line => line.trim().startsWith(`${taskNumber}.`));
  if (!targetLine) return null;

  // Extract title between ** ** or after the emoji
  const titleMatch = targetLine.match(/\*\*(.+?)\*\*/);
  if (titleMatch) return titleMatch[1].trim();

  // Fallback: after the number and emoji
  const afterNumber = targetLine.split('. ')[1];
  if (afterNumber) {
    const emojiRemoved = afterNumber.replace(/^[✅⏳]\s*/, '');
    return emojiRemoved.split('\n')[0].trim();
  }

  return null;
}

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

// === Tool definitions for tool-calling (Vercel AI SDK) ===
const tools = {
  createTask: tool({
    description: 'Crear una nueva tarea en el sistema.',
    parameters: z.object({
      title: z.string().describe('Título o descripción de la tarea'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Prioridad de la tarea'),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Categoría de la tarea'),
      dueDate: z.string().optional().describe('Fecha límite en formato ISO (YYYY-MM-DD) o texto relativo'),
    }),
    execute: async ({ title, priority, category, dueDate }: any) => {
      return await createTask({ title, priority, category, dueDate });
    },
  }),

  updateTask: tool({
    description: 'Actualizar una tarea existente (título, estado, prioridad, categoría, fecha).',
    parameters: z.object({
      taskId: z.string().describe('ID único de la tarea a actualizar'),
      title: z.string().optional(),
      completed: z.boolean().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional(),
      dueDate: z.string().nullable().optional(),
    }),
    execute: async (params: any) => {
      return await updateTask(params);
    },
  }),

  deleteTask: tool({
    description: 'Eliminar una tarea (soft delete).',
    parameters: z.object({
      taskId: z.string().describe('ID único de la tarea a eliminar'),
      confirm: z.boolean().optional(),
    }),
    execute: async ({ taskId }: any) => {
      return await deleteTask({ taskId });
    },
  }),

  searchTasks: tool({
    description: 'Buscar y listar tareas con filtros.',
    parameters: z.object({
      query: z.string().optional(),
      completed: z.boolean().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional(),
      dueDateFrom: z.string().optional(),
      dueDateTo: z.string().optional(),
      sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      limit: z.number().optional(),
    }),
    execute: async (params: any) => {
      return await searchTasks(params);
    },
  }),

  getTaskStats: tool({
    description: 'Generar estadísticas de productividad.',
    parameters: z.object({
      period: z.enum(['today', 'week', 'month', 'year', 'all-time']).optional(),
      groupBy: z.enum(['category', 'priority', 'date']).optional(),
    }),
    execute: async (params: any) => {
      return await getTaskStats(params);
    },
  }),
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
Parámetros: {taskId: string, title?: string, completed?: boolean, priority?: "low"|"medium"|"high", category?: "work"|"personal"|"shopping"|"health"|"other", dueDate?: string}
Uso: Para modificar tareas, cambiar prioridad, marcar como completada, etc.

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
6. Si el usuario se refiere a una tarea por número (ej. "la tarea 3"), busca en tu respuesta anterior la lista numerada y extrae el título correspondiente para usar en updateTask o deleteTask

Ejemplo: Si el usuario dice "muestra mis tareas", tú ejecutas search Tasks({completed: false}) y presentas la lista de tareas encontradas.`;

// ======================= ROUTE =======================
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    console.log(`📨 Received ${messages.length} messages`);

    // Normalizar mensajes - simplificar para evitar errores de formato
    const normalizedMessages = messages
      .filter((msg: any) => ['user', 'assistant'].includes(msg.role))
      .map((msg: any) => {
        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .filter((c: any) => typeof c === 'string' || (c.type === 'text' && c.text))
            .map((c: any) => typeof c === 'string' ? c : c.text || '')
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
      const title = extractTitleFallback(userText);
      const priority = extractPriority(userText) || 'medium';
      const dueDate = extractDueDate(userText) || '';
      console.log('📝 Creating task (parsed):', { title, priority, dueDate });

      if (!title || title.length === 0) {
        return new Response('❌ No pude extraer el título de la tarea. ¿Puedes decirlo entre comillas o escribirlo claramente?', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const result = await createTask({
        title,
        priority,
        category: 'other',
        dueDate,
      });

      console.log('✅ Task created:', result);

      return new Response(result.message, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Detectar marcación como completada / completar tarea
    const completePattern = /(marca|marcar|completa|complet(o|a)|hecho|termina|terminar)\b/i;
    if (completePattern.test(userText)) {
      console.log('� TOOL CALLING: Detected complete task intention');
      const possibleTitle = extractQuotedText(userText) || extractTitleFallback(userText);
      const found = await findTaskByTitlePart(possibleTitle || userText);
      if (!found) {
        return new Response('❌ No pude encontrar la tarea que quieres completar. ¿Puedes darme el título exacto o entre comillas?', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      const result = await updateTask({ taskId: found.id, completed: true });
      return new Response(result.message, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Detectar edición de tarea por número (ej. "editar la tarea 3 a prioridad media")
    const editByNumberPattern = /(edita|editar|cambia|cambiar|modifica|modificar).*(tarea|la)\s+(\d+)/i;
    const editMatch = userText.match(editByNumberPattern);
    if (editMatch) {
      const taskNumber = parseInt(editMatch[3]);
      const title = extractTitleFromNumberedList(normalizedMessages, taskNumber);
      if (!title) {
        return new Response('❌ No pude identificar la tarea por número. ¿Puedes referirte a ella por título?', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      const found = await findTaskByTitlePart(title);
      if (!found) {
        return new Response('❌ No encontré la tarea en la base de datos.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      // Parse what to change: priority, completed, etc.
      let updateParams: any = { taskId: found.id };
      if (userText.includes('prioridad') || userText.includes('priority')) {
        if (/\bmedia\b|\bmedium\b/i.test(userText)) updateParams.priority = 'medium';
        else if (/\balta\b|\bhigh\b/i.test(userText)) updateParams.priority = 'high';
        else if (/\bbaja\b|\blow\b/i.test(userText)) updateParams.priority = 'low';
      }
      if (userText.includes('completada') || userText.includes('completar')) updateParams.completed = true;
      if (userText.includes('pendiente')) updateParams.completed = false;

      const result = await updateTask(updateParams);
      return new Response(result.message, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Detectar cambio de prioridad por título (ej. "que la tarea de sacar queso tenga prioridad alta")
    const changePriorityPattern = /(que\s+la\s+tarea\s+de\s+(.+?)\s+tenga\s+prioridad\s+(alta|media|baja))/i;
    const priorityMatch = userText.match(changePriorityPattern);
    if (priorityMatch) {
      const title = priorityMatch[2].trim();
      const priorityText = priorityMatch[3].toLowerCase();
      let priority: 'low' | 'medium' | 'high';
      if (priorityText === 'alta') priority = 'high';
      else if (priorityText === 'media') priority = 'medium';
      else if (priorityText === 'baja') priority = 'low';
      else return new Response('❌ Prioridad no reconocida. Usa alta, media o baja.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

      const found = await findTaskByTitlePart(title);
      if (!found) {
        return new Response('❌ No encontré la tarea con ese título.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      const result = await updateTask({ taskId: found.id, priority });
      return new Response(result.message, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Detectar eliminación de tarea
    const deletePattern = /(elimina|eliminar|borra|borrar|quitar)\b/i;
    if (deletePattern.test(userText)) {
      console.log('🔧 TOOL CALLING: Detected delete task intention');
      const possibleTitle = extractQuotedText(userText) || extractTitleFallback(userText);
      const found = await findTaskByTitlePart(possibleTitle || userText);
      if (!found) {
        return new Response('❌ No pude encontrar la tarea que quieres eliminar. ¿Puedes indicarla entre comillas o con más detalle?', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      // For safety, require explicit confirmation if message contains 'todas' or 'todas las'
      if (/todas|todo|completas|completadas/i.test(userText)) {
        return new Response('⚠️ Estás pidiendo eliminar múltiples tareas. Por favor confirma escribiendo "Sí, eliminar".', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      const result = await deleteTask({ taskId: found.id });
      return new Response(result.message, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Para otras consultas, usar el modelo con tool-calling
    console.log(`🚀 Streaming response from ${MODEL} with tools`);
    const result = await streamText({
      model: openrouter(MODEL),
      temperature: 0.7,
      system: systemPrompt,
      messages: normalizedMessages,
      tools: Object.values(tools),
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