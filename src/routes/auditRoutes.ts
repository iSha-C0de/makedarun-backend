// server/src/routes/auditRoutes.ts
import express from 'express';
import Audit from '../models/Audit';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const logs = await Audit.find().sort({ createdAt: -1 });
    console.log(logs);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

export default router;
