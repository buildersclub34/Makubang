const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create a new restaurant
// @route   POST /api/restaurants
// @access  Private/Admin
const createRestaurant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, cuisine, address, contact, ownerId } = req.body;

    // Check if owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ msg: 'Owner not found' });
    }

    // Create restaurant
    const restaurant = new Restaurant({
      name,
      description,
      cuisine,
      address,
      contact,
      owner: ownerId,
      isActive: true
    });

    await restaurant.save();

    // Update user role to restaurant owner
    owner.role = 'restaurant_owner';
    owner.restaurant = restaurant._id;
    await owner.save();

    res.status(201).json(restaurant);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
const getRestaurants = async (req, res) => {
  try {
    const { cuisine, search, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (cuisine) {
      query.cuisine = { $in: cuisine.split(',') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const restaurants = await Restaurant.find(query)
      .populate('owner', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Restaurant.countDocuments(query);

    res.json({
      restaurants,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
const getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('dishes');

    if (!restaurant) {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Restaurant Owner & Admin
const updateRestaurant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, cuisine, address, contact, isActive } = req.body;
    
    let restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }

    // Check if user is restaurant owner or admin
    if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update fields
    if (name) restaurant.name = name;
    if (description) restaurant.description = description;
    if (cuisine) restaurant.cuisine = cuisine;
    if (address) restaurant.address = address;
    if (contact) restaurant.contact = contact;
    if (isActive !== undefined) restaurant.isActive = isActive;

    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Admin
const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }

    // In production, you might want to soft delete instead
    await restaurant.remove();

    res.json({ msg: 'Restaurant removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }
    res.status(500).send('Server Error');
  }
};

module.exports = {
  createRestaurant,
  getRestaurants,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant
};
