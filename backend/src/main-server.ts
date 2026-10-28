import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env and .env.local from current dir and root
const envFiles = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env.local'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

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
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed) allowedOrigins.push(trimmed);
  });
}

// Enable CORS before other middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    // Allow any Vercel deployment (production domain, preview URLs, etc.)
    if (cleanOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow Render domains
    if (cleanOrigin.endsWith('.onrender.com')) {
      return callback(null, true);
    }

    // Allow local development
    if (cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow configured origins
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Dynamic reflection: allow any origin to avoid blocking legitimate frontend requests
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204
}));

// Preflight handler for all routes
app.options('*', cors());

// Helmet security headers (with cross-origin resource policy enabled for API consumers)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection (Protected)
app.get('/api/test-db', authenticateToken, async (req, res) => {
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

// Neon Services Status & Diagnostics (Protected)
app.get('/api/neon/status', authenticateToken, async (req, res) => {
  try {
    const dbTest = await pool.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables_count
    `);

    res.json({
      status: 'ONLINE',
      neonBranch: process.env.NEON_BRANCH || 'production',
      services: {
        postgres: {
          status: 'CONNECTED',
          database: dbTest.rows[0].database,
          user: dbTest.rows[0].user,
          tablesCount: parseInt(dbTest.rows[0].tables_count, 10),
          isPooled: Boolean(process.env.DATABASE_URL?.includes('-pooler')),
          version: dbTest.rows[0].version
        },
        auth: {
          status: process.env.NEON_AUTH_BASE_URL ? 'CONFIGURED' : 'UNCONFIGURED',
          baseUrl: process.env.NEON_AUTH_BASE_URL || null,
          jwksUrl: process.env.NEON_AUTH_JWKS_URL || null
        },
        realtime: {
          status: process.env.NEON_REALTIME_URL ? 'CONFIGURED' : 'UNCONFIGURED',
          url: process.env.NEON_REALTIME_URL || null
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
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
