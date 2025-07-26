"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const runController_1 = require("../controllers/runController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, runController_1.createRun);
router.get('/myruns', authMiddleware_1.protect, runController_1.getUserRuns);
router.get('/all', authMiddleware_1.protect, runController_1.getAllRuns);
router.get('/user/:userId', authMiddleware_1.protect, runController_1.getRunsByUserId);
router.get('/group/:groupId', authMiddleware_1.protect, runController_1.getRunsByGroupId);
router.delete('/:id', authMiddleware_1.protect, runController_1.deleteRun);
router.delete('/user/:userId', authMiddleware_1.protect, runController_1.deleteAllUserRuns);
exports.default = router; // Make sure this is a default export
