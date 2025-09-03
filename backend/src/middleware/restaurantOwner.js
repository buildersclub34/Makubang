const User = require('../models/User');

// Middleware to check if user is a restaurant owner
const restaurantOwner = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    if (user.role !== 'restaurant_owner' && user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Restaurant owner or admin access required' });
    }

    // If user is a restaurant owner, attach their restaurant ID to the request
    if (user.role === 'restaurant_owner' && user.restaurant) {
      req.restaurantId = user.restaurant;
    }

    next();
  } catch (err) {
    console.error('Error in restaurantOwner middleware:', err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = restaurantOwner;
