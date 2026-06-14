const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth.routes');
const groupRoutes = require('./routes/group.routes');
const expenseRoutes = require('./routes/expense.routes');
const settlementRoutes = require('./routes/settlement.routes');
const importRoutes = require('./routes/import.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Group-scoped handlers
const { groupScoped: expenseGroupScoped } = require('./routes/expense.routes');
const { groupScoped: settlementGroupScoped } = require('./routes/settlement.routes');
const { groupScoped: importGroupScoped } = require('./routes/import.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Group-scoped expense routes
app.post('/api/groups/:groupId/expenses', auth, expenseGroupScoped.createExpense);
app.get('/api/groups/:groupId/expenses', auth, expenseGroupScoped.getExpenses);

// Group-scoped settlement routes
app.post('/api/groups/:groupId/settlements', auth, settlementGroupScoped.createSettlement);
app.get('/api/groups/:groupId/settlements', auth, settlementGroupScoped.getSettlements);

// Group-scoped import route
app.post('/api/groups/:groupId/import', auth, ...importGroupScoped.uploadCSV);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
