# 🤖 AI Todo Manager

Un gestor de tareas inteligente con interfaz conversacional utilizando Next.js, el AI SDK de Vercel, y OpenRouter. Gestiona tus tareas de forma natural a través de una conversación con un asistente de IA.

## ✨ Características

- **Interfaz Conversacional**: Gestiona tareas hablando de forma natural con un asistente de IA
- **5 Herramientas Inteligentes**: El LLM puede ejecutar automáticamente operaciones CRUD sobre tareas
- **Búsqueda Avanzada**: Busca y filtra tareas por múltiples criterios
- **Estadísticas de Productividad**: Analytics completos con streaks, tiempo promedio, día más productivo, etc.
- **Base de Datos Persistente**: Almacenamiento seguro con PostgreSQL y Prisma
- **Soft Deletes**: Permite recuperar tareas eliminadas
- **Validaciones Robustas**: Validación completa de inputs y fechas

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL (o SQLite para desarrollo)
- Una cuenta en [OpenRouter](https://openrouter.ai/) para obtener una API key

### Instalación

1. **Clonar el repositorio** (o usar el proyecto existente)

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# OpenRouter API Key - NUNCA commitear este archivo
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# OpenRouter Base URL
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Modelo LLM a utilizar
OPENROUTER_MODEL=anthropic/claude-3-haiku

# Database connection string
DATABASE_URL=postgresql://user:password@localhost:5432/todomanager
```

**⚠️ IMPORTANTE**: 
- Nunca expongas tu API key en el frontend
- No hagas commit del archivo `.env.local`
- Obtén tu API key en [OpenRouter](https://openrouter.ai/keys)

4. **Configurar la base de datos**:
```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

5. **Iniciar el servidor de desarrollo**:
```bash
npm run dev
```

6. **Abrir en el navegador**:
Navega a [http://localhost:3000](http://localhost:3000)

## 🛠️ Herramientas del Sistema

El sistema incluye 5 herramientas que el LLM puede ejecutar automáticamente:

### 1. `createTask`
Crear una nueva tarea en el sistema.

**Ejemplos de uso**:
- "Agregar tarea: comprar leche"
- "Necesito recordar llamar al doctor mañana"
- "Crea una tarea para terminar el informe"

**Parámetros**:
- `title` (requerido): Título de la tarea
- `priority` (opcional): "low" | "medium" | "high"
- `category` (opcional): "work" | "personal" | "shopping" | "health" | "other"
- `dueDate` (opcional): Fecha límite en formato ISO

### 2. `updateTask`
Modificar una tarea existente.

**Ejemplos de uso**:
- "Marca como completada la tarea de comprar leche"
- "Cambia la prioridad de 'hacer ejercicio' a alta"
- "Renombra la tarea 'informe' a 'informe trimestral Q1'"

**Parámetros**:
- `taskId` (requerido): ID único de la tarea
- `title`, `completed`, `priority`, `category`, `dueDate` (opcionales)

### 3. `deleteTask`
Eliminar permanentemente una tarea (soft delete).

**Ejemplos de uso**:
- "Elimina la tarea de comprar leche"
- "Borra todas las tareas completadas"

**Parámetros**:
- `taskId` (requerido): ID único de la tarea
- `confirm` (opcional): Para acciones masivas

### 4. `searchTasks`
Buscar, filtrar y listar tareas según diversos criterios.

**Ejemplos de uso**:
- "Muéstrame todas mis tareas"
- "¿Qué tareas tengo pendientes?"
- "Lista las tareas de alta prioridad"
- "Busca tareas que contengan 'informe'"

**Parámetros**:
- `query`: Texto de búsqueda
- `completed`: Filtrar por estado
- `priority`: Filtrar por prioridad
- `category`: Filtrar por categoría
- `dueDateFrom`, `dueDateTo`: Rango de fechas
- `sortBy`, `sortOrder`: Ordenamiento
- `limit`: Número máximo de resultados

### 5. `getTaskStats`
Generar estadísticas y analytics de productividad.

**Ejemplos de uso**:
- "¿Cuántas tareas he completado?"
- "Muéstrame mis estadísticas"
- "¿Qué tan productivo he sido esta semana?"

**Retorna**:
- Resumen: totales, completadas, pendientes, tasa de completitud, atrasadas
- Por prioridad: estadísticas por nivel de prioridad
- Por categoría: estadísticas por categoría
- Timeline: tareas creadas/completadas hoy y esta semana
- Productividad: tiempo promedio, día más productivo, streaks
- Próximas: tareas con fecha límite próxima

## 📁 Estructura del Proyecto

```
ai-todo-manager/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Endpoint de chat con tool calling
│   │   └── tasks/
│   │       ├── route.ts            # CRUD de tareas
│   │       ├── [id]/
│   │       │   └── route.ts        # Operaciones por ID
│   │       └── stats/
│   │           └── route.ts        # Estadísticas
│   ├── components/
│   │   └── ChatInterface.tsx       # Componente de chat
│   ├── page.tsx                    # Página principal
│   └── layout.tsx                   # Layout principal
├── lib/
│   └── prisma.ts                    # Cliente de Prisma
├── prisma/
│   └── schema.prisma                # Schema de base de datos
└── .env.local                       # Variables de entorno (no commitear)
```

## 🔐 Seguridad

### Reglas de Oro

1. **API Keys solo en backend**: Las API keys nunca se exponen en el frontend
2. **Variables de entorno**: Usar `.env.local` para keys sensibles, sin `NEXT_PUBLIC_` prefix
3. **Nunca commitear keys**: El archivo `.env.local` está en `.gitignore`
4. **Validación de inputs**: Todos los inputs del usuario se validan y sanitizan
5. **SQL Injection Protection**: Usar Prisma ORM con prepared statements
6. **Rate limiting**: Implementar límites para prevenir abuso

## 🗄️ Base de Datos

El proyecto usa **PostgreSQL** con **Prisma ORM**. El schema incluye:

- **Task**: Modelo principal con campos para título, estado, prioridad, categoría, fechas
- **Soft Deletes**: Las tareas eliminadas se marcan con `deletedAt` en lugar de eliminarse
- **Índices**: Optimizados para búsquedas frecuentes
- **Validaciones**: Constraints a nivel de base de datos

### Migraciones

```bash
# Crear una nueva migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear la base de datos (desarrollo)
npx prisma migrate reset
```

## 🧪 Testing

### Probar las herramientas manualmente

Puedes probar las herramientas directamente usando el chat:

1. "Agregar tarea: comprar leche"
2. "Muéstrame todas mis tareas"
3. "Marca como completada la de comprar leche"
4. "¿Cuántas tareas he completado?"

### Probar las APIs REST

```bash
# Crear tarea
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","title":"Test task"}'

# Buscar tareas
curl "http://localhost:3000/api/tasks?userId=demo-user"

# Obtener estadísticas
curl "http://localhost:3000/api/tasks/stats?userId=demo-user&period=week"
```

## 📚 Tecnologías Utilizadas

- **Next.js 16**: Framework React con App Router
- **Vercel AI SDK**: Streaming y tool calling
- **OpenRouter**: Acceso a múltiples modelos LLM
- **Prisma**: ORM para base de datos
- **PostgreSQL**: Base de datos relacional
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Zod**: Validación de esquemas

## 🎯 Casos de Uso

### Ejemplo de Conversación

```
Usuario: "Hola, necesito organizar mis tareas del día"

AI: "¡Claro! Puedo ayudarte a gestionar tus tareas. ¿Qué necesitas hacer hoy?"

Usuario: "Agregar tres tareas: comprar leche, terminar informe de ventas, y llamar al dentista. El informe es urgente."

AI: [Ejecuta createTask 3 veces]
    "Perfecto, agregué estas 3 tareas:
    ✅ Comprar leche (Prioridad: media)
    ⚡ Terminar informe de ventas (Prioridad: alta)
    📞 Llamar al dentista (Prioridad: media)"

Usuario: "Ya compré la leche, márcala como completada"

AI: [Ejecuta searchTasks + updateTask]
    "¡Excelente! Marqué 'Comprar leche' como completada ✓"

Usuario: "¿Qué tan productivo he sido esta semana?"

AI: [Ejecuta getTaskStats]
    "📊 Tu productividad esta semana:
    ✅ Completadas: 8 tareas
    ⏳ Pendientes: 3 tareas
    📈 Tasa de completitud: 73%
    🔥 Racha actual: 4 días consecutivos"
```

## 🚧 Próximas Mejoras

- [ ] Sistema de autenticación de usuarios
- [ ] Subtareas y dependencias
- [ ] Etiquetas/Tags flexibles
- [ ] Tareas recurrentes
- [ ] Recordatorios y notificaciones
- [ ] Vista de calendario
- [ ] Vista Kanban
- [ ] Exportar/importar tareas
- [ ] Integración con Google Calendar

## 📝 Licencia

Este proyecto es parte de un ejercicio académico.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📖 Recursos

- [Vercel AI SDK Docs](https://sdk.vercel.ai/)
- [Tool Calling Guide](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)

---

Desarrollado con ❤️ usando Next.js y AI
