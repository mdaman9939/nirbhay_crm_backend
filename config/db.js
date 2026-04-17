const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${i}/${retries} failed: ${error.message}`);
      if (i < retries) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        console.error('All MongoDB connection attempts failed. Server will continue running but DB operations will fail.');
      }
    }
  }
};

module.exports = connectDB;
