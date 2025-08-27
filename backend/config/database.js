const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI); // Debug line
    
    // MongoDB connection options (updated for latest mongoose)
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain minimum 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      heartbeatFrequencyMS: 10000, // Heartbeat every 10s
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Provide specific error messages
    if (error.code === 'ENOTFOUND') {
      console.error('DNS resolution failed. Possible solutions:');
      console.error('1. Check your internet connection');
      console.error('2. Verify the cluster URL is correct');
      console.error('3. Try using a different DNS server (8.8.8.8)');
      console.error('4. Check if your network blocks MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB; 