const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    url: {
      type: String,
      required: [true, 'Please add a video URL'],
    },
    thumbnail: {
      type: String,
      required: [true, 'Please add a thumbnail URL'],
    },
    duration: {
      type: Number,
      required: [true, 'Please add video duration in seconds'],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    cuisineType: {
      type: String,
      enum: [
        'indian',
        'chinese',
        'italian',
        'mexican',
        'thai',
        'japanese',
        'korean',
        'american',
        'mediterranean',
        'other',
      ],
      default: 'other',
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.ObjectId,
      ref: 'Restaurant',
    },
    dishes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Dish',
      },
    ],
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
    },
    moderationNotes: [
      {
        note: String,
        moderator: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    location: {
      // GeoJSON Point
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      formattedAddress: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create location from address (using geocoder)
VideoSchema.pre('save', async function (next) {
  // Geocoding logic here if needed
  next();
});

// Cascade delete comments when a video is deleted
VideoSchema.pre('remove', async function (next) {
  await this.model('Comment').deleteMany({ video: this._id });
  await this.model('Like').deleteMany({ video: this._id });
  next();
});

// Reverse populate with virtuals
VideoSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'video',
  justOne: false,
});

VideoSchema.virtual('likes', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'video',
  justOne: false,
});

module.exports = mongoose.model('Video', VideoSchema);
