// @ts-nocheck
import { OpenAIStream, StreamingTextResponse, StreamData } from 'ai';
import { prisma } from '@/lib/prisma';

// Configuración de OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';

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

async function getTasks(userId: string, completed?: boolean) {
  const where: any = { userId, deletedAt: null };
  if (completed !== undefined) {
    where.completed = completed;
  }
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return tasks;
}

async function getTaskStats(userId: string) {
  const total = await prisma.task.count({ where: { userId, deletedAt: null } });
  const completed = await prisma.task.count({ where: { userId, deletedAt: null, completed: true } });
  return { total, completed, pending: total - completed };
}

// 🆕 Función para completar/marcar tarea
async function completeTask(userId: string, taskIdentifier: string | number) {
  // Si es un número, buscar por posición (índice)
  if (typeof taskIdentifier === 'number' || !isNaN(Number(taskIdentifier))) {
    const taskIndex = Number(taskIdentifier) - 1; // El usuario dice "1" pero el índice es 0
    const tasks = await prisma.task.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { completed: true },
      });
      return updated;
    }
    return null;
  }
  
  // Si es texto, buscar por título parcial
  const tasks = await prisma.task.findMany({
    where: { 
      userId, 
      deletedAt: null,
      title: { contains: taskIdentifier, mode: 'insensitive' }
    },
  });
  
  if (tasks.length > 0) {
    const updated = await prisma.task.update({
      where: { id: tasks[0].id },
      data: { completed: true },
    });
    return updated;
  }
  
  return null;
}

// 🆕 Función para eliminar tarea (soft delete)
async function deleteTask(userId: string, taskIdentifier: string | number) {
  // Si es un número, buscar por posición
  if (typeof taskIdentifier === 'number' || !isNaN(Number(taskIdentifier))) {
    const taskIndex = Number(taskIdentifier) - 1;
    const tasks = await prisma.task.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      const deleted = await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });
      return deleted;
    }
    return null;
  }
  
  // Si es texto, buscar por título
  const tasks = await prisma.task.findMany({
    where: { 
      userId, 
      deletedAt: null,
      title: { contains: taskIdentifier, mode: 'insensitive' }
    },
  });
  
  if (tasks.length > 0) {
    const deleted = await prisma.task.update({
      where: { id: tasks[0].id },
      data: { deletedAt: new Date() },
    });
    return deleted;
  }
  
  return null;
}

// 🆕 Función para editar título de tarea
async function updateTaskTitle(userId: string, taskIdentifier: string | number, newTitle: string) {
  // Si es un número, buscar por posición
  if (typeof taskIdentifier === 'number' || !isNaN(Number(taskIdentifier))) {
    const taskIndex = Number(taskIdentifier) - 1;
    const tasks = await prisma.task.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    
    if (taskIndex >= 0 && taskIndex < tasks.length) {
      const task = tasks[taskIndex];
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { title: newTitle.trim() },
      });
      return updated;
    }
    return null;
  }
  
  // Si es texto, buscar por título parcial
  const tasks = await prisma.task.findMany({
    where: { 
      userId, 
      deletedAt: null,
      title: { contains: taskIdentifier, mode: 'insensitive' }
    },
  });
  
  if (tasks.length > 0) {
    const updated = await prisma.task.update({
      where: { id: tasks[0].id },
      data: { title: newTitle.trim() },
    });
    return updated;
  }
  
  return null;
}

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
    
    // 🆕 Detectar editar tarea
    else if (lowerMessage.includes('editar') || lowerMessage.includes('modificar') || 
             lowerMessage.includes('cambiar') || lowerMessage.includes('actualizar') ||
             lowerMessage.includes('edita') || lowerMessage.includes('cambia')) {
      console.log('🔍 Detectado posible comando de editar tarea');
      
      // Intentar extraer: número/texto de la tarea + nuevo título
      // Patrón: "edita la tarea 1 a preparar mate" o "edita preparar mate en 1 hora y pon preparar mate"
      const editPatterns = [
        // "edita la tarea 1 y pon/a/por nuevo título"
        /(editar|modificar|cambiar|edita|cambia)\s+(la\s+)?(tarea|recordatorio)?\s*(\d+)\s+(y\s+)?(pon|ahora\s+pon|pone|a|por|en)\s+(.+)/i,
        // "edita preparar mate en 1 hora y pon preparar mate"
        /(editar|modificar|cambiar|edita|cambia)\s+(la\s+)?(tarea|recordatorio)?\s+(de\s+)?(.+?)\s+(y\s+)?(pon|ahora\s+pon|pone|a|por)\s+(.+)/i,
      ];
      
      let taskIdentifier: string | number = '';
      let newTitle = '';
      let matched = false;
      
      for (const pattern of editPatterns) {
        const match = lastMessage.match(pattern);
        if (match) {
          if (match[4] && /^\d+$/.test(match[4])) {
            // Patrón 1: con número
            taskIdentifier = parseInt(match[4]);
            newTitle = match[7];
            matched = true;
            console.log('🔢 Patrón con número - Tarea:', taskIdentifier, 'Nuevo título:', newTitle);
          } else if (match[5] && match[8]) {
            // Patrón 2: con texto
            taskIdentifier = match[5].trim();
            newTitle = match[8];
            matched = true;
            console.log('📝 Patrón con texto - Tarea:', taskIdentifier, 'Nuevo título:', newTitle);
          }
          break;
        }
      }
      
      if (matched && newTitle) {
        const task = await updateTaskTitle('demo-user', taskIdentifier, newTitle);
        if (task) {
          actionResult = `✏️ Tarea editada: "${task.title}"`;
          console.log('✏️ Tarea editada exitosamente');
        } else {
          actionResult = `❌ No encontré la tarea "${taskIdentifier}" para editar.`;
          console.log('❌ No se encontró la tarea');
        }
      } else {
        actionResult = `❓ Por favor usa el formato: "edita la tarea 1 y pon nuevo título" o "edita preparar mate y pon mate listo"`;
        console.log('⚠️ No se pudo extraer información de edición');
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
