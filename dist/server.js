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
const userRoutes_1 = __importDefault(require("./src/routes/userRoutes"));
const groupRoutes_1 = __importDefault(require("./src/routes/groupRoutes"));
const runRoutes_1 = __importDefault(require("./src/routes/runRoutes"));
const coachRoutes_1 = __importDefault(require("./src/routes/coachRoutes"));
// Middleware imports
const errorMiddleware_1 = require("./src/middleware/errorMiddleware");
const journalRoutes_1 = __importDefault(require("./src/routes/journalRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // Parses JSON request bodies
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/audit', auditRoutes_1.default);
app.use('/api/groups', groupRoutes_1.default);
app.use('/api/runs', runRoutes_1.default);
app.use('/api/coach', coachRoutes_1.default);
app.use('/api/journal', journalRoutes_1.default);
// Root route
app.get('/', (req, res) => {
    res.send('MakeDaRun Backend is live 🏃‍♂️');
});
// Error handling
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// MongoDB connection and server start
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
});
