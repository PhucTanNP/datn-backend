const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
//hello
// Import routes
const authRoutes       = require('./api/v1/routes/auth.routes');
const productRoutes    = require('./api/v1/routes/product.routes');
const categoriesRoutes = require('./api/v1/routes/categories.routes');
const orderRoutes      = require('./api/v1/routes/order.routes');
const paymentRoutes    = require('./api/v1/routes/payment.routes');
const inspectionRoutes = require('./api/v1/routes/inspection.routes');
const adminRoutes      = require('./api/v1/routes/admin.routes');

// Import middleware
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth',       authRoutes);
app.use('/api/v1/products',   productRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/orders',     orderRoutes);
app.use('/api/v1/payments',   paymentRoutes);
app.use('/api/v1/inspect',    inspectionRoutes);
app.use('/api/v1/admin',      adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorMiddleware);

module.exports = app;
