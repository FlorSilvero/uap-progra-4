// app/api/chat/route.ts
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/user-context';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Check which provider is available
const USE_GOOGLE = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const USE_DIRECT_OPENAI = !!process.env.OPENAI_API_KEY;

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  compatibility: 'openai',
  fetch: async (url, init) => {
    // Remove disable_parallel_tool_use from request body to fix Bedrock compatibility
    if (init?.body) {
      try {
        const body = JSON.parse(init.body as string);
        if (body.tool_choice && typeof body.tool_choice === 'object') {
          delete body.tool_choice.disable_parallel_tool_use;
        }
        init.body = JSON.stringify(body);
      } catch (e) {
        // If we can't parse/modify, let it pass through
      }
    }
    return fetch(url, init);
  },
});

// Google AI client
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

// Groq client using AI SDK for tool-calling support
// Note: Groq uses OpenAI-compatible API but with different endpoint structure
const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
  compatibility: 'compatible', // Use 'compatible' instead of 'strict' for Groq
});

const USE_GROQ = !!process.env.GROQ_API_KEY;

const MODEL = USE_GOOGLE
  ? (process.env.GOOGLE_MODEL || 'models/gemini-1.5-flash')
  : USE_GROQ
  ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
  : USE_DIRECT_OPENAI 
  ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
  : (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini');

const fallbackModel = USE_GOOGLE
  ? 'models/gemini-1.5-flash'
  : USE_GROQ
  ? 'llama-3.1-8b-instant'
  : USE_DIRECT_OPENAI
  ? 'gpt-3.5-turbo'
  : (process.env.OPENROUTER_TOOL_FALLBACK_MODEL || 'openai/gpt-3.5-turbo');

// Helper to get the model provider (Google, Groq, direct OpenAI, or OpenRouter-wrapped)
const getModel = (modelName: string) => {
  if (USE_GOOGLE) {
    // Use Google Gemini via AI SDK (excellent tool-calling support)
    return google(modelName);
  } else if (USE_GROQ) {
    // Use Groq via AI SDK (supports tool-calling)
    return groq(modelName);
  } else if (USE_DIRECT_OPENAI) {
    // Use native OpenAI SDK (no schema wrapping issues)
    return openai(modelName);
  } else {
    // Use OpenRouter
    return openrouter(modelName);
  }
};

const getToolChoiceForModel = (modelName: string) => {
  if (!modelName) return 'auto';
  const lower = modelName.toLowerCase();
  if (lower.includes('deepseek')) return 'required';
  if (lower.includes('anthropic')) return 'required';
  if (lower.includes('gemini')) return 'required';
  return 'auto';
};

const parseISOorNull = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
};

// Memory map to remember last listed tasks per user so the model can refer to them by number.
const globalTaskMemory = globalThis as unknown as { __taskListingMemory?: Map<string, string[]> };
if (!globalTaskMemory.__taskListingMemory) globalTaskMemory.__taskListingMemory = new Map();
const taskListingMemory = globalTaskMemory.__taskListingMemory;

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
  return text.split(/[.\n]/)[0].trim();

}

async function searchTasks(userId: string, params: {
    query?: string; completed?: boolean; priority?: string; category?: string; dueDateFrom?: string; dueDateTo?: string; sortBy?: string; sortOrder?: string; limit?: number;
  }) {
    const { query, completed, priority, category, dueDateFrom, dueDateTo, sortBy = 'createdAt', sortOrder = 'desc', limit = 50 } = params;
    const where: any = { userId, deletedAt: null };
    if (query) where.title = { contains: query, mode: 'insensitive' };
    if (completed !== undefined) where.completed = completed;
    if (priority) where.priority = priority;
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {} as any;
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    const tasks = await prisma.task.findMany({ where, orderBy: { [sortBy]: sortOrder }, take: limit });
    const total = await prisma.task.count({ where });
    // Store ids for numeric reference
    taskListingMemory.set(userId, tasks.map(t => t.id));
    return {
      success: true,
      tasks,
      total,
      hasMore: total > limit,
      message: tasks.length ? `📋 ${tasks.length} tarea(s) encontradas` : '📭 No hay tareas que coincidan'
    };
}

async function getTaskStats(userId: string, params: { period?: string; groupBy?: string }) {
  const { period = 'all-time' } = params;
  const now = new Date();
  let createdAtFilter: any = {};
  switch (period) {
    case 'today': createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }; break;
    case 'week': {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); createdAtFilter = { gte: start }; break;
    }
    case 'month': createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }; break;
    case 'year': createdAtFilter = { gte: new Date(now.getFullYear(), 0, 1) }; break;
    default: createdAtFilter = {}; break;
  }
  const baseWhere: any = { userId, deletedAt: null, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) };
  const totalTasks = await prisma.task.count({ where: baseWhere });
  const completedTasks = await prisma.task.count({ where: { ...baseWhere, completed: true } });
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = await prisma.task.count({ where: { userId, deletedAt: null, completed: false, dueDate: { lt: new Date() } } });
  // byPriority & byCategory
  const priorities = ['high','medium','low'];
  const categories = ['work','personal','shopping','health','other'];
  const byPriority: any = {};
  for (const p of priorities) {
    const ptTotal = await prisma.task.count({ where: { ...baseWhere, priority: p as any } });
    const ptCompleted = await prisma.task.count({ where: { ...baseWhere, priority: p as any, completed: true } });
    byPriority[p] = { total: ptTotal, completed: ptCompleted, pending: ptTotal - ptCompleted };
  }
  const byCategory: any = {};
  for (const c of categories) {
    const ctTotal = await prisma.task.count({ where: { ...baseWhere, category: c as any } });
    const ctCompleted = await prisma.task.count({ where: { ...baseWhere, category: c as any, completed: true } });
    byCategory[c] = { total: ctTotal, completed: ctCompleted, pending: ctTotal - ctCompleted };
  }
  // Timeline basic
  const today = new Date(); today.setHours(0,0,0,0);
  const tasksCreatedToday = await prisma.task.count({ where: { userId, deletedAt: null, createdAt: { gte: today } } });
  const tasksCompletedToday = await prisma.task.count({ where: { userId, deletedAt: null, completed: true, updatedAt: { gte: today } } });
  const startWeek = new Date(today); startWeek.setDate(today.getDate() - today.getDay());
  const tasksCreatedThisWeek = await prisma.task.count({ where: { userId, deletedAt: null, createdAt: { gte: startWeek } } });
  const tasksCompletedThisWeek = await prisma.task.count({ where: { userId, deletedAt: null, completed: true, updatedAt: { gte: startWeek } } });
  // Upcoming
  const dueTodayCount = await prisma.task.count({ where: { userId, deletedAt: null, completed: false, dueDate: { gte: today, lt: new Date(today.getTime()+86400000) } } });
  const dueThisWeekCount = await prisma.task.count({ where: { userId, deletedAt: null, completed: false, dueDate: { gte: today, lt: new Date(today.getTime()+7*86400000) } } });
  const nextDueTask = await prisma.task.findFirst({ where: { userId, deletedAt: null, completed: false, dueDate: { gte: today } }, orderBy: { dueDate: 'asc' } });
  // Productivity extras
  const completedList = await prisma.task.findMany({ where: { userId, deletedAt: null, completed: true }, select: { createdAt: true, updatedAt: true } });
  let avgMs = 0; if (completedList.length) { avgMs = completedList.reduce((acc,t)=> acc + (t.updatedAt.getTime() - t.createdAt.getTime()),0)/completedList.length; }
  const averageCompletionTime = completedList.length ? `${Math.round(avgMs/3600000)}h` : 'N/D';
  // Streaks
  const last30 = await prisma.task.findMany({ where: { userId, deletedAt: null, completed: true, updatedAt: { gte: new Date(Date.now()-30*86400000) } }, select: { updatedAt: true } });
  const daysSet = new Set(last30.map(t=> new Date(t.updatedAt.getFullYear(), t.updatedAt.getMonth(), t.updatedAt.getDate()).getTime()));
  let currentStreak = 0; let cursor = new Date(); cursor.setHours(0,0,0,0); while (daysSet.has(cursor.getTime())) { currentStreak++; cursor = new Date(cursor.getTime()-86400000); }
  // Longest streak brute force
  let longestStreak = 0; let tempStreak = 0; let iter = new Date(); for (let i=0;i<30;i++){ const key = new Date(iter.getFullYear(), iter.getMonth(), iter.getDate()).getTime(); if (daysSet.has(key)) { tempStreak++; longestStreak = Math.max(longestStreak,tempStreak);} else { tempStreak = 0; } iter = new Date(iter.getTime()-86400000); }
  // Most productive day
  const dayCounts: Record<string, number> = {}; last30.forEach(t=> { const d = t.updatedAt.toISOString().slice(0,10); dayCounts[d] = (dayCounts[d]||0)+1; });
  const mostProductiveDay = Object.entries(dayCounts).sort((a,b)=> b[1]-a[1])[0]?.[0] || null;
  return {
    success: true,
    stats: {
      summary: { totalTasks, completedTasks, pendingTasks, completionRate, overdueTasks },
      byPriority,
      byCategory,
      timeline: { tasksCreatedToday, tasksCompletedToday, tasksCreatedThisWeek, tasksCompletedThisWeek },
      productivity: { averageCompletionTime, mostProductiveDay, currentStreak, longestStreak },
      upcoming: { dueTodayCount, dueThisWeekCount, nextDueTask },
    },
    message: `📊 ${completedTasks}/${totalTasks} completadas (${completionRate}%)`,
  };
}

// === Tool definitions for tool-calling (Vercel AI SDK) ===
// Tools defined without binding user; we'll bind inside POST for per-request userId.
function buildTools(userId: string, toolCallCounter?: { count: number }) {
  // Create zod schemas separately so we can attach them to the tool objects for debugging
  const createTaskSchema = z.object({
    title: z.string().describe('Título o descripción de la tarea'),
    priority: z.enum(['low','medium','high']).default('medium').describe('Prioridad de la tarea'),
    category: z.enum(['work','personal','shopping','health','other']).default('other').describe('Categoría de la tarea'),
    dueDate: z.string().describe('Fecha límite ISO (YYYY-MM-DD)').optional(),
  });

  const updateTaskSchema = z.object({
    taskId: z.string().describe('ID de la tarea, o número listado, o ALL_COMPLETED para acciones masivas'),
    title: z.string().optional(),
    completed: z.boolean().optional(),
    priority: z.enum(['low','medium','high']).optional(),
    category: z.enum(['work','personal','shopping','health','other']).optional(),
    dueDate: z.union([z.string(), z.null()]).optional().describe('Fecha límite ISO o null para removerla'),
  });

  const deleteTaskSchema = z.object({
    taskId: z.string().describe('ID de la tarea, número listado o ALL_COMPLETED'),
    confirm: z.boolean().optional(),
  });

  const searchTasksSchema = z.object({
    query: z.string().optional(),
    completed: z.boolean().optional(),
    priority: z.enum(['low','medium','high']).optional(),
    category: z.enum(['work','personal','shopping','health','other']).optional(),
    dueDateFrom: z.string().optional(),
    dueDateTo: z.string().optional(),
    sortBy: z.enum(['createdAt','dueDate','priority','title']).optional(),
    sortOrder: z.enum(['asc','desc']).optional(),
    limit: z.number().optional(),
  });

  const getTaskStatsSchema = z.object({
    period: z.enum(['today','week','month','year','all-time']).optional(),
    groupBy: z.enum(['category','priority','date']).optional(),
  });

  const createTool = tool({
    description: 'Crear una nueva tarea en el sistema.',
    parameters: createTaskSchema,
    execute: async (p: any) => {
      if (toolCallCounter) toolCallCounter.count++;
      try { console.log('🛠️ Tool createTask called with:', JSON.stringify(p)); } catch (e) { console.log('🛠️ Tool createTask called'); }
      const res = await createTask(userId, p);
      try { console.log('🛠️ Tool createTask result:', JSON.stringify(res)); } catch (e) { console.log('🛠️ Tool createTask result'); }
      return res;
    },
  }) as any;
  createTool.__paramSchema = createTaskSchema;

  const updateTool = tool({
    description: 'Actualizar tarea existente (título, estado, prioridad, categoría, fecha). Usa números si listaste tareas antes.',
    parameters: updateTaskSchema,
    execute: async (p: any) => {
      if (toolCallCounter) toolCallCounter.count++;
      try { console.log('🛠️ Tool updateTask called with:', JSON.stringify(p)); } catch (e) { console.log('🛠️ Tool updateTask called'); }
      if (/^\d+$/.test(p.taskId)) {
        const list = taskListingMemory.get(userId) || [];
        const idx = parseInt(p.taskId, 10) - 1;
        if (list[idx]) p.taskId = list[idx];
      }
      const res = await updateTask(userId, p);
      try { console.log('🛠️ Tool updateTask result:', JSON.stringify(res)); } catch (e) { console.log('🛠️ Tool updateTask result'); }
      return res;
    },
  }) as any;
  updateTool.__paramSchema = updateTaskSchema;

  const deleteTool = tool({
    description: 'Eliminar una tarea (soft delete). Usa ALL_COMPLETED con confirm=true para todas las completadas.',
    parameters: deleteTaskSchema,
    execute: async (p: any) => {
      if (toolCallCounter) toolCallCounter.count++;
      try { console.log('🛠️ Tool deleteTask called with:', JSON.stringify(p)); } catch (e) { console.log('🛠️ Tool deleteTask called'); }
      if (/^\d+$/.test(p.taskId)) {
        const list = taskListingMemory.get(userId) || [];
        const idx = parseInt(p.taskId, 10) - 1;
        if (list[idx]) p.taskId = list[idx];
      }
      const res = await deleteTask(userId, p);
      try { console.log('🛠️ Tool deleteTask result:', JSON.stringify(res)); } catch (e) { console.log('🛠️ Tool deleteTask result'); }
      return res;
    },
  }) as any;
  deleteTool.__paramSchema = deleteTaskSchema;

  const searchTool = tool({
    description: 'Buscar y listar tareas con filtros avanzados.',
    parameters: searchTasksSchema,
    execute: async (p: any) => {
      if (toolCallCounter) toolCallCounter.count++;
      try { console.log('🛠️ Tool searchTasks called with:', JSON.stringify(p)); } catch (e) { console.log('🛠️ Tool searchTasks called'); }
      const res = await searchTasks(userId, p);
      const taskCount = (res && res.tasks && res.tasks.length) || 0;
      try { 
        console.log('🛠️ Tool searchTasks result: count=', taskCount);
        if (taskCount > 0) {
          console.log('📋 Tasks found:', res.tasks.map((t: any) => `${t.title} (${t.completed ? '✅' : '⏳'})`).join(', '));
        }
      } catch (e) { 
        console.log('🛠️ Tool searchTasks result'); 
      }
      return res;
    },
  }) as any;
  searchTool.__paramSchema = searchTasksSchema;

  const statsTool = tool({
    description: 'Generar estadísticas completas de productividad.',
    parameters: getTaskStatsSchema,
    execute: async (p: any) => {
      if (toolCallCounter) toolCallCounter.count++;
      try { console.log('🛠️ Tool getTaskStats called with:', JSON.stringify(p)); } catch (e) { console.log('🛠️ Tool getTaskStats called'); }
      const res = await getTaskStats(userId, p);
      try { console.log('🛠️ Tool getTaskStats result:', JSON.stringify(res?.stats || {})); } catch (e) { console.log('🛠️ Tool getTaskStats result'); }
      return res;
    },
  }) as any;
  statsTool.__paramSchema = getTaskStatsSchema;

  return {
    createTask: createTool,
    updateTask: updateTool,
    deleteTask: deleteTool,
    searchTasks: searchTool,
    getTaskStats: statsTool,
  };
}

// ======================= SYSTEM PROMPT =======================
const systemPrompt = `Eres "AI Todo Manager" en español. Tienes herramientas (tools/functions) disponibles y DEBES usarlas para todas las operaciones CRUD.

USO DE HERRAMIENTAS (OBLIGATORIO - NO OPCIONAL):
1. Para ver/listar/buscar tareas: LLAMA searchTasks con los filtros apropiados (si solo piden pendientes: completed=false; si dicen todas no pongas completed).
2. Para crear tareas: LLAMA createTask obligatoriamente (extrae title, priority, category y dueDate si se mencionan; si no, priority=medium y category=other).
3. Para actualizar o marcar completada: LLAMA updateTask (puedes referirte al número listado anteriormente, el sistema lo convierte al id real).
4. Para eliminar: LLAMA deleteTask obligatoriamente. Para eliminar todas las completadas primero confirma y usa taskId="ALL_COMPLETED" con confirm=true.
5. Para estadísticas: LLAMA getTaskStats con el period correcto.

IMPORTANTE:
- NUNCA respondas sin llamar la herramienta correspondiente.
- Si el usuario pide "crea una tarea X", primero LLAMA createTask con {title: "X", priority: "medium", category: "other"} y luego resume el resultado.
- Si el usuario pide "elimina la tarea N", primero LLAMA deleteTask con {taskId: "N"} y luego confirma.
- NO inventes resultados: siempre ejecuta la tool primero y luego resume lo que devolvió.

FORMATO DE RESPUESTA:
- Siempre ejecuta la herramienta ANTES de elaborar la explicación.
- Resume resultados con emojis: ✅ (completada), ⏳ (pendiente), 🗑️ (eliminada), 📊 (stats), 📋 (listado).
- Al listar tareas numeradas usa: N. ✅|⏳ **Título** · Prioridad · Categoría · (vence DD/MM/YYYY si aplica).

LÓGICA:
- Si el usuario da varias acciones en una frase, ejecuta varias herramientas en orden lógico (crear primero, luego actualizar, etc.).
- Confirma acciones destructivas múltiples antes (el modelo puede pedir confirmación previa si no hubo confirm=true).
- Si la referencia a una tarea es ambigua, primero llama searchTasks para reducir el conjunto.

FLUJO PARA ACTUALIZAR/ELIMINAR POR TÍTULO:
- Si el usuario dice "edita/actualiza/elimina la tarea X" (donde X es un título, no un número):
  1. PRIMERO: llama searchTasks con {query: "X"} para buscar la tarea
  2. SEGUNDO: usa el ID de la tarea encontrada para llamar updateTask o deleteTask
  3. NUNCA uses el título directamente como taskId - siempre busca primero
- Si el usuario dice "edita la tarea 1" o "elimina la 2" (un número), úsalo directamente como taskId.

Devuelve siempre información clara y breve. No inventes tareas ni estadísticas que no provienen de las herramientas.`;

// ======================= ROUTE =======================
export async function POST(req: NextRequest) {
  try {
    // Rate limiting per user
    const userId = getUserIdFromRequest(req);
    const rl = rateLimit(userId);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rl.retryAfter }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    if (!USE_GOOGLE && !USE_DIRECT_OPENAI && !process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY is missing on server. Configure .env.local' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (USE_DIRECT_OPENAI && !process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is missing on server. Configure .env.local' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
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

    // normalizedMessages ya contiene { role, content: string } que es el formato de ModelMessage
    // Evitamos transformar a UIMessage para no romper la validación del SDK.
    

    if (normalizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron mensajes válidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Debug: log normalized messages to help troubleshoot intent detection issues
    try { console.log('🔍 normalizedMessages:', JSON.stringify(normalizedMessages)); } catch (e) { /* ignore */ }

    // Quick intent detection: if the user explicitly asks to list tasks, do it directly
    const lastMsg = normalizedMessages[normalizedMessages.length - 1];
    const userTextLower = (lastMsg?.content || '').toLowerCase();
    const quickShowPattern = /(muestra|mostrar|mostra|ver|lista|listar|dame|dime|enseña|enseñar).*(tarea|tareas|recordatorio|recordatorios|pendiente|pendientes)/i;
    const quickCreatePattern = /(crea|crear|agrega|agregar|añade|añadir).*(tarea|recordatorio)/i;
    // Other intent patterns reused in fallback handling
    const showTasksPattern = quickShowPattern;
    const createPattern = quickCreatePattern;
    const deletePattern = /(elimina|eliminar|borra|borrar|quitar)\b/i;
    const completePattern = /(marca|marcar|completa|complet(o|a)|hecho|termina|terminar)\b/i;
    const statsPattern = /(estadística|estadisticas|estadísticas|cuántas|cuantas|productividad|estadísticas)\b/i;
    const allCompletedMassPattern = /(all_completed|ALL_COMPLETED|eliminar\s+todas|borrar\s+todas|eliminar\s+completas|borrar\s+completas)/i;

    // Shared formatter for listing tasks (used in quick-list and fallback)
    const formatList = (tasks: any[]) => tasks
      .map((t: any, i: number) => `${i + 1}. ${t.completed ? '✅' : '⏳'} **${t.title}** · ${t.priority} · ${t.category}${t.dueDate ? ` · vence ${new Date(t.dueDate).toLocaleDateString('es-AR')}` : ''}`)
      .join('\n');

    // STRICT MODE: All create/update/delete operations must be performed via model tool-calling.
    // We intentionally do NOT run quick-create/quick-complete/quick-delete shortcuts here so the model
    // is required to call the tools (createTask/updateTask/deleteTask). This enforces the assignment
    // requirement that the assistant uses tool-calling for CRUD operations.

    // Helper: try to extract a title from varied user phrasing
    function extractTitleFromUserText(text: string) {
      if (!text) return null;
      // quoted text
      const q = extractQuotedText(text);
      if (q) return q;
      // patterns like "titulo: ..." or "título: ..." or "tiene el titulo: ..."
      const titlePatterns = [/(?:titulo|título)[:\-\s]+\s*"?([^"']+)"?$/i, /tiene el titulo[:\-\s]+\s*"?([^"']+)"?$/i, /que tiene el titulo[:\-\s]+\s*"?([^"']+)"?$/i, /que tiene el título[:\-\s]+\s*"?([^"']+)"?$/i];
      for (const p of titlePatterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1].trim();
      }
      // fallback: try to capture after the words 'recordatorio' or 'tarea'
      const m2 = text.match(/(?:recordatorio|tarea)s?(?:\s+que)?(?:\s+se llama|\s+con el titulo|\s+tiene el titulo|\s+que tiene el titulo|\s*:)\s*"?([^"']+)"?/i);
      if (m2 && m2[1]) return m2[1].trim();
      // last resort: take last clause
      const parts = text.split(/[:\-]\s*/);
      return parts[parts.length - 1].trim();
    }

    // (No pre-model quick-intents for create/update/delete in strict mode.)
    // Quick-list shortcut removed to enforce 100% tool-calling requirement.

    // All requests now rely on the model + tool calling (no manual regex branching for multi-step capabilities)
  const toolCallCounter = { count: 0 };
  const boundTools = buildTools(userId, toolCallCounter);

  // Use AI SDK streamText with tools (works for Groq, OpenAI, OpenRouter)
  // Note: Groq's tool-calling implementation may stop after executing tools (finishReason 'tool-calls').
  // For Groq we run an initial pass to execute tools and collect results, then make a second
  // call with tool outputs appended so the model can produce the final assistant reply.
  try {
    const selectedModel = getModel(MODEL);
    console.log('🚀 Using AI SDK with tool-calling, model:', MODEL);

    // Manual continuation for Google/Groq (both need second call after tool execution)
    if (USE_GOOGLE || USE_GROQ) {
      console.log('🔄 Using manual continuation for', USE_GOOGLE ? 'Google' : 'Groq');
      
      // First call: execute tools
      const firstStream = streamText({
        model: selectedModel,
        system: systemPrompt,
        messages: normalizedMessages,
        tools: boundTools,
        maxSteps: 1, // Only one step - execute tools
        temperature: 0.4,
        maxTokens: 2048,
      });

      // Collect all tool results
      const collectedToolCalls: any[] = [];
      const collectedToolResults: any[] = [];
      let chunkCount = 0;
      
      for await (const chunk of firstStream.fullStream) {
        chunkCount++;
        console.log(`📦 Chunk ${chunkCount}: type=${chunk.type}`);
        
        if (chunk.type === 'tool-call') {
          console.log('🛠️ Tool call:', chunk.toolName, 'args:', JSON.stringify(chunk.args));
          collectedToolCalls.push(chunk);
        }
        if (chunk.type === 'tool-result') {
          console.log('✅ Tool result for:', chunk.toolName);
          console.log('🔍 Tool result output:', JSON.stringify(chunk.output, null, 2).substring(0, 300));
          collectedToolResults.push(chunk);
        }
        if (chunk.type === 'error') {
          console.error('❌ Error chunk:', chunk);
        }
        if (chunk.type === 'finish') {
          console.log('🏁 Finish chunk:', chunk.finishReason);
        }
      }

      console.log(`🔄 Collected ${collectedToolCalls.length} tool calls, ${collectedToolResults.length} tool results`);

      if (collectedToolResults.length === 0) {
        console.warn('⚠️ No tool results collected. Tool calls:', collectedToolCalls.length);
        
        // If we have tool calls but no results, something went wrong
        if (collectedToolCalls.length > 0) {
          return new Response('Hubo un problema ejecutando la acción. Por favor, intenta de nuevo.', { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        }
        
        return new Response('Lo siento, no pude generar una respuesta.', { 
          headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
        });
      }

      // Build a detailed summary of tool results with special formatting for task lists
      const toolResultsSummary = collectedToolResults.map((tr: any) => {
        // The AI SDK uses 'output' property, not 'result'
        const output = tr.output;
        console.log('🔍 Processing tool result:', tr.toolName, 'Output type:', typeof output);
        console.log('🔍 Output keys:', output ? Object.keys(output) : 'null');
        
        let resultStr = '';
        
        // Special formatting for searchTasks results
        if (tr.toolName === 'searchTasks' && output) {
          // Check if output has tasks property
          if (output.tasks && Array.isArray(output.tasks)) {
            const tasks = output.tasks;
            resultStr = `Se encontraron ${tasks.length} tareas:\n\n`;
            tasks.forEach((task: any, idx: number) => {
              const status = task.completed ? '✅ Completada' : '⏳ Pendiente';
              const priority = task.priority ? `[${task.priority.toUpperCase()}]` : '';
              const category = task.category ? `(${task.category})` : '';
              const dueDate = task.dueDate ? ` - Vence: ${new Date(task.dueDate).toLocaleDateString('es')}` : '';
              resultStr += `${idx + 1}. ${task.title} ${status} ${priority} ${category}${dueDate}\n`;
            });
          } else {
            // Fallback: show the raw output
            console.warn('⚠️ searchTasks output missing tasks array');
            resultStr = JSON.stringify(output, null, 2);
          }
        } else {
          // Default formatting for other tools
          resultStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        }
        
        return `Herramienta "${tr.toolName}" ejecutada exitosamente.\n${resultStr}`;
      }).join('\n\n');

      console.log('📝 Summary for model:\n', toolResultsSummary);

      // Create a user message asking for a natural response based on the tool results
      const continuationMessages = [
        {
          role: 'user' as const,
          content: `Contexto: El usuario preguntó "${normalizedMessages[normalizedMessages.length - 1].content}"\n\nSe ejecutaron las siguientes herramientas:\n\n${toolResultsSummary}\n\nPor favor, responde al usuario en español de forma natural y clara basándote en estos resultados. Lista las tareas de manera organizada.`
        }
      ];

      // Second call: generate final response based on tool results
      const finalResult = streamText({
        model: selectedModel,
        system: 'Eres un asistente útil que responde en español. Tu tarea es interpretar los resultados de herramientas y presentarlos de forma clara y natural al usuario.',
        messages: continuationMessages,
        temperature: 0.5,
        maxTokens: 512,
      });

      return finalResult.toTextStreamResponse();
    }

    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages: normalizedMessages,
      tools: boundTools,
      maxSteps: 5,
      temperature: 0.4,
      maxTokens: 2048,
      onStepFinish: (event) => {
        console.log(`🛠️ Step ${event.stepNumber || '?'} finished:`, {
          toolCalls: event.toolCalls?.length || 0,
          toolResults: event.toolResults?.length || 0,
          finishReason: event.finishReason,
          text: event.text?.slice(0, 100) || '(no text)',
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('❌ AI SDK error:', error);
    const err = error as Error;
    
    // Check if it's a Groq 500 error
    const isGroq500 = err.message.includes('500') && USE_GROQ;
    
    if (isGroq500) {
      return new Response(
        JSON.stringify({ 
          error: 'Servicio temporalmente no disponible',
          details: 'Groq (api.groq.com) está experimentando problemas técnicos. Este es un error de su infraestructura (Cloudflare), no de tu aplicación.',
          suggestions: [
            '1. Esperá 5-10 minutos y reintentá',
            '2. Verificá el status en https://status.groq.com/',
            '3. O configurá OPENROUTER_API_KEY como alternativa (https://openrouter.ai/keys)',
          ],
          timestamp: new Date().toISOString(),
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'AI request failed', 
        details: err.message,
        hint: 'Verificá tu conexión y configuración de API keys.'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  } catch (outerErr: unknown) {
    console.error('❌ POST /api/chat outer error:', outerErr);
    return new Response(
      JSON.stringify({ error: 'Server error', details: (outerErr as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ======================= TASK HELPERS =======================
// Implementations used by tool bindings and quick intent branches
async function createTask(userId: string, params: { title: string; priority?: string; category?: string; dueDate?: string }) {
  const { title, priority = 'medium', category = 'other', dueDate } = params as any;
  if (!title || !title.trim()) {
    return { success: false, error: 'Título vacío', message: '❌ El título no puede estar vacío' };
  }
  const parsedDue = dueDate ? parseISOorNull(dueDate) : null;
  if (parsedDue && parsedDue < new Date()) {
    return { success: false, error: 'dueDate must be future', message: '❌ Error: La fecha límite debe ser una fecha futura' };
  }
  try {
    const task = await prisma.task.create({
      data: {
        userId,
        title: title.trim(),
        priority: priority as any,
        category: category as any,
        dueDate: parsedDue,
      },
    });
    return {
      success: true,
      task: { id: task.id, title: task.title, priority: task.priority, category: task.category, dueDate: task.dueDate, createdAt: task.createdAt },
      message: `✅ Tarea creada: "${task.title}"`,
    };
  } catch (err: any) {
    console.error('Error creating task:', err);
    return { success: false, error: 'DB error', details: err?.message, message: '❌ No se pudo crear la tarea' };
  }
}

async function updateTask(userId: string, params: { taskId: string; title?: string; completed?: boolean; priority?: string; category?: string; dueDate?: string | null }) {
  const { taskId, title, completed, priority, category, dueDate } = params as any;
  if (!taskId) return { success: false, error: 'taskId missing', message: '❌ taskId faltante' };
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!existing) return { success: false, error: `No se encontró la tarea ${taskId}`, message: `❌ No se encontró la tarea ${taskId}` };
  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (completed !== undefined) updateData.completed = completed;
  if (priority !== undefined) updateData.priority = priority;
  if (category !== undefined) updateData.category = category;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  try {
    const task = await prisma.task.update({ where: { id: taskId }, data: updateData });
    return { success: true, task, message: `✏️ Tarea actualizada: "${task.title}"` };
  } catch (err: any) {
    console.error('Error updating task:', err);
    return { success: false, error: 'DB error', details: err?.message, message: '❌ No se pudo actualizar la tarea' };
  }
}

async function deleteTask(userId: string, params: { taskId: string; confirm?: boolean }) {
  const { taskId, confirm } = params as any;
  if (!taskId) return { success: false, error: 'taskId missing', message: '❌ taskId faltante' };
  try {
    if (taskId === 'ALL_COMPLETED') {
      if (!confirm) return { success: false, error: 'confirm required', message: '⚠️ Requiere confirm=true para borrar todas las completadas.' };
      const res = await prisma.task.updateMany({ where: { userId, deletedAt: null, completed: true }, data: { deletedAt: new Date() } });
      return { success: true, message: `🗑️ Eliminadas ${res.count} tareas completadas` };
    }
    const existing = await prisma.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
    if (!existing) return { success: false, error: `No se encontró la tarea ${taskId}`, message: `❌ No se encontró la tarea ${taskId}` };
    const task = await prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
    return { success: true, task: { id: task.id, title: task.title }, message: `🗑️ Tarea eliminada: "${task.title}"` };
  } catch (err: any) {
    console.error('Error deleting task:', err);
    return { success: false, error: 'DB error', details: err?.message, message: '❌ No se pudo eliminar la tarea' };
  }
}

async function findTaskByTitlePart(userId: string, titlePart: string) {
  if (!titlePart) return null;
  const t = await prisma.task.findFirst({
    where: { userId, deletedAt: null, title: { contains: titlePart, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
  });
  return t;
}

// ======================= END TASK HELPERS =======================

function extractPriority(text: string) {
  if (!text) return undefined;
  if (/\balta\b|\burgente\b|\bimportante\b/i.test(text)) return 'high';
  if (/\bbaja\b|\bmenos importante\b/i.test(text)) return 'low';
  if (/\bmedia\b|\bnormal\b/i.test(text)) return 'medium';
  return undefined;
}

function extractDueDate(text: string) {
  if (!text) return undefined;
  // look for YYYY-MM-DD or DD/MM/YYYY
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dmy) {
    const parts = dmy[1].split('/');
    const reform = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return reform;
  }
  if (/\bhoy\b/i.test(text)) return new Date().toISOString().slice(0,10);
  if (/\bmañan/i.test(text)) { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
  if (/pasado mañana/i.test(text)) { const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().slice(0,10); }
  return undefined;
}