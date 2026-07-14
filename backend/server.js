require('dotenv').config();
require('express-async-errors'); // Global async error handling — no try/catch needed in controllers

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');
const requestLogger = require('./middleware/requestLogger');

const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const templateRoutes = require('./routes/templateRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const logRoutes = require('./routes/logRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const testRoutes = require('./routes/testRoutes');
const metaRoutes = require('./routes/metaRoutes');
const watiRoutes = require('./routes/watiRoutes');
const inboxRoutes = require('./routes/inboxRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const automationRoutes = require('./routes/automationRoutes');
const { startDeliveryTimeoutJob } = require('./services/deliveryTimeoutJob');

const app = express();
const server = http.createServer(app);

// ── CORS Configuration ───────────────────────────────────────────────────────
// Use explicit allowlist — never a wildcard regex open to subdomain takeover
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server (no origin) and explicitly listed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://graph.facebook.com'],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some fetch patterns
}));

app.use(cors(corsOptions));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Global limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again later' },
});

// Stricter limit for auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts — please try again later' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    if (req.path.includes('/webhooks/')) {
      req.rawBody = buf.toString('utf8');
    }
  },
  limit: '10mb',
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger ─────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Socket.io Setup ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io available to all route handlers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Subscribe to campaign-specific updates (join a room)
  socket.on('subscribe:campaign', (campaignId) => {
    if (campaignId) {
      socket.join(`campaign:${campaignId}`);
      console.log(`[Socket] ${socket.id} subscribed to campaign:${campaignId}`);
    }
  });

  // Subscribe to log status updates (all users on Logs page)
  socket.on('subscribe:logs', () => {
    socket.join('logs');
    console.log(`[Socket] ${socket.id} subscribed to logs`);
  });

  socket.on('subscribe:inbox', () => {
    socket.join('inbox');
    console.log(`[Socket] ${socket.id} subscribed to inbox`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/test-whatsapp', testRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/wati', watiRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/automation', automationRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
// express-async-errors funnels all thrown async errors here automatically
app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  console.error(
    JSON.stringify({
      level: 'ERROR',
      type: 'unhandled_error',
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    })
  );

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Server Startup ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();

    server.listen(PORT, () => {
      console.log(
        JSON.stringify({
          level: 'INFO',
          type: 'server_start',
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          allowedOrigins,
          timestamp: new Date().toISOString(),
        })
      );
      
      // Print registered auth routes for debugging
      console.log('\n--- Registered Authentication Routes ---');
      const authRoutes = app._router.stack.find(r => r.name === 'router' && r.regexp.test('/api/auth'));
      if (authRoutes) {
        authRoutes.handle.stack.forEach((layer) => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
            console.log(`${methods} /api/auth${layer.route.path}`);
          }
        });
      } else {
        console.log('WARNING: /api/auth routes are NOT registered.');
      }
      console.log('----------------------------------------\n');

      startDeliveryTimeoutJob();
    });
  } catch (error) {
    console.error(`[Startup] Failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
