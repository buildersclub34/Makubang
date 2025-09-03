const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all notifications for the authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  
  // Build query
  const query = { user: req.user.id };
  
  // Filter by read status
  if (req.query.read !== undefined) {
    query.read = req.query.read === 'true';
  }
  
  // Filter by type
  if (req.query.type) {
    query.type = req.query.type;
  }
  
  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
  ]);
  
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  
  res.status(200).json({
    success: true,
    count: notifications.length,
    pagination: {
      total,
      page,
      pages,
      limit,
    },
    data: notifications,
  });
});

/**
 * @desc    Get notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
exports.getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!notification) {
    return next(
      new ErrorResponse(`No notification found with id of ${req.params.id}`, 404)
    );
  }
  
  // Mark as read when fetched directly
  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }
  
  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { read: true, readAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!notification) {
    return next(
      new ErrorResponse(`No notification found with id of ${req.params.id}`, 404)
    );
  }
  
  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user.id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });
  
  if (!notification) {
    return next(
      new ErrorResponse(`No notification found with id of ${req.params.id}`, 404)
    );
  }
  
  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
exports.deleteAllNotifications = asyncHandler(async (req, res, next) => {
  await Notification.deleteMany({ user: req.user.id });
  
  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    read: false,
  });
  
  res.status(200).json({
    success: true,
    count,
  });
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
exports.getPreferences = asyncHandler(async (req, res, next) => {
  // In a real app, this would come from the user's preferences
  // For now, we'll return default preferences
  const defaultPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    types: {
      orderUpdates: true,
      promotions: true,
      accountActivity: true,
      social: true,
      marketing: false,
    },
  };
  
  res.status(200).json({
    success: true,
    data: defaultPreferences,
  });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
exports.updatePreferences = asyncHandler(async (req, res, next) => {
  // In a real app, we would update the user's preferences in the database
  // For now, we'll just return the updated preferences
  
  const defaultPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    types: {
      orderUpdates: true,
      promotions: true,
      accountActivity: true,
      social: true,
      marketing: false,
    },
  };
  
  const updatedPreferences = {
    ...defaultPreferences,
    ...req.body,
    types: {
      ...defaultPreferences.types,
      ...(req.body.types || {}),
    },
  };
  
  res.status(200).json({
    success: true,
    data: updatedPreferences,
  });
});
