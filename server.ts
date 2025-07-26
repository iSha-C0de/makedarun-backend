import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import auditRoutes from './src/routes/auditRoutes';
import authRoutes from './src/routes/authRoutes';
import userRoutes from './src/routes/userRoutes';
import groupRoutes from './src/routes/groupRoutes';
import runRoutes from './src/routes/runRoutes';
import coachRoutes from './src/routes/coachRoutes'; 

// Middleware imports
import { notFound, errorHandler } from './src/middleware/errorMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses JSON request bodies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/coach', coachRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('MakeDaRun Backend is live 🏃‍♂️');
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// MongoDB connection and server start
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
