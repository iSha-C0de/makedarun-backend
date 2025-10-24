import express from "express";
import {
  createRun,
  getUserRuns,
  getAllRuns,
  deleteRun,
  getRunsByUserId,
  getRunsByGroupId,
  deleteAllUserRuns,
} from "../controllers/runController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Create a new run
router.post("/", protect, createRun);

// Get runs for logged-in user
router.get("/myruns", protect, getUserRuns);

// Get all runs (admin/coach)
router.get("/all", protect, getAllRuns);

// Get runs by userId
router.get("/user/:userId", protect, getRunsByUserId);

// Get runs by groupId (depends on group logic in schema)
router.get("/group/:groupId", protect, getRunsByGroupId);

// Delete single run
router.delete("/:id", protect, deleteRun);

// Delete all runs for a user
router.delete("/user/:userId", protect, deleteAllUserRuns);

export default router;
