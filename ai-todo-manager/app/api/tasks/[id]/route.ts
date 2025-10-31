// @ts-nocheck
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Priority, Category } from '@prisma/client';

interface UpdateTaskBody {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  category?: Category;
  dueDate?: string | null;
}

// GET /api/tasks/[id] - Obtener tarea específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Actualizar tarea
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateTaskBody = await request.json();

    // Verificar que la tarea existe
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Validar que al menos un campo se está actualizando
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    // Construir datos de actualización
    const updateData: any = {};

    if (body.title !== undefined) {
      if (body.title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = body.title.trim();
    }

    if (body.completed !== undefined) {
      updateData.completed = body.completed;
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    if (body.category !== undefined) {
      updateData.category = body.category;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Eliminar tarea (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que la tarea existe
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Soft delete: marcar como eliminada
    const task = await prisma.task.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      task: {
        id: task.id,
        title: task.title,
      },
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
