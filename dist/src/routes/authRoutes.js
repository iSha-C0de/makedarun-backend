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
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post('/register', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userName, emailAdd, password, role } = req.body;
    // Normalize role to lowercase
    const normalizedRole = role.toLowerCase();
    // Check for duplicate username
    const existingUser = yield User_1.default.findOne({ userName });
    if (existingUser) {
        res.status(400);
        throw new Error('User already exists');
    }
    // Hash password
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    // Create user with isApproved true only if admin
    const user = yield User_1.default.create({
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
    }
    else {
        res.status(400);
        throw new Error('Invalid user data');
    }
})));
/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post('/login', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userName, password } = req.body;
    const user = yield User_1.default.findOne({ userName });
    if (!user) {
        res.status(401);
        throw new Error('Invalid username or password');
    }
    const isMatch = yield bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        res.status(401);
        throw new Error('Invalid username or password');
    }
    // Debug log
    console.log(`Login attempt for user: ${user.userName} | Role: ${user.role} | Approved: ${user.isApproved}`);
    if (!user.isApproved) {
        res.status(403);
        throw new Error('Your account is pending approval by an admin.');
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, {
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
})));
exports.default = router;
