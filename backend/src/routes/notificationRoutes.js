const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  getPreferences,
  updatePreferences,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// Get all notifications
router.route('/')
  .get(getNotifications)
  .delete(deleteAllNotifications);

// Get notification by ID
router.route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Notification preferences
router.route('/preferences')
  .get(getPreferences)
  .put(updatePreferences);

module.exports = router;
