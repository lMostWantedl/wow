import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import database
import { pool, closePool } from './database/connection';
import { initializeDatabase } from './database/init';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users-simple';
import customerRoutes from './routes/customers-simple';
import billRoutes from './routes/bills-simple';
import sparePartRoutes from './routes/spareParts-simple';
import serviceRoutes from './routes/services-simple';
import dashboardRoutes from './routes/dashboard-simple';
import financialRoutes from './routes/financial-simple';
import vehicleRoutes from './routes/vehicles-simple';
import jobCardRoutes from './routes/jobCards-simple';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Re-export pool for any backward compatibility
export { pool };

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/bills', authenticateToken, billRoutes);
app.use('/api/spare-parts', authenticateToken, sparePartRoutes);
app.use('/api/services', authenticateToken, serviceRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/financial', authenticateToken, financialRoutes);
app.use('/api/vehicles', authenticateToken, vehicleRoutes);
app.use('/api/job-cards', authenticateToken, jobCardRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Wings on Wheels Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
      console.log(`\n🔗 Available endpoints:`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`   Auth: http://localhost:${PORT}/api/auth/login`);
      console.log(`   Vehicles: http://localhost:${PORT}/api/vehicles/makes`);
      console.log(`   VIN Decode: http://localhost:${PORT}/api/vehicles/vin-decode/:vin`);
      console.log(`   Bills: http://localhost:${PORT}/api/bills`);
      console.log(`   Customers: http://localhost:${PORT}/api/customers`);
      console.log(`   Spare Parts: http://localhost:${PORT}/api/spare-parts`);
      console.log(`   Services: http://localhost:${PORT}/api/services`);
      console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard`);
      console.log(`   Financial: http://localhost:${PORT}/api/financial`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server only if run directly
if (require.main === module) {
  startServer();
}

export default app;
