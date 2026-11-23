import { randomUUID } from 'node:crypto';

const tasks = [];

export function clearTasks() {
  tasks.length = 0;
}

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export function getAllTasks() {
  return tasks;
}

export function getTaskById(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new AppError('Tarea no encontrada.', 404);
  return task;
}

export function createTask({ title, description, completed }) {
  const task = {
    id: randomUUID(),
    title,
    ...(description !== undefined && { description }),
    completed: completed ?? false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

export function updateTask(id, changes) {
  const task = getTaskById(id);
  Object.assign(task, changes);
  return task;
}

export function deleteTask(id) {
  const task = getTaskById(id);
  tasks.splice(tasks.indexOf(task), 1);
  return task;
}
