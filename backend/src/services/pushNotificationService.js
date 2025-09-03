const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('../../firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

/**
 * Send a push notification to a user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID to send notification to
 * @param {String} options.title - Notification title
 * @param {String} options.body - Notification body/message
 * @param {Object} options.data - Additional data to send with the notification
 * @param {String} options.image - URL of an image to display with the notification
 * @returns {Promise<Object>} Result of the notification send operation
 */
const sendPushNotification = async ({ userId, title, body, data = {}, image }) => {
  try {
    // Get user's FCM tokens
    const user = await User.findById(userId).select('fcmTokens');
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log('No FCM tokens found for user:', userId);
      return { success: false, message: 'No FCM tokens found for user' };
    }
    
    // Prepare notification payload
    const message = {
      notification: {
        title,
        body,
        ...(image && { image }),
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: await getUnreadNotificationCount(userId),
          },
        },
      },
      tokens: user.fcmTokens,
    };
    
    // Send the message
    const response = await admin.messaging().sendMulticast(message);
    
    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          // https://firebase.google.com/docs/cloud-messaging/admin/errors
          if (resp.error.code === 'messaging/invalid-registration-token' || 
              resp.error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(user.fcmTokens[idx]);
          }
        }
      });
      
      if (tokensToRemove.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: tokensToRemove } },
        });
      }
    }
    
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
    
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send a push notification to multiple users
 * @param {Object} options - Notification options
 * @param {Array<String>} options.userIds - Array of user IDs to send notification to
 * @param {String} options.title - Notification title
 * @param {String} options.body - Notification body/message
 * @param {Object} options.data - Additional data to send with the notification
 * @param {String} options.image - URL of an image to display with the notification
 * @returns {Promise<Object>} Result of the notification send operation
 */
const sendBulkPushNotifications = async ({ userIds, title, body, data = {}, image }) => {
  try {
    const results = await Promise.all(
      userIds.map(userId => 
        sendPushNotification({ userId, title, body, data, image })
          .catch(error => ({
            userId,
            success: false,
            error: error.message,
          }))
      )
    );
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    return {
      success: successCount > 0,
      successCount,
      failureCount,
      results,
    };
    
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    throw error;
  }
};

/**
 * Send a push notification to a topic
 * @param {Object} options - Notification options
 * @param {String} options.topic - Topic to send notification to (e.g., 'all_users', 'restaurant_123')
 * @param {String} options.title - Notification title
 * @param {String} options.body - Notification body/message
 * @param {Object} options.data - Additional data to send with the notification
 * @param {String} options.image - URL of an image to display with the notification
 * @returns {Promise<Object>} Result of the notification send operation
 */
const sendTopicPushNotification = async ({ topic, title, body, data = {}, image }) => {
  try {
    const message = {
      notification: {
        title,
        body,
        ...(image && { image }),
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      topic: topic.replace(/[^a-zA-Z0-9-_.~%]/g, '-'), // Sanitize topic name
    };
    
    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      messageId: response,
    };
    
  } catch (error) {
    console.error('Error sending topic push notification:', error);
    throw error;
  }
};

/**
 * Subscribe a user to a topic
 * @param {String} userId - User ID
 * @param {String} topic - Topic to subscribe to
 * @returns {Promise<Object>} Result of the subscription
 */
const subscribeToTopic = async (userId, topic) => {
  try {
    const user = await User.findById(userId).select('fcmTokens');
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, message: 'No FCM tokens found for user' };
    }
    
    const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '-');
    const response = await admin.messaging().subscribeToTopic(user.fcmTokens, sanitizedTopic);
    
    return {
      success: true,
      ...response,
    };
    
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
};

/**
 * Unsubscribe a user from a topic
 * @param {String} userId - User ID
 * @param {String} topic - Topic to unsubscribe from
 * @returns {Promise<Object>} Result of the unsubscription
 */
const unsubscribeFromTopic = async (userId, topic) => {
  try {
    const user = await User.findById(userId).select('fcmTokens');
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, message: 'No FCM tokens found for user' };
    }
    
    const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '-');
    const response = await admin.messaging().unsubscribeFromTopic(user.fcmTokens, sanitizedTopic);
    
    return {
      success: true,
      ...response,
    };
    
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw error;
  }
};

/**
 * Get the count of unread notifications for a user
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Count of unread notifications
 */
const getUnreadNotificationCount = async (userId) => {
  return Notification.countDocuments({
    user: userId,
    read: false,
  });
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  sendTopicPushNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};
