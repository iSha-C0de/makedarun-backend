import express from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User';
import { protect } from '../middleware/authMiddleware';
import { recalculateUserProgress} from '../controllers/userController';
import bcrypt from 'bcryptjs';
import { resetRunsAndGoal } from '../controllers/runController';
const router = express.Router();

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
router.get('/', protect, asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied. Admin only.');
  }

  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json(users);
}));

/**
 * @desc    Get pending users for admin approval
 * @route   GET /api/users/pending
 * @access  Admin only
 */
router.get(
  '/pending',
  protect,
  asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Access denied');
    }

    const users = await User.find({ isApproved: false }).select('-password');
    res.json(users);
  })
);

/**
 * @desc    Approve a user by ID
 * @route   PUT /api/users/:id/approve
 * @access  Admin only
 */
router.put(
  '/:id/approve',
  protect,
  asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
      return;
    }

    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user.isApproved) {
      res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
      return;
    }

    user.isApproved = true;
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        _id: updatedUser._id,
        userName: updatedUser.userName,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
        emailAdd: updatedUser.emailAdd,
        contactNum: updatedUser.contactNum,
        address: updatedUser.address,
        group: updatedUser.group
      }
    });
  })
);

/**
 * @desc    Get logged-in user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
router.get('/profile', protect, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    _id: user._id,
    userName: user.userName,
    role: user.role,
    emailAdd: user.emailAdd,
    contactNum: user.contactNum,
    address: user.address,
    group: user.group,
    goal: user.goal,
    progress: user.progress,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}));

/**
 * @desc    Update logged-in user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
router.put('/profile', protect, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.userName = req.body.userName || user.userName;
  user.emailAdd = req.body.emailAdd || user.emailAdd;
  user.contactNum = req.body.contactNum || user.contactNum;
  user.address = req.body.address || user.address;
  user.goal = req.body.goal || user.goal;

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedUser = await user.save();

  const { password, ...safeUser } = updatedUser.toObject();

  res.json(safeUser);
}));

/**
 * @desc    Update user by ID (Admin only)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
router.put('/:id', protect, asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied. Admin only.');
  }

  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = req.body.role || user.role;
  user.emailAdd = req.body.emailAdd || user.emailAdd;
  user.contactNum = req.body.contactNum || user.contactNum;
  user.address = req.body.address || user.address;
  user.group = req.body.group || user.group;
  
  if (req.body.isApproved !== undefined) {
    user.isApproved = req.body.isApproved;
  }

  const updatedUser = await user.save();

  const { password, ...safeUser } = updatedUser.toObject();
  res.json(safeUser);
}));

/**
 * @desc    Delete user by ID (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied. Admin only.');
  }

  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot delete your own account');
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ 
    success: true,
    message: 'User deleted successfully' 
  });
}));

/**
 * @desc    Reset user runs and goal
 * @route   DELETE /api/users/:userId/reset
 * @access  Private (Admin or self)
 */
router.delete('/:userId/reset', protect, resetRunsAndGoal);

/**
 * @desc    Recalculate user progress
 * @route   PUT /api/users/progress
 * @access  Private
 */
router.put('/progress', recalculateUserProgress);

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
router.get('/:id', protect, asyncHandler(async (req, res) => {
  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    _id: user._id,
    userName: user.userName,
    role: user.role,
    emailAdd: user.emailAdd,
    contactNum: user.contactNum,
    address: user.address,
    group: user.group,
    goal: user.goal,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    progress: user.progress,
  });
}));

/**
 * @desc    Get all approved users in the same group as the logged-in user
 * @route   GET /api/users/group-members
 * @access  Private (Coach or Admin)
 */
router.get('/group-members', protect, asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const group = req.user.group;

  if (!group) {
    res.status(400);
    throw new Error('You are not assigned to any group');
  }

  const groupUsers = await User.find({
    group,
    isApproved: true,
    _id: { $ne: req.user._id },
  }).select('-password');

  res.json(groupUsers);
}));

export default router;