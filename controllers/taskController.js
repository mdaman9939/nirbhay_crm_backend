const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Create a new task (district_head only)
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, projectId, assignedTo } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and project ID are required' });
    }

    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Collect image paths if uploaded
    const images = req.files ? req.files.map((file) => file.path) : [];

    const task = await Task.create({
      title,
      description,
      projectId,
      assignedTo,
      createdBy: req.user._id,
      images,
    });

    await task.populate('projectId');
    await task.populate('assignedTo', '-password');
    await task.populate('createdBy', '-password');

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid project or user ID' });
    }
    res.status(500).json({ message: 'Server error while creating task' });
  }
};

// @desc    Get tasks (role-based filtering)
// @route   GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { role, _id } = req.user;
    let query = {};

    if (role === 'state_head') {
      // State head sees all tasks
      query = {};
    } else if (role === 'district_head') {
      // District head sees tasks for projects assigned to them
      const assignedProjects = await Project.find({ assignedDistrictHead: _id }).select('_id');
      const projectIds = assignedProjects.map((p) => p._id);
      query = { projectId: { $in: projectIds } };
    } else if (role === 'user') {
      // User sees only tasks assigned to them
      query = { assignedTo: _id };
    } else {
      // Sales or others see nothing
      return res.json([]);
    }

    const tasks = await Task.find(query)
      .populate('projectId')
      .populate('assignedTo', '-password')
      .populate('createdBy', '-password')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error.message);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// @desc    Get tasks by project ID
// @route   GET /api/tasks/project/:projectId
const getTasksByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignedTo', '-password')
      .populate('createdBy', '-password')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks by project error:', error.message);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('projectId')
      .populate('assignedTo', '-password')
      .populate('createdBy', '-password');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { role, _id } = req.user;
    const userId = _id.toString();

    // Access check
    if (role === 'state_head') {
      // Full access
    } else if (role === 'district_head') {
      if (task.createdBy._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (role === 'user') {
      if (task.assignedTo?._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task by ID error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(500).json({ message: 'Server error while fetching task' });
  }
};

// @desc    Update task (user can update status, remarks, images, location)
// @route   PUT /api/tasks/:id/update
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { status, remarks, latitude, longitude, gpsLocation } = req.body;

    // Update status if provided
    if (status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      }
      task.status = status;
    }

    // Update remarks if provided
    if (remarks !== undefined) {
      task.remarks = remarks;
    }

    // Update location if provided (supports both formats)
    if (gpsLocation) {
      try {
        const loc = typeof gpsLocation === 'string' ? JSON.parse(gpsLocation) : gpsLocation;
        task.location = {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
        };
      } catch (e) {
        // ignore invalid JSON
      }
    } else if (latitude !== undefined && longitude !== undefined) {
      task.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    }

    // Append new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.path);
      task.images = [...task.images, ...newImages];
    }

    await task.save();

    await task.populate('projectId');
    await task.populate('assignedTo', '-password');
    await task.populate('createdBy', '-password');

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(500).json({ message: 'Server error while updating task' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  getTasksByProject,
  updateTask,
};
