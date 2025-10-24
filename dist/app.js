"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Route imports
const auditRoutes_1 = __importDefault(require("./src/routes/auditRoutes"));
const authRoutes_1 = __importDefault(require("./src/routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./src/routes/userRoutes")); // Changed to default import
const groupRoutes_1 = __importDefault(require("./src/routes/groupRoutes"));
const runRoutes_1 = __importDefault(require("./src/routes/runRoutes"));
const coachRoutes_1 = __importDefault(require("./src/routes/coachRoutes"));
// Middleware imports
const errorMiddleware_1 = require("./src/middleware/errorMiddleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // Parses JSON request bodies
// API Routes
app.use('/api/auth', authRoutes_1.default); // POST /api/auth/login, /register
app.use('/api/users', userRoutes_1.default); // GET /api/users/profile, etc.
app.use('/api/audit', auditRoutes_1.default); // Your audit tracking
app.use('/api/groups', groupRoutes_1.default); // Group create, join, edit, etc.
app.use('/api/runs', runRoutes_1.default); // Run routes
app.use('/api/coach', coachRoutes_1.default);
app.get('/', (req, res) => {
    res.send('MakeDaRun Backend is live 🏃‍♂️');
});
// Error handling middleware (must come AFTER routes)
app.use(errorMiddleware_1.notFound); // Handles 404s for unknown routes
app.use(errorMiddleware_1.errorHandler); // Handles thrown errors and returns JSON
// MongoDB connection
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
exports.default = app;
