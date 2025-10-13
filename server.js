
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // Import category routes
const adminRoutes = require('./routes/adminRoutes'); // Import admin routes
const systemSettingRoutes = require('./routes/systemSettingRoutes'); // Import system setting routes
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for JSON body
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Added for URL-encoded bodies and increased limit

// Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes); // Use category routes
app.use('/api/admin', adminRoutes); // Use admin routes
app.use('/api/settings', systemSettingRoutes); // Use system setting routes

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(notFound);
// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
});
