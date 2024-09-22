import mongoose from 'mongoose';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config'
import { authenticateUser } from './middlewares/auth.js';
import { User } from './models/User.js';
import { Task } from './models/Task.js';

const app = express();

const port = 8000;
const databaseURI = process.env.DATABASE_URI;
const jwt_secret = process.env.JWT_SECRET;

// find NODE_ENV in process.env and set it to 'development' if it doesn't exist
// find frontend url to allow cors
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';

// CORS configuration
const corsOptions = {
  origin: frontendURL,
  optionsSuccessStatus: 204,
  credentials: true, // This allows the server to accept credentials
};

// Enable CORS with the specified options
app.use(cors(corsOptions));

// add all the global middlewares here
app.use(express.json());

// connect to MongoDB
(async () => {
    try {
        await mongoose.connect(databaseURI);
        console.log('Connected to MongoDB');
        // Start the server after successful database connection
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
})();

// Example route
app.get('/', (req, res) => {
    res.send('Hello, worrld!');
});

// Auth routes
app.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const user = await User.create({ username, email, password });
      // const token = jwt.sign({ userId: user._id }, jwt_secret, { expiresIn: '1d' });
  
      res.status(201).json({ user: { id: user._id, username: user.username, email: user.email } });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error: error.message });
    }
  });
  
app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
  
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ userId: user._id }, jwt_secret, { expiresIn: '1d' });
      res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// route for authenticating user by token
app.get('/auth', authenticateUser, (req, res) => {
    res.json({ message: 'Authenticated', userId: req.user.id });
});

// Task routes

// Create a new task
app.post('/todos', authenticateUser, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = new Task({
      title,
      description,
      status,
      priority,
      dueDate,
      user: req.user.id
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error creating task', error: error.message });
  }
});

// Get all tasks for the authenticated user
app.get('/todos', authenticateUser, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Get a single task by ID
app.get('/todos/:id', authenticateUser, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
});

// Update a task
app.put('/todos/:id', authenticateUser, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title, description, status, priority, dueDate },
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error updating task', error: error.message });
  }
});

// Patch task status
app.patch('/todos/:id', authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status },
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error){
    res.status(400).json({ message: 'Error updating task', error: error.message });
  }
});

// Delete a task
app.delete('/todos/:id', authenticateUser, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});