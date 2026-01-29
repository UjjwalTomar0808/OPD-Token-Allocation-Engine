require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elastic-opd')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
const tokenRoutes = require('./src/routes/tokenRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');

app.use('/api/tokens', tokenRoutes);
app.use('/api/doctors', doctorRoutes);

// Queue Endpoint
const doctorController = require('./src/controllers/doctorController');
app.get('/api/queue/:id', doctorController.getQueue);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
