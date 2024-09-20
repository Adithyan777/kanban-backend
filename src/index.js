import mongoose from 'mongoose';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config'
import { authenticateUser } from '../middlewares/auth.js';
import { User } from '../models/User.js';

const app = express();

const port = 8000;
const databaseURI = process.env.DATABASE_URI;
const jwt_secret = process.env.JWT_SECRET;

// find NODE_ENV in process.env and set it to 'development' if it doesn't exist
// find frontend url to allow cors

// configure CORS
app.use(cors()); 

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

// All the db schemas and models

// Route specific middlewares

// All the routes

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

// add a route to authentiacate user from token and return if authenticated or not
app.get('/auth', authenticateUser, (req, res) => {
    res.json({ message: 'Authenticated', userId: req.user.id });
});

// Protected route example
app.get('/api/protected', authenticateUser, (req, res) => {
    res.json({ message: 'This is a protected route', userId: req.user.id });
  });
