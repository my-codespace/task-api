require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
app.use(cors());
const Task = require('./models/Task');
mongoose.connect(process.env.MONGO_URI).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err.message));
app.use(express.json());
const PORT = process.env.PORT|| 3000;


app.get('/tasks', async (req, res) => {
    try {
        // Task.find() with empty brackets means "find everything in this collection"
        const allTasks = await Task.find();
        
        // Send the array of database tasks back to the user
        res.json(allTasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks from the database' });
    }
});

app.get('/status', (req, res) => {
    res.json({ message: "My CI/CD pipeline is working perfectly!" });
});

app.get('/tasks/:id', async (req, res) => {
    try {
        // Just grab the raw string directly!
        const taskId = req.params.id; 
        
        // Await the database search
        const task = await Task.findById(taskId);
        
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

app.post('/tasks', async (req, res) => {
    try {
        const { title, completed } = req.body;
        const newTask = new Task({ title, completed });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        // 1. Find by ID, 2. Apply updates from req.body, 3. Return the new version
        const updatedTask = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update task' });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        // Find the task by its ID and delete it in one step
        const deletedTask = await Task.findByIdAndDelete(taskId);
        
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ message: 'Task successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

