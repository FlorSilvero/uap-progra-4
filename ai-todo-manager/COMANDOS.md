# 📋 Comandos del AI Todo Manager

## ✅ Funcionalidades Implementadas

### 1️⃣ **Crear Tareas/Recordatorios**
```
✓ "agregame una tarea de comprar leche"
✓ "crear tarea: llamar al doctor"
✓ "nuevo recordatorio de preparar el mate"
✓ "dame una tarea urgente de terminar el TP" (prioridad alta)
```

### 2️⃣ **Ver Tareas**
```
✓ "muéstrame todas mis tareas"
✓ "dame todos los recordatorios"
✓ "qué tareas tengo"
✓ "listar tareas pendientes"
✓ "mostrar tareas completadas"
```

### 3️⃣ **Completar/Marcar Tareas** 🆕
```
✓ "completar 1" (por número de la lista)
✓ "completar tarea 3"
✓ "marcar 2"
✓ "termine 1"
✓ "completé 4"
✓ "terminar tarea de comprar pan" (por texto)
```

### 4️⃣ **Eliminar Tareas** 🆕
```
✓ "eliminar 2" (por número)
✓ "eliminar tarea 1"
✓ "borrar 3"
✓ "quitar tarea 4"
✓ "borrame 1"
✓ "eliminar tarea de ir al doctor" (por texto)
```

### 5️⃣ **Editar Tareas** 🆕
```
✓ "edita la tarea 1 y pon preparar mate" (por número)
✓ "edita preparar mate en 1 hora y pon solo preparar mate" (por texto)
✓ "cambia la tarea 2 a ir al super"
✓ "modifica tarea 3 y pon llamar a mamá"
```

### 6️⃣ **Estadísticas**
```
✓ "cuántas tareas tengo completadas"
✓ "mostrar estadísticas"
```

---

## 🎯 **Cómo Funcionan las Acciones**

### **Por Número (Recomendado)**
1. Primero lista las tareas: `"dame todas las tareas"`
2. Verás algo como:
   ```
   1. ⬜ Comprar leche
   2. ⬜ Ir al doctor
   3. ✅ Hacer TP
   ```
3. Usa el número: `"completar tarea 1"` o `"eliminar tarea 2"`

### **Por Texto**
- También puedes usar parte del título: `"completar tarea de comprar"` 
- Buscará la primera tarea que contenga ese texto

---

## ⚡ **Ejemplos de Uso Real**

### Flujo completo:
```
Usuario: "agregame una tarea de comprar pan"
Bot: ✅ Tarea creada: "comprar pan"

Usuario: "dame todas mis tareas"
Bot: 📋 Tienes 3 tareas:
     1. ⬜ comprar pan
     2. ⬜ ir al doctor
     3. ⬜ hacer TP

Usuario: "completar tarea 1"
Bot: ✅ Tarea completada: "comprar pan"

Usuario: "eliminar tarea 2"
Bot: 🗑️ Tarea eliminada: "ir al doctor"

Usuario: "mostrar estadísticas"
Bot: 📊 Estadísticas:
     - Total: 2
     - Completadas: 1
     - Pendientes: 1
```

---

## 🔧 **Detalles Técnicos**

### Prioridades:
- **high**: Si incluye palabras "urgente" o "importante"
- **medium**: Por defecto

### Categorías (predefinidas):
- work
- personal
- shopping
- health
- other (por defecto)

### Soft Delete:
- Las tareas eliminadas NO se borran de la BD
- Solo se marca `deletedAt` con fecha actual
- No aparecen en las búsquedas

---

## 🚀 **Próximas Funcionalidades Posibles**

- [ ] Editar título de tarea
- [ ] Cambiar prioridad
- [ ] Agregar fechas límite
- [ ] Filtrar por categoría
- [ ] Marcar como pendiente (desmarcar completada)
- [ ] Buscar tareas específicas
