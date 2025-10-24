"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const runController_1 = require("../controllers/runController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Create a new run
router.post("/", authMiddleware_1.protect, runController_1.createRun);
// Get runs for logged-in user
router.get("/myruns", authMiddleware_1.protect, runController_1.getUserRuns);
// Get all runs (admin/coach)
router.get("/all", authMiddleware_1.protect, runController_1.getAllRuns);
// Get runs by userId
router.get("/user/:userId", authMiddleware_1.protect, runController_1.getRunsByUserId);
// Get runs by groupId (depends on group logic in schema)
router.get("/group/:groupId", authMiddleware_1.protect, runController_1.getRunsByGroupId);
// Delete single run
router.delete("/:id", authMiddleware_1.protect, runController_1.deleteRun);
// Delete all runs for a user
router.delete("/user/:userId", authMiddleware_1.protect, runController_1.deleteAllUserRuns);
exports.default = router;
