require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const Task = require('./models/Task');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const PORT = process.env.PORT|| 3000;
const verifyToken = require('./middleware/auth');

mongoose.connect(process.env.MONGO_URI).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err.message));
app.use(express.json());
app.use(cors());

app.get('/tasks', verifyToken, async (req, res) => {
    try {
        // Task.find() with empty brackets means "find everything in this collection"
        const allTasks = await Task.find({ userId: req.user.userId});
        
        // Send the array of database tasks back to the user
        res.json(allTasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks from the database' });
    }
});

app.get('/status', (req, res) => {
    res.json({ message: "My CI/CD pipeline is working perfectly!" });
});

app.get('/tasks/:id', verifyToken, async (req, res) => {
    try {
        // Just grab the raw string directly!
        const taskId = req.params.id; 
        
        // Await the database search
        const task = await Task.findById({ _id: taskId , userId: req.user.userId });
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        // If the ID is the wrong length/format, Mongoose throws an error. We catch it here!
        res.status(500).json({ error: 'Invalid task ID or server error' });
    }
});

app.get('/', (req, res) => {
    res.send('Welcome to the TASK MANAGER API!');
});

app.post('/register', async (req, res) => {
    try {
        const  { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username: username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Directive Authorization created' });
    }
    catch (error) {
        res.status(400).json({ error: 'Username may already exist' });
    }
});

app.post('/tasks', verifyToken, async (req, res) => {
    try {
        const { title, completed } = req.body;
        
        // We add the userId extracted from the token (req.user.userId)
        const newTask = new Task({ 
            title, 
            completed,
            userId: req.user.userId 
        });
        
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
  
        // 1. Find the user in the database
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'User not found.' });
        }

        // 2. Check if the typed password matches the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ token: token });
    }
    catch (error) {
        res.status(400).json({ error: `Some Error occurred during login ${error.message}` });
    }
})

app.put('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        
        // Find by ID AND User ID, then apply updates
        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, userId: req.user.userId }, 
            req.body, 
            { new: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found or unauthorized' });
        }
        
        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update task' });
    }
});

app.delete('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        
        // Find by ID AND the User's ID to ensure they actually own it
        const deletedTask = await Task.findOneAndDelete({ 
            _id: taskId, 
            userId: req.user.userId 
        });
        
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found or unauthorized' });
        }
        
        res.json({ message: 'Task successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});