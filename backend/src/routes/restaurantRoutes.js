const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const restaurantOwner = require('../middleware/restaurantOwner');
const {
  createRestaurant,
  getRestaurants,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant
} = require('../controllers/restaurantController');

// @route   POST api/restaurants
// @desc    Create a restaurant
// @access  Private/Admin
router.post(
  '/',
  [
    auth,
    admin,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('cuisine', 'Cuisine is required').not().isEmpty(),
      check('address', 'Address is required').not().isEmpty(),
      check('contact', 'Contact information is required').not().isEmpty(),
      check('ownerId', 'Owner ID is required').not().isEmpty()
    ]
  ],
  createRestaurant
);

// @route   GET api/restaurants
// @desc    Get all restaurants
// @access  Public
router.get('/', getRestaurants);

// @route   GET api/restaurants/:id
// @desc    Get restaurant by ID
// @access  Public
router.get('/:id', getRestaurant);

// @route   PUT api/restaurants/:id
// @desc    Update restaurant
// @access  Private/Restaurant Owner & Admin
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').optional().not().isEmpty(),
      check('description', 'Description is required').optional().not().isEmpty(),
      check('cuisine', 'Cuisine is required').optional().not().isEmpty(),
      check('address', 'Address is required').optional().not().isEmpty(),
      check('contact', 'Contact information is required').optional().not().isEmpty()
    ]
  ],
  updateRestaurant
);

// @route   DELETE api/restaurants/:id
// @desc    Delete a restaurant
// @access  Private/Admin
router.delete('/:id', [auth, admin], deleteRestaurant);

module.exports = router;
