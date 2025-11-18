import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tasks/stats - Obtener estadísticas de tareas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'all-time';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Calcular rango de fechas según el periodo
    let dateFilter: any = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { gte: startOfDay };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { gte: startOfWeek };
        break;
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { gte: startOfMonth };
        break;
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { gte: startOfYear };
        break;
      default:
        dateFilter = {};
    }

    // Estadísticas generales
    const totalTasks = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    const completedTasks = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: true,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const overdueTasks = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: false,
        dueDate: { lt: new Date() },
      },
    });

    // Estadísticas por prioridad
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: {
        userId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: true,
    });

    const byPriority: any = {
      high: { total: 0, completed: 0, pending: 0 },
      medium: { total: 0, completed: 0, pending: 0 },
      low: { total: 0, completed: 0, pending: 0 },
    };

    for (const item of tasksByPriority) {
      const completed = await prisma.task.count({
        where: {
          userId,
          deletedAt: null,
          priority: item.priority,
          completed: true,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

      byPriority[item.priority] = {
        total: item._count,
        completed,
        pending: item._count - completed,
      };
    }

    // Estadísticas por categoría
    const tasksByCategory = await prisma.task.groupBy({
      by: ['category'],
      where: {
        userId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: true,
    });

    const byCategory: any = {
      work: { total: 0, completed: 0, pending: 0 },
      personal: { total: 0, completed: 0, pending: 0 },
      shopping: { total: 0, completed: 0, pending: 0 },
      health: { total: 0, completed: 0, pending: 0 },
      other: { total: 0, completed: 0, pending: 0 },
    };

    for (const item of tasksByCategory) {
      const completed = await prisma.task.count({
        where: {
          userId,
          deletedAt: null,
          category: item.category,
          completed: true,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

      byCategory[item.category] = {
        total: item._count,
        completed,
        pending: item._count - completed,
      };
    }

    // Tareas con fecha límite próxima
    const dueTodayCount = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: false,
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    const dueThisWeekCount = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: false,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const nextDueTask = await prisma.task.findFirst({
      where: {
        userId,
        deletedAt: null,
        completed: false,
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Timeline stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksCreatedToday = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: today },
      },
    });

    const tasksCompletedToday = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: true,
        updatedAt: { gte: today },
      },
    });

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const tasksCreatedThisWeek = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startOfWeek },
      },
    });

    const tasksCompletedThisWeek = await prisma.task.count({
      where: {
        userId,
        deletedAt: null,
        completed: true,
        updatedAt: { gte: startOfWeek },
      },
    });

    // Productivity stats
    const completedTasksList = await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        completed: true,
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    // Average completion time
    let averageCompletionTime = 'N/D';
    if (completedTasksList.length > 0) {
      const totalMs = completedTasksList.reduce(
        (acc, task) => acc + (task.updatedAt.getTime() - task.createdAt.getTime()),
        0
      );
      const avgMs = totalMs / completedTasksList.length;
      const avgHours = Math.round(avgMs / 3600000);
      averageCompletionTime = `${avgHours}h`;
    }

    // Current streak and longest streak
    const last30Days = await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        completed: true,
        updatedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      select: { updatedAt: true },
    });

    const daysWithCompletions = new Set(
      last30Days.map(t => {
        const d = new Date(t.updatedAt);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
    );

    // Calculate current streak
    let currentStreak = 0;
    let cursorDate = new Date();
    cursorDate.setHours(0, 0, 0, 0);
    while (daysWithCompletions.has(cursorDate.getTime())) {
      currentStreak++;
      cursorDate = new Date(cursorDate.getTime() - 86400000);
    }

    // Calculate longest streak in last 30 days
    let longestStreak = 0;
    let tempStreak = 0;
    let iterDate = new Date();
    iterDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const dayKey = new Date(
        iterDate.getFullYear(),
        iterDate.getMonth(),
        iterDate.getDate()
      ).getTime();
      if (daysWithCompletions.has(dayKey)) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
      iterDate = new Date(iterDate.getTime() - 86400000);
    }

    // Most productive day (day with most completions)
    const dayCounts: Record<string, number> = {};
    last30Days.forEach(task => {
      const dayStr = task.updatedAt.toISOString().slice(0, 10);
      dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
    });
    const mostProductiveDay =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const stats = {
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        overdueTasks,
      },
      byPriority,
      byCategory,
      timeline: {
        tasksCreatedToday,
        tasksCompletedToday,
        tasksCreatedThisWeek,
        tasksCompletedThisWeek,
      },
      productivity: {
        averageCompletionTime,
        mostProductiveDay,
        currentStreak,
        longestStreak,
      },
      upcoming: {
        dueTodayCount,
        dueThisWeekCount,
        nextDueTask,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
