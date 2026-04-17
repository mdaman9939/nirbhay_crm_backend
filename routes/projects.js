const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  createProject,
  getProjects,
  getProjectById,
  approveProject,
  assignDistrictHead,
  updateProjectStatus,
  deleteProject,
} = require('../controllers/projectController');

// All routes require authentication
router.use(auth);

// POST /api/projects - sales only
router.post('/', roleCheck('sales'), createProject);

// GET /api/projects - role-based filtering
router.get('/', getProjects);

// GET /api/projects/:id - single project
router.get('/:id', getProjectById);

// PUT /api/projects/:id/approve - state_head only
router.put('/:id/approve', roleCheck('state_head'), approveProject);

// PUT /api/projects/:id/assign - state_head only
router.put('/:id/assign', roleCheck('state_head'), assignDistrictHead);

// PUT /api/projects/:id/status - state_head or district_head
router.put('/:id/status', roleCheck('state_head', 'district_head'), updateProjectStatus);

// DELETE /api/projects/:id - state_head only
router.delete('/:id', roleCheck('state_head'), deleteProject);

module.exports = router;
