const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification } = require('./pushNotificationService');
const { sendEmail } = require('./emailService');

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @param {String} notificationData.user - User ID
 * @param {String} notificationData.type - Notification type (e.g., 'ORDER_UPDATE', 'NEW_MESSAGE')
 * @param {String} notificationData.title - Notification title
 * @param {String} notificationData.message - Notification message
 * @param {Object} notificationData.data - Additional data
 * @param {Object} notificationData.relatedTo - Related entity (e.g., order, message)
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    
    // Send push notification if user has push tokens
    await sendPushNotification({
      userId: notification.user,
      title: notification.title,
      body: notification.message,
      data: {
        type: notification.type,
        ...notification.data,
        notificationId: notification._id.toString(),
      },
    });
    
    // Send email for important notifications
    if (['ORDER_UPDATE', 'PAYMENT_CONFIRMED', 'DELIVERY_UPDATE'].includes(notification.type)) {
      const user = await User.findById(notification.user).select('email');
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: notification.title,
          template: 'notification',
          context: {
            title: notification.title,
            message: notification.message,
            ...notification.data,
          },
        });
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get user notifications
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @param {Number} options.limit - Number of notifications to return
 * @param {Number} options.page - Page number
 * @param {String} options.type - Filter by notification type
 * @param {Boolean} options.read - Filter by read status
 * @returns {Promise<Object>} Paginated notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const { limit = 20, page = 1, type, read } = options;
    const skip = (page - 1) * limit;
    
    const query = { user: userId };
    if (type) query.type = type;
    if (read !== undefined) query.read = read;
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);
    
    return {
      data: notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Update result
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Deleted notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });
    
    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }
    
    return notification;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Count of unread notifications
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      user: userId,
      read: false,
    });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};
