require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Task = require('./models/Task');
const User = require('./models/User');
const verifyToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database ────────────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// FIX 1: cors() with no options was fine for development, but we explicitly
// list allowed origins so Vercel and localhost both work, and the browser
// never gets a surprise CORS block after a Vercel domain change.
const allowedOrigins = [
    'http://localhost:5173',           // Vite dev server
    process.env.FRONTEND_URL,         // set this in Render dashboard → your Vercel URL
].filter(Boolean);                    // removes undefined if FRONTEND_URL is not set yet

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// ─── Public routes ────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the TASK MANAGER API!' });
});

app.get('/status', (req, res) => {
    res.json({ message: 'My CI/CD pipeline is working perfectly!' });
});

// REGISTER
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'Directive Authorization created' });
    } catch (error) {
        // Mongoose duplicate-key error code is 11000
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username already exists.' });
        }
        res.status(400).json({ error: 'Registration failed.' });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: `Login failed: ${error.message}` });
    }
});

// ─── Protected routes (all require a valid JWT) ───────────────────────────────

// GET all tasks for the logged-in user
app.get('/tasks', verifyToken, async (req, res) => {
    try {
        const allTasks = await Task.find({ userId: req.user.userId });
        res.json(allTasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks from the database' });
    }
});

// GET a single task by ID
app.get('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // FIX 2: Task.findById() only accepts the ID, not a filter object.
        // To also filter by userId (ownership check), use findOne() instead.
        const task = await Task.findOne({ _id: taskId, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Invalid task ID or server error' });
    }
});

// CREATE a task
app.post('/tasks', verifyToken, async (req, res) => {
    try {
        const { title, completed } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required.' });
        }

        const newTask = new Task({
            title,
            completed,
            userId: req.user.userId,
        });

        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// UPDATE a task
app.put('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;

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

// DELETE a task
app.delete('/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        const deletedTask = await Task.findOneAndDelete({
            _id: taskId,
            userId: req.user.userId,
        });

        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found or unauthorized' });
        }

        res.json({ message: 'Task successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});