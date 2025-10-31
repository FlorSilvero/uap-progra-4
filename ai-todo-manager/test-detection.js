// Script para probar detección de comandos
const testCases = [
  "mostrame mis recordatorios",
  "dame todas las tareas",
  "tengo tareas?",
  "cuales son mis tareas",
  "lista de tareas",
  "ver recordatorios",
  "mis tareas",
  "hay tareas?",
  "tareas pendientes",
  "completar 1",
  "eliminar 2",
];

console.log('🧪 Probando detección de comandos:\n');

testCases.forEach((msg, index) => {
  const lowerMessage = msg.toLowerCase();
  
  console.log(`${index + 1}. "${msg}"`);
  
  // Detectar listado
  if ((lowerMessage.includes('tareas') || lowerMessage.includes('recordatorios') || lowerMessage.includes('recordatorio')) && 
      (lowerMessage.includes('mostrar') || lowerMessage.includes('ver') || lowerMessage.includes('listar') || 
       lowerMessage.includes('cuál') || lowerMessage.includes('cuáles') || lowerMessage.includes('qué') || 
       lowerMessage.includes('tengo') || lowerMessage.includes('hay') ||
       lowerMessage.includes('todos') || lowerMessage.includes('todas') || lowerMessage.includes('dame') ||
       lowerMessage.includes('mis') || lowerMessage.includes('lista'))) {
    console.log('   ✅ DETECTADO: Listar tareas\n');
  }
  // Catch-all
  else if ((lowerMessage.includes('tarea') || lowerMessage.includes('recordatorio')) && 
           !lowerMessage.includes('crear') && !lowerMessage.includes('agregar')) {
    console.log('   ✅ DETECTADO: Catch-all - Listar tareas\n');
  }
  // Completar
  else if (lowerMessage.includes('completar')) {
    console.log('   ✅ DETECTADO: Completar tarea\n');
  }
  // Eliminar
  else if (lowerMessage.includes('eliminar')) {
    console.log('   ✅ DETECTADO: Eliminar tarea\n');
  }
  else {
    console.log('   ❌ NO DETECTADO - Iría a IA\n');
  }
});
