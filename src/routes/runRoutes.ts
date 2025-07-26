import express from 'express';
import {
  createRun,
  getUserRuns,
  getAllRuns,
  deleteRun,
  getRunsByUserId,
  getRunsByGroupId,
  deleteAllUserRuns,
} from '../controllers/runController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createRun);
router.get('/myruns', protect, getUserRuns);
router.get('/all', protect, getAllRuns);
router.get('/user/:userId', protect, getRunsByUserId);
router.get('/group/:groupId', protect, getRunsByGroupId);
router.delete('/:id', protect, deleteRun);
router.delete('/user/:userId', protect, deleteAllUserRuns);

export default router; // Make sure this is a default export