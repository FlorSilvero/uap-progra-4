// @ts-nocheck
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Priority, Category } from '@prisma/client';

// Tipos para validación
interface CreateTaskBody {
  userId: string;
  title: string;
  priority?: Priority;
  category?: Category;
  dueDate?: string;
}

interface UpdateTaskBody {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  category?: Category;
  dueDate?: string | null;
}

interface SearchTasksQuery {
  userId: string;
  query?: string;
  completed?: string;
  priority?: Priority;
  category?: Category;
  dueDateFrom?: string;
  dueDateTo?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: string;
}

// GET /api/tasks - Buscar/listar tareas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const query = searchParams.get('query') || undefined;
    const completed = searchParams.get('completed');
    const priority = searchParams.get('priority') as Priority | undefined;
    const category = searchParams.get('category') as Category | undefined;
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');
    const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construir filtros dinámicos
    const where: any = {
      userId,
      deletedAt: null, // Solo tareas no eliminadas
    };

    if (query) {
      where.title = {
        contains: query,
        mode: 'insensitive',
      };
    }

    if (completed !== null && completed !== undefined) {
      where.completed = completed === 'true';
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) {
        where.dueDate.gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        where.dueDate.lte = new Date(dueDateTo);
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
    });

    const total = await prisma.task.count({ where });

    return NextResponse.json({
      tasks,
      total,
      hasMore: total > limit,
    });
  } catch (error) {
    console.error('Error searching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to search tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskBody = await request.json();

    // Validaciones
    if (!body.userId || !body.title || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'userId and title are required' },
        { status: 400 }
      );
    }

    // Validar que dueDate sea futura (si se proporciona)
    if (body.dueDate) {
      const dueDate = new Date(body.dueDate);
      if (dueDate < new Date()) {
        return NextResponse.json(
          { error: 'dueDate must be in the future' },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: body.userId,
        title: body.title.trim(),
        priority: body.priority || 'medium',
        category: body.category || 'other',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
