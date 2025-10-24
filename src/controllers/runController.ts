import { Request, Response } from "express";
import Run from "../models/Run";
import User from "../models/User";
import { AuthenticatedRequest } from "../types/express";

// @desc Create a new run
// @route POST /api/runs
// @access Private
export const createRun = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { distance, duration, date, pace, location } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const run = new Run({
      user: req.user._id,
      distance,
      duration,
      date,
      pace,
      location,
    });

    const createdRun = await run.save();

    // update user progress
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { progress: distance },
    });

    res.status(201).json(createdRun);
  } catch (error) {
    res.status(500).json({ message: "Error creating run", error });
  }
};

// @desc Get current user's runs
// @route GET /api/runs/myruns
// @access Private
export const getUserRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const runs = await Run.find({ user: req.user._id }).sort({ date: -1 });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user runs", error });
  }
};

// @desc Get all runs (admin use)
// @route GET /api/runs/all
// @access Private
export const getAllRuns = async (req: Request, res: Response) => {
  try {
    const runs = await Run.find().populate("user", "userName email");
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching runs", error });
  }
};

// @desc Delete a run by ID
// @route DELETE /api/runs/:id
// @access Private
export const deleteRun = async (req: Request, res: Response) => {
  try {
    const run = await Run.findById(req.params.id);

    if (!run) {
      return res.status(404).json({ message: "Run not found" });
    }

    await run.deleteOne();
    res.json({ message: "Run removed" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting run", error });
  }
};

// @desc Get runs by user ID
// @route GET /api/runs/user/:userId
// @access Private
export const getRunsByUserId = async (req: Request, res: Response) => {
  try {
    const runs = await Run.find({ user: req.params.userId }).sort({ date: -1 });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user runs", error });
  }
};

// @desc Get runs by group ID
// @route GET /api/runs/group/:groupId
// @access Private
export const getRunsByGroupId = async (req: Request, res: Response) => {
  try {
    // TODO: implement group-based fetching logic
    res.json({ message: "Group runs feature not implemented yet" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching group runs", error });
  }
};

// @desc Delete all runs for a user
// @route DELETE /api/runs/user/:userId
// @access Private
export const deleteAllUserRuns = async (req: Request, res: Response) => {
  try {
    await Run.deleteMany({ user: req.params.userId });
    res.json({ message: "All runs deleted for this user" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user runs", error });
  }
};

// @desc Reset runs and goal for logged-in user
// @route POST /api/users/reset
// @access Private
export const resetRunsAndGoal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // delete all runs
    await Run.deleteMany({ user: req.user._id });

    // reset user goal and progress
    await User.findByIdAndUpdate(req.user._id, { progress: 0, goal: 0 });

    res.json({ message: "Runs and goal reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset runs and goal", error });
  }
};
