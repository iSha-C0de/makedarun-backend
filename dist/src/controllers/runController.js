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
exports.resetRunsAndGoal = exports.deleteAllUserRuns = exports.getRunsByGroupId = exports.getRunsByUserId = exports.deleteRun = exports.getAllRuns = exports.getUserRuns = exports.createRun = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Run_1 = __importDefault(require("../models/Run"));
const User_1 = __importDefault(require("../models/User"));
const assertUser_1 = require("../utils/assertUser");
const mongoose_1 = __importDefault(require("mongoose"));
const updateUserProgress = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const totalDistance = yield Run_1.default.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$distance' } } },
    ]);
    const progress = ((_a = totalDistance[0]) === null || _a === void 0 ? void 0 : _a.total) ? totalDistance[0].total / 1000 : 0;
    yield User_1.default.findByIdAndUpdate(userId, { progress });
});
// @desc Create a new run
// @route POST /api/runs
// @access Private
exports.createRun = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { distance, duration, pace, location, date, path } = req.body;
    // Updated minimum distance to 10 meters
    if (distance === undefined || distance === null || distance < 10) {
        res.status(400);
        throw new Error('Distance must be at least 10 meters');
    }
    if (duration === undefined || duration === null || duration <= 0) {
        res.status(400);
        throw new Error('Duration (in minutes) is required and must be greater than 0');
    }
    const numDistance = Number(distance);
    const numDuration = Number(duration);
    const numPace = pace ? Number(pace) : undefined;
    if (isNaN(numDistance) || isNaN(numDuration)) {
        res.status(400);
        throw new Error('Distance and duration must be valid numbers');
    }
    // More restrictive pace validation for better accuracy
    if (numPace && (numPace <= 0 || numPace > 15)) {
        res.status(400);
        throw new Error('Pace must be between 0.1 and 15 km/h for realistic running');
    }
    // Validate minimum duration based on distance (prevent unrealistic fast runs)
    const maxSpeedKmH = 15; // Maximum realistic running speed
    const minimumDurationMinutes = (numDistance / 1000) / maxSpeedKmH * 60;
    if (numDuration < minimumDurationMinutes) {
        res.status(400);
        throw new Error(`Duration too short for distance. Minimum: ${minimumDurationMinutes.toFixed(2)} minutes for ${numDistance}m at max speed of ${maxSpeedKmH} km/h`);
    }
    // Validate maximum duration (prevent unrealistic slow runs)
    const minSpeedKmH = 0.5; // Minimum realistic running speed (very slow walk)
    const maximumDurationMinutes = (numDistance / 1000) / minSpeedKmH * 60;
    if (numDuration > maximumDurationMinutes) {
        res.status(400);
        throw new Error(`Duration too long for distance. Maximum: ${maximumDurationMinutes.toFixed(2)} minutes for ${numDistance}m at min speed of ${minSpeedKmH} km/h`);
    }
    // Enhanced path validation with stricter tolerance
    if (path && Array.isArray(path) && path.length > 1) {
        const calculatedDistance = calculatePathDistance(path);
        const discrepancy = Math.abs(calculatedDistance - numDistance) / numDistance;
        // Stricter validation - 15% tolerance instead of 20%
        if (discrepancy > 0.15) {
            console.log(`Distance discrepancy warning: reported=${numDistance}m, calculated=${calculatedDistance.toFixed(2)}m, discrepancy=${(discrepancy * 100).toFixed(1)}%`);
            // Log but don't reject - GPS can have some inaccuracies
        }
    }
    // Validate location format if provided (should be "Start → End" format)
    if (location && typeof location === 'string') {
        if (location.length > 500) {
            res.status(400);
            throw new Error('Location string too long (max 500 characters)');
        }
    }
    const user = (0, assertUser_1.assertUser)(req);
    const runData = {
        user: user._id,
        distance: numDistance,
        duration: numDuration,
        pace: numPace,
        location, // Now stores "Start Location → End Location" format
        date: date ? new Date(date) : new Date(),
    };
    const run = yield Run_1.default.create(runData);
    yield updateUserProgress(user._id);
    res.status(201).json(run);
}));
function calculatePathDistance(path) {
    const R = 6371000; // Earth's radius in meters
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
        const lat1 = path[i - 1].latitude;
        const lon1 = path[i - 1].longitude;
        const lat2 = path[i].latitude;
        const lon2 = path[i].longitude;
        // Validate coordinates
        if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
            continue; // Skip invalid coordinates
        }
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) *
                Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance += R * c;
    }
    return distance;
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
// @desc Get logged-in user's runs
// @route GET /api/runs/myruns
// @access Private
exports.getUserRuns = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = (0, assertUser_1.assertUser)(req);
    const runs = yield Run_1.default.find({ user: user._id }).sort({ date: -1 });
    res.json(runs);
}));
// @desc Get all runs (admin or group view)
// @route GET /api/runs/all
// @access Private
exports.getAllRuns = (0, express_async_handler_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const runs = yield Run_1.default.find({}).populate('user', 'userName group');
    res.json(runs);
}));
// @desc Delete a run
// @route DELETE /api/runs/:id
// @access Private
exports.deleteRun = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = (0, assertUser_1.assertUser)(req);
    const run = yield Run_1.default.findById(req.params.id);
    if (!run) {
        res.status(404);
        throw new Error('Run not found');
    }
    if (run.user.toString() !== user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to delete this run');
    }
    yield run.deleteOne();
    yield updateUserProgress(user._id);
    res.json({ message: 'Run deleted' });
}));
// @desc Get runs for a specific user by ID
// @route GET /api/runs/user/:userId
// @access Private
exports.getRunsByUserId = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        res.status(400);
        throw new Error('Invalid user ID');
    }
    const runs = yield Run_1.default.find({ user: userId }).sort({ date: -1 });
    res.json(runs);
}));
// @desc Get runs for all members in a group
// @route GET /api/runs/group/:groupId
// @access Private
exports.getRunsByGroupId = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(groupId)) {
        res.status(400);
        throw new Error('Invalid group ID');
    }
    // Find all users in the group
    const users = yield User_1.default.find({ group: groupId }).select('_id userName');
    if (!users || users.length === 0) {
        res.status(404);
        throw new Error('No users found in this group');
    }
    // Fetch runs for all users in the group
    const runs = yield Run_1.default.find({ user: { $in: users.map(user => user._id) } })
        .populate('user', 'userName')
        .sort({ date: -1 });
    // Group runs by user
    const groupedRuns = users.map(user => ({
        userId: user._id,
        userName: user.userName,
        runs: runs.filter(run => run.user._id.toString() === user._id.toString()),
    }));
    res.json(groupedRuns);
}));
exports.deleteAllUserRuns = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = (0, assertUser_1.assertUser)(req);
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        res.status(400);
        throw new Error('Invalid user ID');
    }
    // Check if the requesting user is a coach
    if (user.role !== 'coach') {
        res.status(401);
        throw new Error('Only coaches can delete all runs for a user');
    }
    // Delete all runs for the user
    yield Run_1.default.deleteMany({ user: userId });
    // Update user progress
    yield updateUserProgress(new mongoose_1.default.Types.ObjectId(userId));
    res.json({ message: `All runs for user ${userId} deleted` });
}));
exports.resetRunsAndGoal = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    if (!req.user) {
        res.status(401);
        throw new Error('Not authorized');
    }
    // Validate userId
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400);
        throw new Error('Invalid user ID format');
    }
    // Check if the requesting user is authorized (admin or the user themselves)
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        res.status(403);
        throw new Error('Not authorized to reset this user\'s data');
    }
    // Delete all runs for the user
    yield Run_1.default.deleteMany({ user: userId });
    // Reset user goal to 1km and progress to 0
    const updatedUser = yield User_1.default.findByIdAndUpdate(userId, { goal: 1, progress: 0 }, { new: true }).select('-password');
    if (!updatedUser) {
        res.status(404);
        throw new Error('User not found');
    }
    res.json({
        message: 'Runs and goal reset successfully',
        user: {
            _id: updatedUser._id,
            userName: updatedUser.userName,
            goal: updatedUser.goal,
            progress: updatedUser.progress
        }
    });
}));
