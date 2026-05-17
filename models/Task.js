const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    // FIX 5: The original stored userId as a plain String.
    // Using mongoose.Schema.Types.ObjectId with a ref lets Mongoose
    // know this is a foreign key pointing to the User collection.
    // It also means Mongoose will cast the string from the JWT payload
    // into a proper ObjectId automatically, so queries never silently
    // fail due to a type mismatch (String vs ObjectId).
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;