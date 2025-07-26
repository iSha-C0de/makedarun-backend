"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const runSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    distance: {
        type: Number,
        required: true,
        min: [10, 'Distance must be at least 10 meters'], // Updated minimum to 10 meters
        validate: {
            validator: function (v) {
                return v >= 10;
            },
            message: 'Distance must be at least 10 meters'
        }
    }, // Distance in meters
    duration: {
        type: Number,
        required: true,
        min: [0.01, 'Duration must be greater than 0'],
        validate: {
            validator: function (v) {
                return v > 0;
            },
            message: 'Duration must be greater than 0'
        }
    }, // Duration in minutes
    date: { type: Date, default: Date.now },
    pace: {
        type: Number,
        validate: {
            validator: function (v) {
                return !v || (v >= 0.5 && v <= 15); // Realistic running pace range
            },
            message: 'Pace must be between 0.5 and 15 km/h for realistic running'
        }
    }, // Pace in km/h
    location: {
        type: String,
        maxlength: [500, 'Location string cannot exceed 500 characters']
    }, // Location name in format "Start → End"
}, {
    timestamps: true,
});
// Add index for better query performance
runSchema.index({ user: 1, date: -1 });
const Run = mongoose_1.default.model('Run', runSchema);
exports.default = Run;
