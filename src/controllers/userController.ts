import { Request, Response } from 'express';
import User from '../models/User';
import Run from '../models/Run';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types/express';
import asyncHandler from 'express-async-handler';

// Utility to calculate total progress
const calculateUserProgress = async (userId: mongoose.Types.ObjectId) => {
  const result = await Run.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, totalDistance: { $sum: '$distance' } } }
  ]);

  return result[0]?.totalDistance || 0;
};

// Create user (optional progress update if runs are already created somehow)
export const createUser = async (req: Request, res: Response) => {
  try {
    const newUser = new User(req.body);
    const saved = await newUser.save();

    // Optional: pre-calculate progress if needed
    const progress = await calculateUserProgress(saved._id);
    saved.progress = progress;
    await saved.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

// Get all users (optionally with progress recalculated)
export const getUsers = async (_: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

export const updateUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId, progress } = req.body;

    if (!userId || typeof progress !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid userId/progress' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { progress },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

// @desc    Recalculate and update the logged-in user's progress
// @route   PUT /api/users/progress
// @access  Private
export const recalculateUserProgress = asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);

  const totalDistance = await Run.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, total: { $sum: '$distance' } } }
  ]);

  const progress = totalDistance[0]?.total || 0;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { progress },
    { new: true }
  ).select('-password');

  res.json({
    message: 'Progress recalculated successfully',
    progress: updatedUser?.progress,
    goal: updatedUser?.goal,
    user: updatedUser,
  });
});

