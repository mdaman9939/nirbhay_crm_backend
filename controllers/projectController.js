const Project = require('../models/Project');

// @desc    Create a new project (sales only)
// @route   POST /api/projects
const createProject = async (req, res) => {
  try {
    const { title, description, clientName, clientPhone, location } = req.body;

    if (!title || !description || !clientName) {
      return res.status(400).json({ message: 'Title, description, and client name are required' });
    }

    const project = await Project.create({
      title,
      description,
      clientName,
      clientPhone,
      location,
      status: 'LEAD',
      createdBy: req.user._id,
    });

    await project.populate('createdBy', '-password');

    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error.message);
    res.status(500).json({ message: 'Server error while creating project' });
  }
};

// @desc    Get all projects (role-based filtering)
// @route   GET /api/projects
const getProjects = async (req, res) => {
  try {
    const { role, _id } = req.user;
    let query = {};

    if (role === 'state_head') {
      // State head sees all projects
      query = {};
    } else if (role === 'district_head') {
      // District head sees projects assigned to them
      query = { assignedDistrictHead: _id };
    } else if (role === 'sales') {
      // Sales sees only their created projects
      query = { createdBy: _id };
    } else {
      // Regular users see nothing
      return res.json([]);
    }

    const projects = await Project.find(query)
      .populate('createdBy', '-password')
      .populate('assignedDistrictHead', '-password')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error.message);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', '-password')
      .populate('assignedDistrictHead', '-password');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { role, _id } = req.user;
    const userId = _id.toString();

    // Access check
    if (role === 'state_head') {
      // Full access
    } else if (role === 'district_head') {
      if (project.assignedDistrictHead?._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (role === 'sales') {
      if (project.createdBy._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project by ID error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Server error while fetching project' });
  }
};

// @desc    Approve or reject a project (state_head only)
// @route   PUT /api/projects/:id/approve
const approveProject = async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await project.save();

    await project.populate('createdBy', '-password');
    await project.populate('assignedDistrictHead', '-password');

    res.json(project);
  } catch (error) {
    console.error('Approve project error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Server error while approving project' });
  }
};

// @desc    Assign district head to project (state_head only)
// @route   PUT /api/projects/:id/assign
const assignDistrictHead = async (req, res) => {
  try {
    const { districtHeadId } = req.body;

    if (!districtHeadId) {
      return res.status(400).json({ message: 'District head ID is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.assignedDistrictHead = districtHeadId;
    await project.save();

    await project.populate('createdBy', '-password');
    await project.populate('assignedDistrictHead', '-password');

    res.json(project);
  } catch (error) {
    console.error('Assign district head error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Server error while assigning district head' });
  }
};

// @desc    Update project status (stage progression)
// @route   PUT /api/projects/:id/status
const updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      'LEAD', 'APPROVED', 'SITE_VISIT', 'MEASUREMENT',
      'INSTALLATION', 'COMPLETED', 'REJECTED',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = status;
    await project.save();

    await project.populate('createdBy', '-password');
    await project.populate('assignedDistrictHead', '-password');

    res.json(project);
  } catch (error) {
    console.error('Update project status error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Server error while updating project status' });
  }
};

// @desc    Delete project (state_head only)
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(500).json({ message: 'Server error while deleting project' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  approveProject,
  assignDistrictHead,
  updateProjectStatus,
  deleteProject,
};
