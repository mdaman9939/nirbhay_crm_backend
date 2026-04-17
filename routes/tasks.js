const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, roleCheck } = require('../middleware/auth');
const {
  createTask,
  getTasks,
  getTaskById,
  getTasksByProject,
  updateTask,
} = require('../controllers/taskController');

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All routes require authentication
router.use(auth);

// POST /api/tasks - district_head only, with image upload
router.post('/', roleCheck('district_head'), upload.array('images', 10), createTask);

// GET /api/tasks - role-based filtering
router.get('/', getTasks);

// GET /api/tasks/project/:projectId - tasks by project
router.get('/project/:projectId', getTasksByProject);

// GET /api/tasks/:id - single task
router.get('/:id', getTaskById);

// PUT /api/tasks/:id/update - user only, with image upload
router.put('/:id/update', roleCheck('user'), upload.array('images', 10), updateTask);

module.exports = router;
