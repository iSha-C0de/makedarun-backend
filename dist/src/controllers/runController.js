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
const Run_1 = __importDefault(require("../models/Run"));
const User_1 = __importDefault(require("../models/User"));
// @desc Create a new run
// @route POST /api/runs
// @access Private
const createRun = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { distance, duration, date, pace, location } = req.body;
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const run = new Run_1.default({
            user: req.user._id,
            distance,
            duration,
            date,
            pace,
            location,
        });
        const createdRun = yield run.save();
        // update user progress
        yield User_1.default.findByIdAndUpdate(req.user._id, {
            $inc: { progress: distance },
        });
        res.status(201).json(createdRun);
    }
    catch (error) {
        res.status(500).json({ message: "Error creating run", error });
    }
});
exports.createRun = createRun;
// @desc Get current user's runs
// @route GET /api/runs/myruns
// @access Private
const getUserRuns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const runs = yield Run_1.default.find({ user: req.user._id }).sort({ date: -1 });
        res.json(runs);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user runs", error });
    }
});
exports.getUserRuns = getUserRuns;
// @desc Get all runs (admin use)
// @route GET /api/runs/all
// @access Private
const getAllRuns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const runs = yield Run_1.default.find().populate("user", "userName email");
        res.json(runs);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching runs", error });
    }
});
exports.getAllRuns = getAllRuns;
// @desc Delete a run by ID
// @route DELETE /api/runs/:id
// @access Private
const deleteRun = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const run = yield Run_1.default.findById(req.params.id);
        if (!run) {
            return res.status(404).json({ message: "Run not found" });
        }
        yield run.deleteOne();
        res.json({ message: "Run removed" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting run", error });
    }
});
exports.deleteRun = deleteRun;
// @desc Get runs by user ID
// @route GET /api/runs/user/:userId
// @access Private
const getRunsByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const runs = yield Run_1.default.find({ user: req.params.userId }).sort({ date: -1 });
        res.json(runs);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user runs", error });
    }
});
exports.getRunsByUserId = getRunsByUserId;
// @desc Get runs by group ID
// @route GET /api/runs/group/:groupId
// @access Private
const getRunsByGroupId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // TODO: implement group-based fetching logic
        res.json({ message: "Group runs feature not implemented yet" });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching group runs", error });
    }
});
exports.getRunsByGroupId = getRunsByGroupId;
// @desc Delete all runs for a user
// @route DELETE /api/runs/user/:userId
// @access Private
const deleteAllUserRuns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Run_1.default.deleteMany({ user: req.params.userId });
        res.json({ message: "All runs deleted for this user" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting user runs", error });
    }
});
exports.deleteAllUserRuns = deleteAllUserRuns;
// @desc Reset runs and goal for logged-in user
// @route POST /api/users/reset
// @access Private
const resetRunsAndGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized" });
        }
        // delete all runs
        yield Run_1.default.deleteMany({ user: req.user._id });
        // reset user goal and progress
        yield User_1.default.findByIdAndUpdate(req.user._id, { progress: 0, goal: 0 });
        res.json({ message: "Runs and goal reset successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to reset runs and goal", error });
    }
});
exports.resetRunsAndGoal = resetRunsAndGoal;
