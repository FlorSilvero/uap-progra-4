// Script para verificar las tareas en la base de datos
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando tareas en la base de datos...\n');
  
  const tasks = await prisma.task.findMany({
    where: { 
      userId: 'demo-user',
      deletedAt: null 
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Total de tareas encontradas: ${tasks.length}\n`);
  
  if (tasks.length === 0) {
    console.log('❌ No hay tareas en la base de datos.');
    console.log('Prueba creando una nueva tarea desde el chat.\n');
  } else {
    console.log('📋 Lista de tareas:\n');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.completed ? '✅' : '⬜'} ${task.title}`);
      console.log(`   - ID: ${task.id}`);
      console.log(`   - Prioridad: ${task.priority}`);
      console.log(`   - Categoría: ${task.category}`);
      console.log(`   - Completada: ${task.completed ? 'Sí' : 'No'}`);
      console.log(`   - Creada: ${task.createdAt}`);
      console.log('');
    });
  }
  
  // Mostrar también tareas eliminadas
  const deletedTasks = await prisma.task.findMany({
    where: { 
      userId: 'demo-user',
      deletedAt: { not: null }
    },
    orderBy: { deletedAt: 'desc' }
  });
  
  if (deletedTasks.length > 0) {
    console.log(`\n🗑️ Tareas eliminadas: ${deletedTasks.length}\n`);
    deletedTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (eliminada: ${task.deletedAt})`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
