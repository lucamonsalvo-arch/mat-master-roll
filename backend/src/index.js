require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const studentsRoutes   = require('./routes/students');
const schedulesRoutes  = require('./routes/schedules');
const attendanceRoutes = require('./routes/attendance');
const paymentsRoutes   = require('./routes/payments');
const financesRoutes   = require('./routes/finances');
const accessRoutes     = require('./routes/access');
const reportsRoutes    = require('./routes/reports');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

// Raw body needed for MercadoPago webhook signature validation
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);

app.use('/api/auth',       authRoutes);
app.use('/api/students',   studentsRoutes);
app.use('/api/schedules',  schedulesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments',   paymentsRoutes);
app.use('/api/finances',   financesRoutes);
app.use('/api/access',     accessRoutes);
app.use('/api/reports',   reportsRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Mat Master Roll API running on :${PORT}`));
