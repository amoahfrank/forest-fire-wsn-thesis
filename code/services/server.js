// Forest Fire Detection System - Main API Server
// Express.js application server with comprehensive middleware stack
//
// MSc Thesis Implementation - July 2022
// Author: Frank Amoah

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Import service modules
const NodeService = require('./nodeService');
const MQTTService = require('./mqttService');
const nodeAPI = require('./node-api');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Initialize Express application
const app = express();
const server = http.createServer(app);

// Initialize services
const nodeService = new NodeService();
const mqttService = new MQTTService();

// Application configuration
const PORT = process.env.APP_PORT || 3001;
const HOST = process.env.APP_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'https://forest-fire-monitoring.com'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Request logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '2.1.3',
        environment: NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
            database: nodeService ? 'connected' : 'disconnected',
            mqtt: mqttService && mqttService.isConnected() ? 'connected' : 'disconnected'
        }
    };
    
    res.status(200).json(healthStatus);
});

// API routes
app.use('/api', nodeAPI);

// WebSocket support for real-time updates
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling']
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('subscribe-node', (nodeId) => {
        socket.join(`node-${nodeId}`);
        logger.info(`Client ${socket.id} subscribed to node ${nodeId}`);
    });
    
    socket.on('unsubscribe-node', (nodeId) => {
        socket.leave(`node-${nodeId}`);
        logger.info(`Client ${socket.id} unsubscribed from node ${nodeId}`);
    });
    
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// MQTT event handlers for real-time updates
mqttService.on('message', (topic, data) => {
    if (topic.startsWith('forest-fire/nodes/')) {
        const parts = topic.split('/');
        if (parts.length >= 4) {
            const nodeId = parts[2];
            const messageType = parts[3];
            
            // Emit to subscribers
            io.to(`node-${nodeId}`).emit(`node-${messageType}`, data);
        }
    }
    
    if (topic === 'forest-fire/alerts/dashboard') {
        io.emit('alert', data);
    }
});

// Static file serving (if needed)
if (NODE_ENV === 'development') {
    app.use('/docs', express.static('docs'));
}

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');
    });
    
    // Close database connections
    try {
        if (nodeService) {
            await nodeService.close();
            logger.info('Database connections closed');
        }
        
        if (mqttService) {
            await mqttService.disconnect();
            logger.info('MQTT connection closed');
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Application initialization
async function initializeApplication() {
    try {
        logger.info('Initializing Forest Fire Detection API Server...');
        
        // Initialize database connections
        await nodeService.initialize();
        logger.info('Database services initialized');
        
        // Initialize MQTT connection
        await mqttService.connect();
        logger.info('MQTT service initialized');
        
        // Set up MQTT subscriptions
        await mqttService.subscribe('forest-fire/nodes/+/data');
        await mqttService.subscribe('forest-fire/nodes/+/status');
        await mqttService.subscribe('forest-fire/alerts/+');
        logger.info('MQTT subscriptions established');
        
        // Start the server
        server.listen(PORT, HOST, () => {
            logger.info(`🚀 Forest Fire Detection API Server running on http://${HOST}:${PORT}`);
            logger.info(`📊 Environment: ${NODE_ENV}`);
            logger.info(`🔧 Version: ${process.env.APP_VERSION || '2.1.3'}`);
        });
        
    } catch (error) {
        logger.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    initializeApplication();
}

module.exports = { app, server, io };