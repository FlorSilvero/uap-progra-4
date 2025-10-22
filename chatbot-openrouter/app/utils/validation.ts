/**
 * Utilidades para validación y sanitización de inputs
 * Siguiendo las reglas de seguridad del proyecto
 */

/**
 * Sanitiza el input del usuario removiendo caracteres peligrosos
 * y limitando la longitud
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  
  // Remover caracteres de control y espacios excesivos
  let sanitized = input
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Control characters
    .replace(/\s+/g, " ") // Múltiples espacios a uno solo
    .trim();
  
  // Remover intentos de inyección de prompts comunes
  sanitized = sanitized
    .replace(/<!--[\s\S]*?-->/g, "") // Comentarios HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""); // Scripts
  
  // Limitar longitud máxima
  const MAX_LENGTH = 4000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
}

/**
 * Valida que el input del usuario sea válido
 */
export function validateInput(input: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(input);
  
  // Validar que no esté vacío
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: "El mensaje no puede estar vacío" };
  }
  
  // Validar longitud mínima
  if (sanitized.length < 1) {
    return { valid: false, error: "El mensaje es demasiado corto" };
  }
  
  // Validar longitud máxima
  if (sanitized.length > 4000) {
    return { valid: false, error: "El mensaje es demasiado largo (máximo 4000 caracteres)" };
  }
  
  // Detectar posibles intentos de prompt injection
  const suspiciousPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    /you\s+are\s+now\s+a/gi,
    /system\s*:\s*/gi,
    /\[SYSTEM\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return { 
        valid: false, 
        error: "El mensaje contiene patrones no permitidos. Por favor, reformula tu pregunta." 
      };
    }
  }
  
  // Validar que no sea solo caracteres especiales
  const alphanumericCount = (sanitized.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount < 1) {
    return { 
      valid: false, 
      error: "El mensaje debe contener al menos un carácter alfanumérico" 
    };
  }
  
  // Validar ratio de caracteres especiales vs normales (anti-spam)
  const specialCharsCount = (sanitized.match(/[^a-zA-Z0-9\s.,!?¿¡áéíóúñÁÉÍÓÚÑ]/g) || []).length;
  if (specialCharsCount > sanitized.length * 0.5) {
    return { 
      valid: false, 
      error: "El mensaje contiene demasiados caracteres especiales" 
    };
  }
  
  return { valid: true };
}

/**
 * Sanitiza el output del LLM para prevenir inyección de scripts
 */
export function sanitizeOutput(output: string): string {
  if (!output) return "";
  
  // Escape básico de HTML para prevenir XSS
  return output
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Valida que la conversación no exceda límites razonables
 */
export function validateConversation(messageCount: number): { valid: boolean; error?: string } {
  const MAX_MESSAGES = 100;
  
  if (messageCount > MAX_MESSAGES) {
    return { 
      valid: false, 
      error: "La conversación ha alcanzado el límite máximo de mensajes. Por favor, inicia una nueva conversación." 
    };
  }
  
  return { valid: true };
}

/**
 * Rate limiting simple - limita mensajes por ventana de tiempo
 * Almacena timestamps en sessionStorage
 */
export function checkRateLimit(): { allowed: boolean; remaining: number; error?: string } {
  const RATE_LIMIT_KEY = "chat-rate-limit";
  const MAX_MESSAGES_PER_MINUTE = 10;
  const TIME_WINDOW_MS = 60 * 1000; // 1 minuto
  
  try {
    // Obtener timestamps de mensajes previos
    const stored = sessionStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    
    // Remover timestamps fuera de la ventana de tiempo
    const now = Date.now();
    const recentTimestamps = timestamps.filter(ts => now - ts < TIME_WINDOW_MS);
    
    // Verificar si se excedió el límite
    if (recentTimestamps.length >= MAX_MESSAGES_PER_MINUTE) {
      return {
        allowed: false,
        remaining: 0,
        error: `Has enviado demasiados mensajes. Por favor, espera un momento antes de enviar otro.`
      };
    }
    
    // Agregar timestamp actual
    recentTimestamps.push(now);
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentTimestamps));
    
    return { 
      allowed: true,
      remaining: MAX_MESSAGES_PER_MINUTE - recentTimestamps.length
    };
  } catch (error) {
    // Si falla el storage, permitir el mensaje
    console.warn("Rate limit check failed:", error);
    return { allowed: true, remaining: MAX_MESSAGES_PER_MINUTE };
  }
}

/**
 * Obtiene el estado actual del rate limit sin incrementar el contador
 */
export function getRateLimitStatus(): { remaining: number; total: number } {
  const RATE_LIMIT_KEY = "chat-rate-limit";
  const MAX_MESSAGES_PER_MINUTE = 10;
  const TIME_WINDOW_MS = 60 * 1000;
  
  try {
    const stored = sessionStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const recentTimestamps = timestamps.filter(ts => now - ts < TIME_WINDOW_MS);
    
    return {
      remaining: Math.max(0, MAX_MESSAGES_PER_MINUTE - recentTimestamps.length),
      total: MAX_MESSAGES_PER_MINUTE
    };
  } catch (error) {
    return { remaining: MAX_MESSAGES_PER_MINUTE, total: MAX_MESSAGES_PER_MINUTE };
  }
}

/**
 * Detecta mensajes duplicados consecutivos (anti-spam)
 */
export function isDuplicateMessage(newMessage: string, previousMessage?: string): boolean {
  if (!previousMessage) return false;
  
  const normalized1 = newMessage.toLowerCase().trim();
  const normalized2 = previousMessage.toLowerCase().trim();
  
  return normalized1 === normalized2;
}
