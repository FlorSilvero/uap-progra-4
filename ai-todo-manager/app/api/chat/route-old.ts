// @ts-nocheck
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { prisma } from '@/lib/prisma';

// Configurar OpenRouter como OpenAI compatible
const config = new Configuration({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  basePath: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
});

const openai = new OpenAIApi(config);

// Definición de las 5 tools

// 1. createTask - Crear nueva tarea
const createTaskTool = tool({
  description: 'Crear una nueva tarea en el sistema. Úsala cuando el usuario quiera agregar, crear o anotar una tarea nueva.',
  parameters: z.object({
    userId: z.string().describe('ID del usuario (usa "demo-user" por defecto)'),
    title: z.string().describe('Título o descripción de la tarea'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Nivel de prioridad de la tarea'),
    category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Categoría de la tarea'),
    dueDate: z.string().optional().describe('Fecha límite en formato ISO (YYYY-MM-DD)'),
  }),
  execute: async (args) => {
    const { userId, title, priority, category, dueDate } = args;
    try {
      const task = await prisma.task.create({
        data: {
          userId,
          title: title.trim(),
          priority: priority || 'medium',
          category: category || 'other',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      return {
        success: true,
        task,
        message: `Tarea "${task.title}" creada exitosamente con prioridad ${task.priority}`,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al crear la tarea',
      };
    }
  },
});

// 2. updateTask - Actualizar tarea existente
const updateTaskTool = tool({
  description: 'Modificar una tarea existente (título, estado, prioridad, etc). Úsala cuando el usuario quiera marcar como completada, cambiar prioridad, renombrar o actualizar una tarea.',
  parameters: z.object({
    taskId: z.string().describe('ID único de la tarea a actualizar'),
    title: z.string().optional().describe('Nuevo título de la tarea'),
    completed: z.boolean().optional().describe('Estado de completitud (true = completada)'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Nueva prioridad'),
    category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Nueva categoría'),
    dueDate: z.string().nullable().optional().describe('Nueva fecha límite (null para eliminar)'),
  }),
  execute: async (args) => {
    const { taskId, title, completed, priority, category, dueDate } = args;
    try {
      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title.trim();
      if (completed !== undefined) updateData.completed = completed;
      if (priority !== undefined) updateData.priority = priority;
      if (category !== undefined) updateData.category = category;
      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      const task = await prisma.task.update({
        where: { id: taskId, deletedAt: null },
        data: updateData,
      });

      return {
        success: true,
        task,
        message: `Tarea "${task.title}" actualizada exitosamente`,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Tarea no encontrada o error al actualizar',
      };
    }
  },
});

// 3. deleteTask - Eliminar tarea
const deleteTaskTool = tool({
  description: 'Eliminar una o más tareas del sistema. Úsala cuando el usuario quiera borrar, eliminar o quitar tareas. Para acciones masivas, primero busca las tareas con searchTasks.',
  parameters: z.object({
    taskId: z.string().describe('ID único de la tarea a eliminar'),
  }),
  execute: async (args) => {
    const { taskId } = args;
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        return {
          success: false,
          error: 'Tarea no encontrada',
        };
      }

      await prisma.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      return {
        success: true,
        message: `Tarea "${task.title}" eliminada exitosamente`,
        deletedTask: { id: task.id, title: task.title },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al eliminar la tarea',
      };
    }
  },
});

// 4. searchTasks - Buscar y filtrar tareas
const searchTasksTool = tool({
  description: 'Buscar, filtrar y listar tareas según diversos criterios. Úsala para mostrar tareas, buscar por texto, filtrar por estado/prioridad/categoría, o listar tareas con fechas específicas.',
  parameters: z.object({
    userId: z.string().describe('ID del usuario (usa "demo-user" por defecto)'),
    query: z.string().optional().describe('Texto de búsqueda en el título'),
    completed: z.boolean().optional().describe('Filtrar por estado completado (true/false)'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Filtrar por prioridad'),
    category: z.enum(['work', 'personal', 'shopping', 'health', 'other']).optional().describe('Filtrar por categoría'),
    dueDateFrom: z.string().optional().describe('Fecha inicio del rango (ISO)'),
    dueDateTo: z.string().optional().describe('Fecha fin del rango (ISO)'),
    sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).optional().describe('Campo de ordenamiento'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Orden ascendente o descendente'),
    limit: z.number().optional().describe('Número máximo de resultados'),
  }),
  execute: async (args) => {
    const { userId, query, completed, priority, category, dueDateFrom, dueDateTo, sortBy, sortOrder, limit } = args;
    try {
      const where: any = {
        userId,
        deletedAt: null,
      };

      if (query) {
        where.title = { contains: query, mode: 'insensitive' };
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
        tasks,
        total,
        message: `Se encontraron ${total} tarea(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al buscar tareas',
        tasks: [],
        total: 0,
      };
    }
  },
});

// 5. getTaskStats - Obtener estadísticas
const getTaskStatsTool = tool({
  description: 'Generar estadísticas y analytics de productividad del usuario. Úsala cuando el usuario pregunte sobre estadísticas, productividad, cuántas tareas tiene, o su progreso.',
  parameters: z.object({
    userId: z.string().describe('ID del usuario (usa "demo-user" por defecto)'),
    period: z.enum(['today', 'week', 'month', 'year', 'all-time']).optional().describe('Periodo de tiempo para las estadísticas'),
  }),
  execute: async (args) => {
    const { userId, period } = args;
    try {
      // Calcular rango de fechas según el periodo
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

      // Por prioridad
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

      // Por categoría
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

      const stats = {
        summary: {
          totalTasks,
          completedTasks,
          pendingTasks,
          completionRate: Math.round(completionRate * 100) / 100,
          overdueTasks,
        },
        byPriority,
        byCategory,
      };

      return {
        success: true,
        stats,
        message: `Estadísticas calculadas para el periodo: ${period || 'all-time'}`,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error al calcular estadísticas',
      };
    }
  },
});

// API Route para el chat
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await openai.createChatCompletion({
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente inteligente para gestión de tareas. Ayudas a los usuarios a:
- Crear, actualizar y eliminar tareas
- Buscar y filtrar tareas según diversos criterios
- Ver estadísticas de productividad
- Organizar su día de manera eficiente

Siempre usa el userId "demo-user" para todas las operaciones.

Sé amigable, conciso y útil. Usa emojis cuando sea apropiado para hacer la experiencia más agradable.

IMPORTANTE: Para cualquier operación con tareas, sugiere al usuario usar la API directamente o proporciona instrucciones claras.`
        },
        ...messages,
      ],
      stream: true,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
