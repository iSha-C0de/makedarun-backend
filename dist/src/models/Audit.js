"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const auditSchema = new mongoose_1.default.Schema({
    action: { type: String, required: true }, // create, update, delete
    performedBy: { type: String, required: true }, // userName or userId
    role: { type: String, required: true }, // admin/coach/etc
    targetUserId: { type: String, required: false },
    details: { type: Object, required: false },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
const Audit = mongoose_1.default.model('Audit', auditSchema);
exports.default = Audit;
