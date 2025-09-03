const express = require('express');
const router = express.Router();
const WebSocketService = require('../services/websocketService');
const { protect } = require('../middleware/auth');

// Initialize WebSocket service with HTTP server
let webSocketService = null;

const initWebSocketService = (server) => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
};

// Protect WebSocket upgrade request
router.ws('/ws', (ws, req) => {
  // The WebSocket upgrade is handled by the WebSocketService
  // This route is just a placeholder for the WebSocket endpoint
  ws.send(JSON.stringify({ type: 'ERROR', message: 'Direct WebSocket connection not allowed' }));
  ws.close();
});

// Send test notification (for testing purposes)
router.post('/test-notification', protect, async (req, res) => {
  try {
    if (!webSocketService) {
      return res.status(400).json({
        success: false,
        message: 'WebSocket service not initialized',
      });
    }

    const { userId, title, message, data } = req.body;
    
    // In a real app, you would validate that the current user has permission to send to this user
    await webSocketService.sendToUser(userId, {
      type: 'TEST_NOTIFICATION',
      data: {
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        timestamp: new Date().toISOString(),
        ...data,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message,
    });
  }
});

// Get WebSocket connection status
router.get('/status', protect, (req, res) => {
  if (!webSocketService) {
    return res.status(400).json({
      success: false,
      message: 'WebSocket service not initialized',
    });
  }

  const status = {
    totalClients: webSocketService.getTotalClients(),
    activeUsers: webSocketService.clients.size,
    serverTime: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    data: status,
  });
});

module.exports = {
  router,
  initWebSocketService,
};
