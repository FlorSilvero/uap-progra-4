# 🤖 AI Todo Manager - Guía Completa

## ✅ Estado del Proyecto

**IMPORTANTE: Antes de ejecutar, debes configurar tu API Key de OpenRouter**

### Pasos para Configurar:

1. **Obtener API Key de OpenRouter** (Gratis)
   - Ve a https://openrouter.ai/
   - Crea una cuenta gratuita
   - Ve a "API Keys" y genera una nueva key
   - Copia la key (empieza con `sk-or-v1-...`)

2. **Configurar `.env.local`**
   - Abre el archivo `.env.local` en la raíz del proyecto
   - Reemplaza `sk-or-v1-tu-api-key-aqui` con tu API key real
   - Guarda el archivo

3. **Ejecutar el Proyecto**
   ```bash
   npm run dev
   ```
   - Abre http://localhost:3000
   - ¡Listo! Ya puedes chatear con el asistente

## 📋 Funcionalidades Implementadas

### ✅ 5 Tools del LLM

1. **createTask** - Crear nuevas tareas
2. **updateTask** - Modificar tareas existentes
3. **deleteTask** - Eliminar tareas
4. **searchTasks** - Buscar y filtrar tareas
5. **getTaskStats** - Obtener estadísticas de productividad

### ✅ API REST Completa

- `GET /api/tasks` - Listar/buscar tareas con filtros
- `POST /api/tasks` - Crear nueva tarea
- `GET /api/tasks/[id]` - Obtener tarea específica
- `PATCH /api/tasks/[id]` - Actualizar tarea
- `DELETE /api/tasks/[id]` - Eliminar tarea (soft delete)
- `GET /api/tasks/stats` - Obtener estadísticas

- `POST /api/chat` - Endpoint de chat con AI (tool calling)

### ✅ Base de Datos PostgreSQL

- Modelo `Task` con todos los campos requeridos
- Enums: `Priority` (low, medium, high), `Category` (work, personal, shopping, health, other)
- Soft deletes implementados
- Migraciones aplicadas

### ✅ Interfaz de Usuario

- Chat conversacional con streaming de respuestas
- Diseño moderno y responsivo con Tailwind CSS
- Indicadores de loading
- Sugerencias de comandos

## 🎯 Ejemplos de Uso

### Crear Tareas
```
Usuario: "Agregar tarea: comprar leche para mañana"
Usuario: "Crea una tarea de alta prioridad para el informe de ventas"
Usuario: "Necesito recordar llamar al dentista, categoría salud"
```

### Buscar y Filtrar
```
Usuario: "Muéstrame todas mis tareas"
Usuario: "¿Qué tareas tengo de alta prioridad?"
Usuario: "Lista tareas pendientes de trabajo"
Usuario: "Busca tareas que contengan 'comprar'"
```

### Actualizar Tareas
```
Usuario: "Marca como completada la tarea de comprar leche"
Usuario: "Cambia la prioridad de la tarea del informe a baja"
Usuario: "Actualiza la fecha límite del dentista a pasado mañana"
```

### Estadísticas
```
Usuario: "¿Cuántas tareas he completado?"
Usuario: "Muéstrame mis estadísticas de esta semana"
Usuario: "¿Qué tan productivo he sido?"
Usuario: "¿Cuántas tareas tengo pendientes por categoría?"
```

## 🔐 Seguridad Implementada

✅ API Keys solo en backend (nunca expuestas al cliente)
✅ Variables de entorno en `.env.local` (no commiteable)
✅ Validación de todos los inputs
✅ SQL Injection protection (Prisma ORM)
✅ Soft deletes (no se pierden datos)
✅ TypeScript para type safety

## 📁 Archivos Clave

- `/app/api/chat/route.ts` - **LAS 5 TOOLS IMPLEMENTADAS AQUÍ**
- `/app/api/tasks/route.ts` - CRUD de tareas
- `/app/components/ChatInterface.tsx` - UI del chat
- `/prisma/schema.prisma` - Schema de la DB
- `/lib/prisma.ts` - Cliente de Prisma

## 🚨 Troubleshooting

### Error: "Missing API Key"
- Verifica que configuraste `OPENROUTER_API_KEY` en `.env.local`
- Reinicia el servidor (`npm run dev`) después de cambiar `.env.local`

### Error: "Cannot connect to database"
- Asegúrate de que PostgreSQL esté corriendo
- Verifica la conexión en `.env.local`:
  ```
  DATABASE_URL="postgresql://postgres:Flor123@localhost:5432/ia-manager?schema=public"
  ```

### Error: "Prisma Client not found"
```bash
npx prisma generate
```

### El chat no responde
- Verifica que tu API key de OpenRouter sea válida
- Revisa la consola del navegador (F12) para ver errores
- Revisa la terminal del servidor para ver logs

## 🎓 Requisitos del Ejercicio Cumplidos

✅ **Interfaz Conversacional**: Chat moderno con streaming
✅ **5 Tools Implementadas**: createTask, updateTask, deleteTask, searchTasks, getTaskStats
✅ **API Local**: Endpoints REST completos
✅ **Base de Datos**: PostgreSQL con Prisma
✅ **Búsqueda Avanzada**: Múltiples filtros y ordenamiento
✅ **Estadísticas**: Analytics completos de productividad
✅ **Seguridad**: API keys en backend, validaciones, soft deletes

## 📝 Notas Adicionales

- El userId usado por defecto es "demo-user"
- Las tareas eliminadas se marcan con `deletedAt` (soft delete)
- El modelo LLM por defecto es `meta-llama/llama-3.1-8b-instruct:free` (gratis)
- Puedes cambiar el modelo en `.env.local` (ej: `anthropic/claude-3-haiku`)

## 🚀 Siguiente Paso

**¡CONFIGURA TU API KEY Y PRUEBA EL PROYECTO!**

1. Obtén tu API key de https://openrouter.ai/
2. Edita `.env.local` y pega tu key
3. Ejecuta `npm run dev`
4. Abre http://localhost:3000
5. Empieza a chatear: "Hola, muéstrame mis tareas"

¡Disfruta tu AI Todo Manager! 🎉
