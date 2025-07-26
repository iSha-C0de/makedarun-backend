import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import auditRoutes from './src/routes/auditRoutes';
import authRoutes from './src/routes/authRoutes';
import userRoutes from './src/routes/userRoutes'; // Changed to default import
import groupRoutes from './src/routes/groupRoutes';
import runRoutes from './src/routes/runRoutes';
import coachRoutes from './src/routes/coachRoutes'; 

// Middleware imports
import { notFound, errorHandler } from './src/middleware/errorMiddleware';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses JSON request bodies

// API Routes
app.use('/api/auth', authRoutes);        // POST /api/auth/login, /register
app.use('/api/users', userRoutes);       // GET /api/users/profile, etc.
app.use('/api/audit', auditRoutes);      // Your audit tracking
app.use('/api/groups', groupRoutes);     // Group create, join, edit, etc.
app.use('/api/runs', runRoutes);         // Run routes
app.use('/api/coach', coachRoutes);
app.get('/', (req, res) => {
  res.send('MakeDaRun Backend is live 🏃‍♂️');
});


// Error handling middleware (must come AFTER routes)
app.use(notFound);       // Handles 404s for unknown routes
app.use(errorHandler);   // Handles thrown errors and returns JSON

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

export default app;