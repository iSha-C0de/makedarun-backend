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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateUserProgress = exports.updateUserProgress = exports.getUsers = exports.createUser = void 0;
const User_1 = __importDefault(require("../models/User"));
const Run_1 = __importDefault(require("../models/Run"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// Utility to calculate total progress
const calculateUserProgress = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Run_1.default.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, totalDistance: { $sum: '$distance' } } }
    ]);
    return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.totalDistance) || 0;
});
// Create user (optional progress update if runs are already created somehow)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newUser = new User_1.default(req.body);
        const saved = yield newUser.save();
        // Optional: pre-calculate progress if needed
        const progress = yield calculateUserProgress(saved._id);
        saved.progress = progress;
        yield saved.save();
        res.status(201).json(saved);
    }
    catch (err) {
        res.status(400).json({ error: err });
    }
});
exports.createUser = createUser;
// Get all users (optionally with progress recalculated)
const getUsers = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find();
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: err });
    }
});
exports.getUsers = getUsers;
const updateUserProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, progress } = req.body;
        if (!userId || typeof progress !== 'number') {
            return res.status(400).json({ error: 'Missing or invalid userId/progress' });
        }
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { progress }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updatedUser);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update progress' });
    }
});
exports.updateUserProgress = updateUserProgress;
// @desc    Recalculate and update the logged-in user's progress
// @route   PUT /api/users/progress
// @access  Private
exports.recalculateUserProgress = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('Not authorized');
    }
    const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
    const totalDistance = yield Run_1.default.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$distance' } } }
    ]);
    const progress = ((_a = totalDistance[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { progress }, { new: true }).select('-password');
    res.json({
        message: 'Progress recalculated successfully',
        progress: updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.progress,
        goal: updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.goal,
        user: updatedUser,
    });
}));
