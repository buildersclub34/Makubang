import express from 'express';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);

export default router;