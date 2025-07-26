import express from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = express.Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { userName, emailAdd, password, role } = req.body;

    // Normalize role to lowercase
    const normalizedRole = role.toLowerCase();

    // Check for duplicate username
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with isApproved true only if admin
    const user = await User.create({
      userName,
      emailAdd,
      password: hashedPassword,
      role: normalizedRole,
      isApproved: normalizedRole === 'admin',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        userName: user.userName,
        emailAdd: user.emailAdd,
        role: user.role,
        isApproved: user.isApproved,
        message: normalizedRole === 'admin'
          ? 'Admin account created successfully.'
          : 'Account created. Awaiting admin approval.',
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  })
);

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { userName, password } = req.body;

    const user = await User.findOne({ userName });

    if (!user) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    // Debug log
    console.log(
      `Login attempt for user: ${user.userName} | Role: ${user.role} | Approved: ${user.isApproved}`
    );

    if (!user.isApproved) {
      res.status(403);
      throw new Error('Your account is pending approval by an admin.');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    res.json({
      _id: user._id,
      userName: user.userName,
      emailAdd: user.emailAdd,
      role: user.role,
      isApproved: user.isApproved, 
      goal: user.goal,             
      group: user.group,           
      contactNum: user.contactNum, 
      address: user.address,       
      token,
    });
  })
);

export default router;
