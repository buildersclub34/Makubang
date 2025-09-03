const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  uploadVideo,
  likeVideo,
  addComment,
  deleteComment
} = require('../controllers/videoController');

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Video = require('../models/Video');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `video-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for video files only
const fileFilter = (req, file, cb) => {
  const filetypes = /mp4|mov|avi|mkv|webm/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Include other resource routers
const commentRouter = require('./commentRoutes');

// Re-route into other resource routers
router.use('/:videoId/comments', commentRouter);

// Video upload endpoint
router.post(
  '/upload',
  protect,
  authorize('creator', 'restaurant', 'admin'),
  upload.single('video'),
  uploadVideo
);

router
  .route('/')
  .get(
    advancedResults(Video, [
      { path: 'user', select: 'name avatar' },
      { path: 'restaurant', select: 'name logo' }
    ]),
    getVideos
  )
  .post(protect, authorize('creator', 'restaurant', 'admin'), createVideo);

router
  .route('/:id')
  .get(getVideo)
  .put(protect, updateVideo)
  .delete(protect, deleteVideo);

router.route('/:id/like').put(protect, likeVideo);

module.exports = router;
