# 🔑 CONFIGURACIÓN RÁPIDA - API KEY

## ⚠️ ACCIÓN REQUERIDA ANTES DE EJECUTAR

Para que el proyecto funcione, **DEBES** configurar tu API key de OpenRouter.

---

## 📝 PASO A PASO (5 minutos)

### 1. Obtener API Key GRATIS de OpenRouter

1. Abre https://openrouter.ai/
2. Haz clic en "Sign Up" (arriba derecha)
3. Regístrate con:
   - Email
   - O Google
   - O GitHub
4. Una vez dentro, ve a "API Keys" en el menú lateral
5. Haz clic en "Create Key"
6. Dale un nombre (ej: "Todo Manager")
7. **COPIA LA KEY** (empieza con `sk-or-v1-...`)

**⚠️ IMPORTANTE**: La key solo se muestra una vez. Cópiala ahora.

### 2. Configurar el Archivo `.env.local`

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Busca esta línea:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-tu-api-key-aqui
   ```
3. **REEMPLAZA** `sk-or-v1-tu-api-key-aqui` con tu key real
4. Debe quedar así:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-abc123def456ghi789...
   ```
5. **GUARDA** el archivo (Ctrl+S)

### 3. Ejecutar el Proyecto

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
npm run dev
```

Verás algo como:
```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### 4. Probar en el Navegador

1. Abre http://localhost:3000
2. Escribe en el chat: `"Hola, muéstrame mis tareas"`
3. El AI debería responder y mostrar que no tienes tareas
4. Prueba crear una: `"Agregar tarea: comprar leche"`
5. ¡Funciona! ✅

---

## 🎯 MODELOS LLM DISPONIBLES (GRATIS)

El proyecto usa por defecto `meta-llama/llama-3.1-8b-instruct:free` (gratis).

Otros modelos gratuitos que puedes usar:

```env
# Llama 3.1 8B (rápido, gratis)
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Llama 3.1 70B (mejor calidad, gratis)
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct:free

# Mistral 7B (alternativa, gratis)
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free

# Gemma 2 9B (Google, gratis)
OPENROUTER_MODEL=google/gemma-2-9b-it:free
```

Para cambiar el modelo, edita `.env.local` y reinicia el servidor.

---

## ❌ PROBLEMAS COMUNES

### "Missing API Key"
**Causa**: No configuraste la key en `.env.local`
**Solución**: Sigue los pasos arriba y reinicia el servidor

### "Invalid API Key"
**Causa**: La key es incorrecta o expiró
**Solución**: Genera una nueva key en OpenRouter

### "Rate limit exceeded"
**Causa**: Demasiadas requests (raro con cuenta gratuita)
**Solución**: Espera unos minutos o actualiza a plan de pago

### El chat no responde
**Causa**: Servidor no está corriendo o error de conexión
**Solución**: 
1. Verifica que `npm run dev` esté corriendo
2. Abre la consola del navegador (F12) y busca errores
3. Revisa la terminal del servidor

---

## 📊 LÍMITES DE LA CUENTA GRATUITA

OpenRouter ofrece:
- ✅ **Modelos gratuitos** (marcados con `:free`)
- ✅ **Sin límite de requests** (con rate limiting razonable)
- ✅ **Sin tarjeta de crédito requerida**
- ✅ **Ideal para desarrollo y pruebas**

Para producción, considera:
- Modelos de pago (mejor calidad)
- Créditos prepagados
- Más requests por segundo

---

## ✅ CHECKLIST FINAL

Antes de decir "funciona":

- [ ] Tengo una cuenta en OpenRouter
- [ ] Generé mi API key
- [ ] Copié la key en `.env.local`
- [ ] Guardé el archivo `.env.local`
- [ ] PostgreSQL está corriendo
- [ ] Ejecuté `npm run dev`
- [ ] Abrí http://localhost:3000
- [ ] El chat responde correctamente
- [ ] Puedo crear, listar, y actualizar tareas

---

## 🎉 ¡LISTO PARA USAR!

Si todos los checkboxes están marcados, **¡tu AI Todo Manager está funcionando!**

Prueba estos comandos:

```
"Hola, ayúdame a organizar mis tareas"
"Agregar tarea: estudiar para el examen de programación"
"Crea una tarea de alta prioridad para terminar el proyecto"
"Muéstrame todas mis tareas"
"¿Cuántas tareas he completado?"
"Marca la primera tarea como completada"
```

---

**¿Problemas?** Revisa `GUIA.md` o `RESUMEN.md` para más detalles.

**¡Disfruta tu gestor de tareas con IA!** 🤖✅
