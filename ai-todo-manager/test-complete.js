// Script para probar completar tarea manualmente
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Probando completar tarea #1...\n');
  
  // 1. Obtener todas las tareas
  const tasks = await prisma.task.findMany({
    where: { userId: 'demo-user', deletedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Tareas encontradas: ${tasks.length}\n`);
  
  if (tasks.length === 0) {
    console.log('❌ No hay tareas para probar.');
    return;
  }
  
  // Mostrar tareas antes
  console.log('📋 ANTES DE COMPLETAR:\n');
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.completed ? '✅' : '⬜'} ${task.title}`);
  });
  
  // 2. Completar la primera tarea
  const firstTask = tasks[0];
  console.log(`\n🎯 Completando tarea: "${firstTask.title}"\n`);
  
  const updated = await prisma.task.update({
    where: { id: firstTask.id },
    data: { completed: true }
  });
  
  console.log(`✅ Tarea actualizada: ${updated.completed ? 'COMPLETADA' : 'PENDIENTE'}\n`);
  
  // 3. Verificar actualización
  const tasksAfter = await prisma.task.findMany({
    where: { userId: 'demo-user', deletedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('📋 DESPUÉS DE COMPLETAR:\n');
  tasksAfter.forEach((task, index) => {
    console.log(`${index + 1}. ${task.completed ? '✅' : '⬜'} ${task.title}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
