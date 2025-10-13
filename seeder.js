const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/categoryModel');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  await connectDB();
  try {
    await Category.deleteMany(); // Clear existing categories to avoid duplicates

    const defaultCategories = [
      { name: 'Technology' },
      { name: 'Cultural' },
      { name: 'Sports' },
      { name: 'Academic' },
      { name: 'Workshop' },
      { name: 'Seminar' },
    ];

    await Category.insertMany(defaultCategories);

    console.log('Categories Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  await connectDB();
  try {
    await Category.deleteMany();
    console.log('Categories Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
