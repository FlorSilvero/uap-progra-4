// @ts-nocheck
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Configuración de OpenRouter como proveedor compatible con OpenAI
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
});

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';

// ============================================
// DEFINICIÓN DE LAS 5 TOOLS REQUERIDAS
// ============================================

const tools = {
  // 1️⃣ CREAR TAREA
  createTask: tool({
    description: 'Crear una nueva tarea en el sistema. Usa esta herramienta cuando el usuario quiera agregar, crear o anotar una nueva tarea o recordatorio.',
    parameters: z.object({
      title: z.string().describe('Título o descripción de la tarea'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Prioridad de la tarea: low, medium o high'),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Categoría de la tarea'),
      dueDate: z.string().optional().describe('Fecha límite en formato ISO (YYYY-MM-DD)'),
    }),
    execute: async ({ title, priority, category, dueDate }) => {
      try {
        const task = await prisma.task.create({
          data: {
            userId: 'demo-user', // TODO: Reemplazar con usuario real autenticado
            title: title.trim(),
            priority: priority || 'medium',
            category: category || 'other',
            dueDate: dueDate ? new Date(dueDate) : null,
          },
        });
        
        return {
          success: true,
          task: {
            id: task.id,
            title: task.title,
            priority: task.priority,
            category: task.category,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
          },
          message: `✅ Tarea creada exitosamente: "${task.title}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'No se pudo crear la tarea',
          details: error.message,
        };
      }
    },
  }),

  // 2️⃣ ACTUALIZAR TAREA
  updateTask: tool({
    description: 'Actualizar una tarea existente (título, estado, prioridad, categoría, fecha). Usa esta herramienta cuando el usuario quiera modificar, editar, cambiar o marcar como completada una tarea.',
    parameters: z.object({
      taskId: z.string().describe('ID único de la tarea a actualizar'),
      title: z.string().optional().describe('Nuevo título de la tarea'),
      completed: z.boolean().optional().describe('Estado de completitud (true = completada, false = pendiente)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Nueva prioridad'),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Nueva categoría'),
      dueDate: z.string().nullable().optional().describe('Nueva fecha límite en formato ISO o null para removerla'),
    }),
    execute: async ({ taskId, title, completed, priority, category, dueDate }) => {
      try {
        // Verificar que la tarea existe
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId, deletedAt: null },
        });

        if (!existingTask) {
          return {
            success: false,
            error: `No se encontró la tarea con ID: ${taskId}`,
          };
        }

        // Construir objeto de actualización
        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (completed !== undefined) updateData.completed = completed;
        if (priority !== undefined) updateData.priority = priority;
        if (category !== undefined) updateData.category = category;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

        const task = await prisma.task.update({
          where: { id: taskId },
          data: updateData,
        });

        return {
          success: true,
          task: {
            id: task.id,
            title: task.title,
            completed: task.completed,
            priority: task.priority,
            category: task.category,
            dueDate: task.dueDate,
            updatedAt: task.updatedAt,
          },
          message: `✏️ Tarea actualizada: "${task.title}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'No se pudo actualizar la tarea',
          details: error.message,
        };
      }
    },
  }),

  // 3️⃣ ELIMINAR TAREA
  deleteTask: tool({
    description: 'Eliminar permanentemente una tarea del sistema. Usa esta herramienta cuando el usuario quiera borrar, eliminar o quitar una tarea.',
    parameters: z.object({
      taskId: z.string().describe('ID único de la tarea a eliminar'),
      confirm: z.boolean().optional().describe('Confirmación de eliminación para acciones masivas'),
    }),
    execute: async ({ taskId, confirm }) => {
      try {
        // Verificar que la tarea existe
        const existingTask = await prisma.task.findUnique({
          where: { id: taskId, deletedAt: null },
        });

        if (!existingTask) {
          return {
            success: false,
            error: `No se encontró la tarea con ID: ${taskId}`,
          };
        }

        // Soft delete
        const task = await prisma.task.update({
          where: { id: taskId },
          data: { deletedAt: new Date() },
        });

        return {
          success: true,
          task: {
            id: task.id,
            title: task.title,
          },
          message: `🗑️ Tarea eliminada: "${task.title}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'No se pudo eliminar la tarea',
          details: error.message,
        };
      }
    },
  }),

  // 4️⃣ BUSCAR/LISTAR TAREAS
  searchTasks: tool({
    description: 'Buscar, filtrar y listar tareas según diversos criterios. Usa esta herramienta cuando el usuario quiera ver, listar, buscar o filtrar sus tareas.',
    parameters: z.object({
      query: z.string().optional().describe('Texto a buscar en el título de las tareas'),
      completed: z.boolean().optional().describe('Filtrar por estado: true = completadas, false = pendientes, undefined = todas'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Filtrar por prioridad'),
      category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Filtrar por categoría'),
      dueDateFrom: z.string().optional().describe('Fecha de inicio del rango (formato ISO)'),
      dueDateTo: z.string().optional().describe('Fecha de fin del rango (formato ISO)'),
      sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).optional().describe('Campo por el cual ordenar'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Orden: asc (ascendente) o desc (descendente)'),
      limit: z.number().optional().describe('Número máximo de resultados a retornar'),
    }),
    execute: async ({ query, completed, priority, category, dueDateFrom, dueDateTo, sortBy, sortOrder, limit }) => {
      try {
        // Construir filtros dinámicos
        const where: any = {
          userId: 'demo-user', // TODO: Reemplazar con usuario real
          deletedAt: null,
        };

        if (query) {
          where.title = {
            contains: query,
            mode: 'insensitive',
          };
        }

        if (completed !== undefined) {
          where.completed = completed;
        }

        if (priority) {
          where.priority = priority;
        }

        if (category) {
          where.category = category;
        }

        if (dueDateFrom || dueDateTo) {
          where.dueDate = {};
          if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
          if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
        }

        const tasks = await prisma.task.findMany({
          where,
          orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
          take: limit || 50,
        });

        const total = await prisma.task.count({ where });

        return {
          success: true,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            priority: t.priority,
            category: t.category,
            dueDate: t.dueDate,
            createdAt: t.createdAt,
          })),
          total,
          count: tasks.length,
          hasMore: total > (limit || 50),
        };
      } catch (error) {
        return {
          success: false,
          error: 'No se pudieron buscar las tareas',
          details: error.message,
        };
      }
    },
  }),

  // 5️⃣ OBTENER ESTADÍSTICAS
  getTaskStats: tool({
    description: 'Generar estadísticas y analytics de productividad del usuario. Usa esta herramienta cuando el usuario pregunte sobre estadísticas, cuántas tareas ha completado, su productividad, etc.',
    parameters: z.object({
      period: z.enum(['today', 'week', 'month', 'year', 'all-time']).optional().describe('Periodo de tiempo para las estadísticas'),
      groupBy: z.enum(['category', 'priority', 'date']).optional().describe('Cómo agrupar las estadísticas'),
    }),
    execute: async ({ period, groupBy }) => {
      try {
        const userId = 'demo-user'; // TODO: Reemplazar con usuario real

        // Calcular rango de fechas según periodo
        let dateFilter: any = {};
        const now = new Date();

        switch (period) {
          case 'today':
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            dateFilter = { gte: startOfDay };
            break;
          case 'week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { gte: startOfWeek };
            break;
          case 'month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { gte: startOfMonth };
            break;
          case 'year':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter = { gte: startOfYear };
            break;
          default:
            dateFilter = {};
        }

        // Estadísticas generales
        const totalTasks = await prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
        });

        const completedTasks = await prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            completed: true,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
        });

        const pendingTasks = totalTasks - completedTasks;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const overdueTasks = await prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            completed: false,
            dueDate: { lt: new Date() },
          },
        });

        // Estadísticas por prioridad
        const tasksByPriority = await prisma.task.groupBy({
          by: ['priority'],
          where: {
            userId,
            deletedAt: null,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
          _count: true,
        });

        const byPriority: any = {
          high: { total: 0, completed: 0, pending: 0 },
          medium: { total: 0, completed: 0, pending: 0 },
          low: { total: 0, completed: 0, pending: 0 },
        };

        for (const item of tasksByPriority) {
          const completed = await prisma.task.count({
            where: {
              userId,
              deletedAt: null,
              priority: item.priority,
              completed: true,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
          });

          byPriority[item.priority] = {
            total: item._count,
            completed,
            pending: item._count - completed,
          };
        }

        // Estadísticas por categoría
        const tasksByCategory = await prisma.task.groupBy({
          by: ['category'],
          where: {
            userId,
            deletedAt: null,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
          _count: true,
        });

        const byCategory: any = {
          work: { total: 0, completed: 0, pending: 0 },
          personal: { total: 0, completed: 0, pending: 0 },
          shopping: { total: 0, completed: 0, pending: 0 },
          health: { total: 0, completed: 0, pending: 0 },
          other: { total: 0, completed: 0, pending: 0 },
        };

        for (const item of tasksByCategory) {
          const completed = await prisma.task.count({
            where: {
              userId,
              deletedAt: null,
              category: item.category,
              completed: true,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
          });

          byCategory[item.category] = {
            total: item._count,
            completed,
            pending: item._count - completed,
          };
        }

        // Tareas próximas
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueTodayCount = await prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            completed: false,
            dueDate: {
              gte: today,
              lte: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        const dueThisWeekCount = await prisma.task.count({
          where: {
            userId,
            deletedAt: null,
            completed: false,
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        });

        const nextDueTask = await prisma.task.findFirst({
          where: {
            userId,
            deletedAt: null,
            completed: false,
            dueDate: { gte: new Date() },
          },
          orderBy: { dueDate: 'asc' },
        });

        return {
          success: true,
          stats: {
            summary: {
              totalTasks,
              completedTasks,
              pendingTasks,
              completionRate: Math.round(completionRate * 100) / 100,
              overdueTasks,
            },
            byPriority,
            byCategory,
            upcoming: {
              dueTodayCount,
              dueThisWeekCount,
              nextDueTask: nextDueTask ? {
                id: nextDueTask.id,
                title: nextDueTask.title,
                dueDate: nextDueTask.dueDate,
                priority: nextDueTask.priority,
              } : null,
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: 'No se pudieron obtener las estadísticas',
          details: error.message,
        };
      }
    },
  }),
};

// API Route para el chat
export async function POST(req: Request) {
  console.log('🚀 Chat API con herramientas llamada');
  
  let actionResult: string | null = null; // 🆕 Declarar fuera del try
  
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    console.log('📝 Último mensaje:', lastMessage);
    
    // Detectar intención y ejecutar acción
    const lowerMessage = lastMessage.toLowerCase();
    console.log('🔍 Analizando mensaje en minúsculas:', lowerMessage);
    
    // 🔄 IMPORTANTE: Detectar listado PRIMERO (antes de crear) para evitar conflictos con "dame"
    // Detectar listado de tareas/recordatorios
    if ((lowerMessage.includes('tareas') || lowerMessage.includes('recordatorios') || lowerMessage.includes('recordatorio')) && 
        (lowerMessage.includes('mostrar') || lowerMessage.includes('ver') || lowerMessage.includes('listar') || 
         lowerMessage.includes('cuál') || lowerMessage.includes('cuáles') || lowerMessage.includes('qué') || 
         lowerMessage.includes('tengo') || lowerMessage.includes('hay') || lowerMessage.includes('quiero') ||
         lowerMessage.includes('todos') || lowerMessage.includes('todas') || lowerMessage.includes('dame') ||
         lowerMessage.includes('mis') || lowerMessage.includes('lista'))) {
      console.log('🔍 Detectado comando de listar tareas');
      console.log('📝 Mensaje original:', lastMessage);
      
      // Detectar si pide solo pendientes/no completadas
      let filterCompleted: boolean | undefined = undefined;
      if (lowerMessage.includes('pendiente') || lowerMessage.includes('sin completar') || 
          lowerMessage.includes('no complete') || lowerMessage.includes('falta') ||
          lowerMessage.includes('sin finalizar') || lowerMessage.includes('no finalizada') ||
          lowerMessage.includes('incompleta') || lowerMessage.includes('por hacer') ||
          lowerMessage.includes('todavia no') || lowerMessage.includes('aun no')) {
        filterCompleted = false;
        console.log('🔍 Filtrando solo tareas NO completadas');
      } else if (lowerMessage.includes('completada') || lowerMessage.includes('terminada') || lowerMessage.includes('hecha') ||
                 lowerMessage.includes('completa') || lowerMessage.includes('finalizada') || lowerMessage.includes('terminé') ||
                 lowerMessage.includes('completé') || lowerMessage.includes('acabada')) {
        filterCompleted = true;
        console.log('🔍 Filtrando solo tareas completadas');
      }
      
      const tasks = await getTasks('demo-user', filterCompleted);
      console.log('📊 Tareas encontradas:', tasks.length);
      console.log('📋 Tareas:', JSON.stringify(tasks.map(t => ({ title: t.title, completed: t.completed })), null, 2));
      
      if (tasks.length === 0) {
        actionResult = filterCompleted === false 
          ? '📋 ¡Excelente! No tienes tareas pendientes.' 
          : filterCompleted === true
            ? '📋 No tienes tareas completadas aún.'
            : '📋 No tienes tareas ni recordatorios registrados.';
      } else {
        const statusText = filterCompleted === false ? 'pendiente(s)' : filterCompleted === true ? 'completada(s)' : '';
        actionResult = `📋 Tienes ${tasks.length} tarea(s)/recordatorio(s) ${statusText}:\n\n` + tasks.map((t, i) => 
          `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title} (Prioridad: ${t.priority})`
        ).join('\n');
        console.log('✅ actionResult:', actionResult);
      }
    }
    // Detectar creación de tarea/recordatorio (DESPUÉS de detectar listado)
    else if (lowerMessage.includes('crear') || lowerMessage.includes('agregar') || lowerMessage.includes('añadir') || 
        lowerMessage.includes('agregame') || lowerMessage.includes('nueva tarea') ||
        lowerMessage.includes('nuevo recordatorio')) {
      const title = lastMessage.replace(/^(crear|agregar|añadir|agregame|dame|nueva|nuevo)\s+(tarea|recordatorio)?\s*(de|:)?\s*/i, '').trim();
      if (title && !lowerMessage.includes('todos') && !lowerMessage.includes('todas')) {
        const priority = lowerMessage.includes('urgente') || lowerMessage.includes('importante') ? 'high' : 'medium';
        const task = await createTask('demo-user', title, priority, 'other');
        actionResult = `✅ Tarea creada: "${task.title}" (ID: ${task.id})`;
      }
    }
    
    // Detectar estadísticas
    else if (lowerMessage.includes('estadística') || lowerMessage.includes('cuántas') || lowerMessage.includes('completadas')) {
      const stats = await getTaskStats('demo-user');
      actionResult = `📊 Estadísticas:\n- Total: ${stats.total}\n- Completadas: ${stats.completed}\n- Pendientes: ${stats.pending}`;
    }
    
    // 🆕 Detectar completar/marcar tarea (ANTES del catch-all)
    else if (lowerMessage.includes('completar') || lowerMessage.includes('marcar') || lowerMessage.includes('terminar') || 
         lowerMessage.includes('completé') || lowerMessage.includes('terminé') || lowerMessage.includes('hice') ||
         lowerMessage.includes('complete') || lowerMessage.includes('termine') || lowerMessage.includes('completada') ||
         lowerMessage.includes('hecha')) {
      console.log('🔍 Detectado posible comando de completar tarea');
      
      // Extraer número o texto de la tarea
      const numberMatch = lowerMessage.match(/\d+/);
      let taskIdentifier: string | number = '';
      
      if (numberMatch) {
        taskIdentifier = parseInt(numberMatch[0]);
        console.log('🔢 Número detectado:', taskIdentifier);
        
        const task = await completeTask('demo-user', taskIdentifier);
        if (task) {
          actionResult = `✅ Tarea completada: "${task.title}"`;
          console.log('✅ Tarea completada exitosamente');
        } else {
          actionResult = `❌ No encontré la tarea número ${taskIdentifier}. Intenta listar las tareas primero.`;
          console.log('❌ No se encontró la tarea con ese número');
        }
      } else {
        // Intentar extraer texto después de palabras clave
        const textMatch = lastMessage.match(/(completar|marcar|terminar|terminé|completé|hice|complete|termine)\s+(la\s+)?(tarea|recordatorio)?\s*(de\s+)?(.+)/i);
        if (textMatch && textMatch[5]) {
          taskIdentifier = textMatch[5].trim();
          console.log('📝 Texto detectado:', taskIdentifier);
          
          const task = await completeTask('demo-user', taskIdentifier);
          if (task) {
            actionResult = `✅ Tarea completada: "${task.title}"`;
            console.log('✅ Tarea completada exitosamente');
          } else {
            actionResult = `❌ No encontré la tarea "${taskIdentifier}" para completar.`;
            console.log('❌ No se encontró la tarea con ese texto');
          }
        } else {
          actionResult = `❓ Por favor especifica el número o nombre de la tarea a completar. Ejemplo: "completar tarea 1"`;
          console.log('⚠️ No se pudo extraer identificador de tarea');
        }
      }
    }
    
    // 🆕 Detectar eliminar tarea
    else if (lowerMessage.includes('eliminar') || lowerMessage.includes('borrar') || lowerMessage.includes('quitar') || 
         lowerMessage.includes('elimina') || lowerMessage.includes('borra') || lowerMessage.includes('borrame')) {
      console.log('🔍 Detectado posible comando de eliminar tarea');
      
      // Extraer número o texto de la tarea
      const numberMatch = lowerMessage.match(/\d+/);
      let taskIdentifier: string | number = '';
      
      if (numberMatch) {
        taskIdentifier = parseInt(numberMatch[0]);
        console.log('🔢 Número detectado:', taskIdentifier);
        
        const task = await deleteTask('demo-user', taskIdentifier);
        if (task) {
          actionResult = `🗑️ Tarea eliminada: "${task.title}"`;
          console.log('🗑️ Tarea eliminada exitosamente');
        } else {
          actionResult = `❌ No encontré la tarea número ${taskIdentifier}. Intenta listar las tareas primero.`;
          console.log('❌ No se encontró la tarea con ese número');
        }
      } else {
        // Intentar extraer texto después de palabras clave
        const textMatch = lastMessage.match(/(eliminar|borrar|quitar|elimina|borra|borrame)\s+(la\s+)?(tarea|recordatorio)?\s*(de\s+)?(.+)/i);
        if (textMatch && textMatch[5]) {
          taskIdentifier = textMatch[5].trim();
          console.log('📝 Texto detectado:', taskIdentifier);
          
          const task = await deleteTask('demo-user', taskIdentifier);
          if (task) {
            actionResult = `🗑️ Tarea eliminada: "${task.title}"`;
            console.log('🗑️ Tarea eliminada exitosamente');
          } else {
            actionResult = `❌ No encontré la tarea "${taskIdentifier}" para eliminar.`;
            console.log('❌ No se encontró la tarea con ese texto');
          }
        } else {
          actionResult = `❓ Por favor especifica el número o nombre de la tarea a eliminar. Ejemplo: "eliminar tarea 1"`;
          console.log('⚠️ No se pudo extraer identificador de tarea');
        }
      }
    }
    
    // 🆕 Detectar editar tarea (título, prioridad, estado)
    else if (lowerMessage.includes('editar') || lowerMessage.includes('modificar') || 
             lowerMessage.includes('cambiar') || lowerMessage.includes('actualizar') ||
             lowerMessage.includes('edita') || lowerMessage.includes('cambia')) {
      console.log('🔍 Detectado posible comando de editar tarea');
      
      // Extraer número de tarea
      const numberMatch = lowerMessage.match(/\d+/);
      let taskIdentifier: string | number = '';
      
      if (numberMatch) {
        taskIdentifier = parseInt(numberMatch[0]);
        console.log('🔢 Número detectado:', taskIdentifier);
      } else {
        // Buscar por texto en el mensaje
        const textMatch = lastMessage.match(/(editar|modificar|cambiar|edita|cambia)\s+(la\s+)?(tarea|recordatorio)?\s+(de\s+)?(.+?)\s+(y\s+|a\s+|por\s+|en\s+)/i);
        if (textMatch && textMatch[5]) {
          taskIdentifier = textMatch[5].trim();
          console.log('📝 Texto detectado:', taskIdentifier);
        }
      }
      
      if (taskIdentifier) {
        const updates: any = {};
        let updateDescription = '';
        
        // Detectar cambio de prioridad
        if (lowerMessage.includes('prioridad')) {
          if (lowerMessage.includes('alta') || lowerMessage.includes('urgente') || lowerMessage.includes('importante') || lowerMessage.includes('high')) {
            updates.priority = 'high';
            updateDescription += 'prioridad a alta';
          } else if (lowerMessage.includes('media') || lowerMessage.includes('normal') || lowerMessage.includes('medium')) {
            updates.priority = 'medium';
            updateDescription += 'prioridad a media';
          } else if (lowerMessage.includes('baja') || lowerMessage.includes('low')) {
            updates.priority = 'low';
            updateDescription += 'prioridad a baja';
          }
        }
        
        // Detectar cambio de estado
        if (lowerMessage.includes('estado') || lowerMessage.includes('marcar como')) {
          if (lowerMessage.includes('completada') || lowerMessage.includes('terminada') || lowerMessage.includes('hecha') || lowerMessage.includes('finalizada')) {
            updates.completed = true;
            updateDescription += (updateDescription ? ', ' : '') + 'estado a completada';
          } else if (lowerMessage.includes('pendiente') || lowerMessage.includes('incompleta') || lowerMessage.includes('sin completar')) {
            updates.completed = false;
            updateDescription += (updateDescription ? ', ' : '') + 'estado a pendiente';
          }
        }
        
        // Detectar cambio de título
        const titlePatterns = [
          /(pon|pone|título|titulo|nombre)\s+(.+)/i,
          /(y\s+)?a\s+"([^"]+)"/i,
          /(y\s+)?por\s+"([^"]+)"/i,
        ];
        
        for (const pattern of titlePatterns) {
          const match = lastMessage.match(pattern);
          if (match && match[2]) {
            let newTitle = match[2].trim();
            // Limpiar palabras clave de la captura
            newTitle = newTitle.replace(/(prioridad|estado|alta|media|baja|completada|pendiente|high|medium|low)/gi, '').trim();
            if (newTitle && newTitle.length > 2) {
              updates.title = newTitle;
              updateDescription += (updateDescription ? ', ' : '') + `título a "${newTitle}"`;
              break;
            }
          }
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('🔧 Actualizaciones a aplicar:', updates);
          const task = await updateTask('demo-user', taskIdentifier, updates);
          if (task) {
            actionResult = `✏️ Tarea actualizada (${updateDescription}): "${task.title}"`;
            console.log('✏️ Tarea editada exitosamente');
          } else {
            actionResult = `❌ No encontré la tarea "${taskIdentifier}" para editar.`;
            console.log('❌ No se encontró la tarea');
          }
        } else {
          actionResult = `❓ Por favor especifica qué quieres editar. Ejemplos:\n- "edita la tarea 1 prioridad a alta"\n- "edita la tarea 2 estado a completada"\n- "edita la tarea 1 y pon nuevo título"`;
          console.log('⚠️ No se detectaron campos a actualizar');
        }
      } else {
        actionResult = `❓ Por favor especifica el número de la tarea a editar.`;
        console.log('⚠️ No se pudo extraer identificador de tarea');
      }
    }
    
    // 🆕 Catch-all: Si menciona "tareas" o "recordatorios" pero no matcheó ninguna acción específica, listar
    else if ((lowerMessage.includes('tarea') || lowerMessage.includes('recordatorio')) && 
             !lowerMessage.includes('crear') && !lowerMessage.includes('agregar')) {
      console.log('🔍 Detectado mención de tareas/recordatorios (catch-all)');
      
      // Detectar filtros también en catch-all
      let filterCompleted: boolean | undefined = undefined;
      if (lowerMessage.includes('pendiente') || lowerMessage.includes('sin completar') || 
          lowerMessage.includes('sin finalizar') || lowerMessage.includes('no finalizada') ||
          lowerMessage.includes('incompleta') || lowerMessage.includes('por hacer')) {
        filterCompleted = false;
        console.log('🔍 Catch-all: Filtrando solo NO completadas');
      } else if (lowerMessage.includes('completada') || lowerMessage.includes('completa') || 
                 lowerMessage.includes('finalizada') || lowerMessage.includes('terminada') || 
                 lowerMessage.includes('hecha')) {
        filterCompleted = true;
        console.log('🔍 Catch-all: Filtrando solo completadas');
      }
      
      const tasks = await getTasks('demo-user', filterCompleted);
      console.log('📊 Tareas encontradas:', tasks.length);
      
      if (tasks.length === 0) {
        actionResult = filterCompleted === false 
          ? '📋 ¡Excelente! No tienes tareas pendientes.' 
          : filterCompleted === true
            ? '📋 No tienes tareas completadas aún.'
            : '📋 No tienes tareas ni recordatorios registrados.';
      } else {
        const statusText = filterCompleted === false ? 'pendiente(s)' : filterCompleted === true ? 'completada(s)' : '';
        actionResult = `📋 Tienes ${tasks.length} tarea(s)/recordatorio(s) ${statusText}:\n\n` + tasks.map((t, i) => 
          `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title} (Prioridad: ${t.priority})`
        ).join('\n');
        console.log('✅ actionResult (catch-all):', actionResult);
      }
    }

    // 🆕 Si hay actionResult, devolver en formato de stream compatible con Vercel AI SDK
    if (actionResult) {
      console.log('✅✅✅ HAY ACTIONRESULT - DEVOLVIENDO STREAM COMPATIBLE ✅✅✅');
      console.log('📤 Contenido a enviar:', actionResult);
      console.log('📏 Longitud del contenido:', actionResult.length);
      
      // Crear un stream compatible con el formato esperado por useChat
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Formato de Vercel AI SDK: cada chunk es "0:" seguido de JSON
          const chunk = `0:${JSON.stringify(actionResult)}\n`;
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        }
      });
      
      console.log('🔄 Stream compatible creado');
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

    console.log('⚠️⚠️⚠️ NO HAY ACTIONRESULT - USANDO LLM ⚠️⚠️⚠️');

    // Preparar el prompt del sistema (solo si NO hay actionResult)
    const systemPrompt = `Eres un asistente inteligente para gestión de tareas y recordatorios en español.

Responde de forma amigable y concisa.

Puedes ayudar con:
- Crear tareas/recordatorios: "agregame una tarea de hacer X"
- Ver todas las tareas: "mostrame todos mis recordatorios"
- Completar tareas: "completar 1", "marcar 2"
- Eliminar tareas: "eliminar 1", "borrar 2"
- Estadísticas: "cuántas tareas tengo completadas"

IMPORTANTE: NO inventes tareas. Si el usuario pide ver sus tareas pero no detectaste el comando correctamente, pídele que reformule el mensaje.

Usa emojis para hacer la experiencia más agradable.`;

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
      
      // 🆕 FALLBACK: Si OpenRouter falla, devolver actionResult directamente
      if (actionResult) {
        console.log('⚠️ OpenRouter falló, usando fallback con actionResult');
        return new Response(actionResult, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('❌ ERROR:', error);
    
    // 🆕 Si hay actionResult, devolverlo como respuesta de emergencia
    if (actionResult) {
      console.log('⚠️ Error en IA, devolviendo actionResult directamente');
      return new Response(actionResult, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
