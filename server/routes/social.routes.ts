import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import SocialController from '../controllers/social.controller';

const router = Router();

// All social routes require auth
router.use(authenticate);

// Follow a user
router.post('/:userId/follow', (req, res, next) => SocialController.follow(req as any, res, next));

// Unfollow a user
router.delete('/:userId/follow', (req, res, next) => SocialController.unfollow(req as any, res, next));

// Get follower/following counters
router.get('/:userId/counters', (req, res, next) => SocialController.counters(req, res, next));

export default router;


