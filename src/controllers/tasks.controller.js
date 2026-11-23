import { AppError, createTask, deleteTask, getAllTasks, getTaskById, updateTask } from '../services/tasks.service.js';

const allowedFields = ['title', 'description', 'completed'];

function validateTaskInput(body, { isUpdate = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('El cuerpo de la solicitud debe ser un objeto JSON.', 400);
  const fields = Object.keys(body);
  const unknownFields = fields.filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new AppError(`Campos no permitidos: ${unknownFields.join(', ')}.`, 400);
  if (isUpdate && !fields.length) throw new AppError('Proporciona al menos un campo para actualizar.', 400);
  if (!isUpdate && !Object.hasOwn(body, 'title')) throw new AppError('El campo title es obligatorio.', 400);

  const changes = {};
  if (Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) throw new AppError('El campo title debe ser una cadena no vacía.', 400);
    changes.title = body.title.trim();
  }
  if (Object.hasOwn(body, 'description')) {
    if (typeof body.description !== 'string') throw new AppError('El campo description debe ser una cadena.', 400);
    changes.description = body.description.trim();
  }
  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') throw new AppError('El campo completed debe ser booleano.', 400);
    changes.completed = body.completed;
  }
  return changes;
}

export function listTasks(_request, response) { response.status(200).json({ success: true, data: getAllTasks() }); }
export function getTask(request, response) { response.status(200).json({ success: true, data: getTaskById(request.params.id) }); }
export function postTask(request, response) { response.status(201).json({ success: true, data: createTask(validateTaskInput(request.body)) }); }
export function putTask(request, response) { response.status(200).json({ success: true, data: updateTask(request.params.id, validateTaskInput(request.body, { isUpdate: true })) }); }
export function removeTask(request, response) { deleteTask(request.params.id); response.status(204).send(); }
