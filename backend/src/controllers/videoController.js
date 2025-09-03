const Video = require('../models/Video');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true
});

// @desc    Upload video to Cloudinary
// @access  Private
const uploadVideoToCloudinary = async (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'video',
      chunk_size: 6000000, // 6MB chunks for large files
      eager: [
        { width: 640, height: 360, crop: 'scale' },  // 360p
        { width: 854, height: 480, crop: 'scale' },  // 480p
        { width: 1280, height: 720, crop: 'scale' }, // 720p
        { width: 1920, height: 1080, crop: 'scale' } // 1080p
      ],
      eager_async: true,
      ...options
    };

    cloudinary.uploader.upload_large(file.tempFilePath, uploadOptions, 
      (error, result) => {
        // Clean up the temporary file
        fs.unlinkSync(file.tempFilePath);
        
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error('Failed to upload video to Cloudinary'));
        }
        
        resolve(result);
      }
    );
  });
};

// @desc    Get all videos
// @route   GET /api/v1/videos
// @access  Public
exports.getVideos = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single video
// @route   GET /api/v1/videos/:id
// @access  Public
exports.getVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('restaurant', 'name logo');

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: video
  });
});

// @desc    Upload video file
// @route   POST /api/v1/videos/upload
// @access  Private (Creators & Restaurants)
exports.uploadVideo = asyncHandler(async (req, res, next) => {
  if (!req.files) {
    return next(new ErrorResponse('Please upload a video file', 400));
  }

  const file = req.files.video;

  // Check if file is a video
  if (!file.mimetype.startsWith('video')) {
    return next(new ErrorResponse('Please upload a video file', 400));
  }

  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return next(new ErrorResponse('Video size cannot be more than 500MB', 400));
  }

  try {
    // Upload to Cloudinary
    const result = await uploadVideoToCloudinary(file, {
      folder: 'makubang/videos',
      public_id: `video_${Date.now()}`,
      resource_type: 'video',
      upload_preset: 'makubang_videos'
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        width: result.width,
        height: result.height,
        thumbnail: result.secure_url.replace(/\.(mp4|mov|avi|mkv)$/, '.jpg'),
        qualityOptions: {
          '360p': result.eager ? result.eager[0].secure_url : null,
          '480p': result.eager ? result.eager[1].secure_url : null,
          '720p': result.eager ? result.eager[2].secure_url : null,
          '1080p': result.eager ? result.eager[3].secure_url : null
        }
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    return next(new ErrorResponse('Problem with video upload', 500));
  }
});

// @desc    Create new video
// @route   POST /api/v1/videos
// @access  Private (Creators & Restaurants)
exports.createVideo = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // If user is a restaurant, add restaurant ID
  if (req.user.role === 'restaurant') {
    req.body.restaurant = req.user.restaurant;
  }

  // Handle video URL or uploaded video
  if (req.body.videoUrl) {
    // If video is from external URL
    req.body.videoUrl = req.body.videoUrl;
  } else if (req.body.cloudinaryData) {
    // If video was uploaded to Cloudinary
    const cloudinaryData = JSON.parse(req.body.cloudinaryData);
    req.body.videoUrl = cloudinaryData.url;
    req.body.thumbnail = cloudinaryData.thumbnail;
    req.body.duration = cloudinaryData.duration;
    req.body.qualityOptions = cloudinaryData.qualityOptions;
  } else {
    return next(new ErrorResponse('Please provide a video URL or upload a video', 400));
  }

  const video = await Video.create(req.body);

  res.status(201).json({
    success: true,
    data: video
  });
});

// @desc    Update video
// @route   PUT /api/v1/videos/:id
// @access  Private (Video owner or Admin)
exports.updateVideo = asyncHandler(async (req, res, next) => {
  let video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is video owner or admin
  if (video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this video`,
        401
      )
    );
  }

  video = await Video.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: video });
});

// @desc    Delete video
// @route   DELETE /api/v1/videos/:id
// @access  Private (Video owner or Admin)
exports.deleteVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is video owner or admin
  if (video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this video`,
        401
      )
    );
  }

  await video.remove();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Upload video
// @route   PUT /api/v1/videos/:id/video
// @access  Private
exports.videoUpload = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is video owner or admin
  if (video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this video`,
        401
      )
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the file is a video
  if (!file.mimetype.startsWith('video')) {
    return next(new ErrorResponse(`Please upload a video file`, 400));
  }

  // Check file size
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return next(
      new ErrorResponse(
        `Please upload a video less than ${maxSize / (1024 * 1024)}MB`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `video_${video._id}${path.parse(file.name).ext}`;

  file.mv(`${config.fileUploadPath}/videos/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Video.findByIdAndUpdate(req.params.id, { video: file.name });

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

// @desc    Like/Unlike video
// @route   PUT /api/v1/videos/:id/like
// @access  Private
exports.likeVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the video has already been liked
  if (video.likes.includes(req.user.id)) {
    // Unlike
    const index = video.likes.indexOf(req.user.id);
    video.likes.splice(index, 1);
    await video.save();
    return res.status(200).json({ success: true, data: {}, action: 'unliked' });
  }

  // Like
  video.likes.unshift(req.user.id);
  await video.save();

  res.status(200).json({ success: true, data: {}, action: 'liked' });
});

// @desc    Add comment to video
// @route   POST /api/v1/videos/:id/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;

  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  const newComment = {
    text,
    user: req.user.id,
    name: req.user.name,
    avatar: req.user.avatar
  };

  video.comments.unshift(newComment);
  await video.save();

  res.status(200).json({
    success: true,
    data: video.comments
  });
});

// @desc    Delete comment
// @route   DELETE /api/v1/videos/:id/comments/:comment_id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(
      new ErrorResponse(`Video not found with id of ${req.params.id}`, 404)
    );
  }

  // Pull out comment
  const comment = video.comments.find(
    (comment) => comment.id === req.params.comment_id
  );

  // Make sure comment exists
  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.comment_id}`, 404)
    );
  }

  // Check user is comment owner or admin
  if (
    comment.user.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this comment`,
        401
      )
    );
  }

  // Get remove index
  const removeIndex = video.comments
    .map((comment) => comment.id)
    .indexOf(req.params.comment_id);

  video.comments.splice(removeIndex, 1);

  await video.save();

  res.status(200).json({
    success: true,
    data: video.comments
  });
});
