import { Router } from 'express';
import { getTask, listTasks, postTask, putTask, removeTask } from '../controllers/tasks.controller.js';

const router = Router();
router.route('/').get(listTasks).post(postTask);
router.route('/:id').get(getTask).put(putTask).delete(removeTask);
export default router;
