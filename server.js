// server.js

require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors'); 
const uploadRouter = require('./routes/upload');
const nodemailer = require('nodemailer');

const app = express();

// Log JWT_SECRET to verify it's loaded correctly
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Connect to database
connectDB();

// Init middleware
app.use(express.json({ extended: false }));
app.use(cors()); 
app.use('/uploads', express.static('uploads'));
app.use('/api/upload', uploadRouter);

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});

// Pass the transporter to the auth routes
app.use('/api/auth', require('./routes/auth')(transporter));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/mylist', require('./routes/mylist'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
