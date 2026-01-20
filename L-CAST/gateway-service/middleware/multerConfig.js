const multer = require('multer');
const path = require('path');

// Configure where and how to save story images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/stories/'); // Ensure this folder exists!
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'story-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = upload;