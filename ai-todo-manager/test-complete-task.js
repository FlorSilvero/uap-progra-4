const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompleteTask() {
  console.log('🧪 Probando completar tarea...\n');
  
  // Primero mostrar todas las tareas
  const tasksBefore = await prisma.task.findMany({
    where: { userId: 'demo-user', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('📋 Tareas ANTES de completar:');
  tasksBefore.forEach((task, i) => {
    console.log(`${i + 1}. ${task.completed ? '✅' : '⬜'} "${task.title}" (ID: ${task.id}, completed: ${task.completed})`);
  });
  
  // Intentar completar la tarea #2
  console.log('\n🔄 Intentando completar tarea #2...');
  const taskIndex = 2 - 1; // índice 1
  if (taskIndex >= 0 && taskIndex < tasksBefore.length) {
    const task = tasksBefore[taskIndex];
    console.log(`   Tarea seleccionada: "${task.title}" (ID: ${task.id})`);
    
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { completed: true },
    });
    
    console.log(`   ✅ Actualizada: completed = ${updated.completed}`);
  }
  
  // Mostrar todas las tareas después
  const tasksAfter = await prisma.task.findMany({
    where: { userId: 'demo-user', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('\n📋 Tareas DESPUÉS de completar:');
  tasksAfter.forEach((task, i) => {
    console.log(`${i + 1}. ${task.completed ? '✅' : '⬜'} "${task.title}" (ID: ${task.id}, completed: ${task.completed})`);
  });
  
  await prisma.$disconnect();
}

testCompleteTask().catch(console.error);
