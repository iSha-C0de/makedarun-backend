"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const userController_1 = require("../controllers/userController");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const runController_1 = require("../controllers/runController");
const router = express_1.default.Router();
/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
router.get('/', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Access denied. Admin only.');
    }
    const users = yield User_1.default.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
})));
/**
 * @desc    Get pending users for admin approval
 * @route   GET /api/users/pending
 * @access  Admin only
 */
router.get('/pending', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Access denied');
    }
    const users = yield User_1.default.find({ isApproved: false }).select('-password');
    res.json(users);
})));
/**
 * @desc    Approve a user by ID
 * @route   PUT /api/users/:id/approve
 * @access  Admin only
 */
router.put('/:id/approve', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const user = yield User_1.default.findById(req.params.id);
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
    const updatedUser = yield user.save();
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
})));
/**
 * @desc    Get logged-in user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
router.get('/profile', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401);
        throw new Error('Not authorized');
    }
    const user = yield User_1.default.findById(req.user._id);
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
})));
/**
 * @desc    Update logged-in user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
router.put('/profile', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401);
        throw new Error('Not authorized');
    }
    const user = yield User_1.default.findById(req.user._id);
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
        const salt = yield bcryptjs_1.default.genSalt(10);
        user.password = yield bcryptjs_1.default.hash(req.body.password, salt);
    }
    const updatedUser = yield user.save();
    const _a = updatedUser.toObject(), { password } = _a, safeUser = __rest(_a, ["password"]);
    res.json(safeUser);
})));
/**
 * @desc    Update user by ID (Admin only)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
router.put('/:id', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Access denied. Admin only.');
    }
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400);
        throw new Error('Invalid user ID format');
    }
    const user = yield User_1.default.findById(req.params.id);
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
    const updatedUser = yield user.save();
    const _a = updatedUser.toObject(), { password } = _a, safeUser = __rest(_a, ["password"]);
    res.json(safeUser);
})));
/**
 * @desc    Delete user by ID (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
router.delete('/:id', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Access denied. Admin only.');
    }
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400);
        throw new Error('Invalid user ID format');
    }
    const user = yield User_1.default.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    if (user._id.toString() === req.user._id.toString()) {
        res.status(400);
        throw new Error('Cannot delete your own account');
    }
    yield User_1.default.findByIdAndDelete(req.params.id);
    res.json({
        success: true,
        message: 'User deleted successfully'
    });
})));
/**
 * @desc    Reset user runs and goal
 * @route   DELETE /api/users/:userId/reset
 * @access  Private (Admin or self)
 */
router.delete('/:userId/reset', authMiddleware_1.protect, runController_1.resetRunsAndGoal);
/**
 * @desc    Recalculate user progress
 * @route   PUT /api/users/progress
 * @access  Private
 */
router.put('/progress', userController_1.recalculateUserProgress);
/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
router.get('/:id', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400);
        throw new Error('Invalid user ID format');
    }
    const user = yield User_1.default.findById(req.params.id).select('-password');
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
})));
/**
 * @desc    Get all approved users in the same group as the logged-in user
 * @route   GET /api/users/group-members
 * @access  Private (Coach or Admin)
 */
router.get('/group-members', authMiddleware_1.protect, (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401);
        throw new Error('Not authorized');
    }
    const group = req.user.group;
    if (!group) {
        res.status(400);
        throw new Error('You are not assigned to any group');
    }
    const groupUsers = yield User_1.default.find({
        group,
        isApproved: true,
        _id: { $ne: req.user._id },
    }).select('-password');
    res.json(groupUsers);
})));
exports.default = router;
