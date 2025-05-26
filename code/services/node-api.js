// code/backend/api/node-api.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const NodeService = require('./nodeService');
const MQTTService = require('./mqttService');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const router = express.Router();
const nodeService = new NodeService();
const mqttService = new MQTTService();

// Security middleware
router.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
router.use(limiter);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/nodes - Get all sensor nodes
router.get('/nodes', 
  query('status').optional().isIn(['online', 'offline', 'warning', 'maintenance']),
  query('riskLevel').optional().isInt({ min: 0, max: 5 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        riskLevel: req.query.riskLevel ? parseInt(req.query.riskLevel) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
      
      const nodes = await nodeService.getAllNodes(filters);
      res.json(nodes);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/nodes/:nodeId - Get specific node details
router.get('/nodes/:nodeId',
  param('nodeId').isLength({ min: 8, max: 8 }).matches(/^[A-Fa-f0-9]{8}$/),
  handleValidationErrors,
  async (req, res) => {
    try {
      const node = await nodeService.getNodeById(req.params.nodeId);
      
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      
      res.json(node);
    } catch (error) {
      console.error('Error fetching node:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/nodes/:nodeId/data - Receive sensor data from node
router.post('/nodes/:nodeId/data',
  param('nodeId').isLength({ min: 8, max: 8 }).matches(/^[A-Fa-f0-9]{8}$/),
  body('temperature').isFloat({ min: -40, max: 125 }),
  body('humidity').isFloat({ min: 0, max: 100 }),
  body('smoke').isInt({ min: 0, max: 10000 }),
  body('co').isInt({ min: 0, max: 1000 }),
  body('flame').isBoolean(),
  body('battery').isFloat({ min: 0, max: 5 }),
  body('solar').optional().isFloat({ min: 0, max: 25 }),
  body('riskLevel').isInt({ min: 0, max: 5 }),
  body('timestamp').isISO8601(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const sensorData = {
        nodeId: req.params.nodeId,
        ...req.body,
        receivedAt: new Date().toISOString()
      };
      
      // Store sensor data
      await nodeService.storeSensorData(sensorData);
      
      // Update node status
      await nodeService.updateNodeStatus(req.params.nodeId, {
        lastSeen: sensorData.receivedAt,
        status: 'online',
        currentRiskLevel: sensorData.riskLevel,
        batteryLevel: Math.round((sensorData.battery / 4.2) * 100),
        solarVoltage: sensorData.solar || 0
      });
      
      // Publish to MQTT for real-time updates
      if (mqttService.isConnected()) {
        await mqttService.publish(`forest-fire/nodes/${req.params.nodeId}/data`, sensorData);
        
        // Send alert if risk level is elevated
        if (sensorData.riskLevel >= 2) {
          await mqttService.publish('forest-fire/alerts', {
            type: 'fire-risk',
            nodeId: req.params.nodeId,
            riskLevel: sensorData.riskLevel,
            timestamp: sensorData.timestamp,
            sensorData: sensorData
          });
        }
      }
      
      res.status(201).json({ message: 'Data received successfully' });
    } catch (error) {
      console.error('Error storing sensor data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/nodes/:nodeId/data - Get historical sensor data
router.get('/nodes/:nodeId/data',
  param('nodeId').isLength({ min: 8, max: 8 }).matches(/^[A-Fa-f0-9]{8}$/),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
        from: req.query.from,
        to: req.query.to
      };
      
      const data = await nodeService.getSensorData(req.params.nodeId, options);
      res.json(data);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/nodes/:nodeId/config - Update node configuration
router.put('/nodes/:nodeId/config',
  param('nodeId').isLength({ min: 8, max: 8 }).matches(/^[A-Fa-f0-9]{8}$/),
  body('name').optional().isLength({ min: 1, max: 50 }),
  body('sampleInterval').optional().isInt({ min: 10, max: 3600 }),
  body('transmitInterval').optional().isInt({ min: 60, max: 86400 }),
  body('thresholds.temperature').optional().isFloat({ min: 30, max: 100 }),
  body('thresholds.humidity').optional().isFloat({ min: 0, max: 100 }),
  body('thresholds.smoke').optional().isInt({ min: 0 }),
  body('thresholds.co').optional().isInt({ min: 0 }),
  body('lowPowerMode').optional().isBoolean(),
  body('alertEnabled').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const config = req.body;
      
      // Update node configuration
      await nodeService.updateNodeConfig(req.params.nodeId, config);
      
      // Send configuration update to node via MQTT
      if (mqttService.isConnected()) {
        await mqttService.publish(`forest-fire/nodes/${req.params.nodeId}/config`, config);
      }
      
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Error updating node configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/nodes/:nodeId/commands - Send command to node
router.post('/nodes/:nodeId/commands',
  param('nodeId').isLength({ min: 8, max: 8 }).matches(/^[A-Fa-f0-9]{8}$/),
  body('command').isIn(['restart', 'calibrate', 'test-sensors', 'reset-config']),
  body('parameters').optional().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { command, parameters } = req.body;
      
      // Send command to node via MQTT
      if (mqttService.isConnected()) {
        await mqttService.publish(`forest-fire/nodes/${req.params.nodeId}/commands`, {
          command,
          parameters: parameters || {},
          timestamp: new Date().toISOString()
        });
        
        res.json({ message: 'Command sent successfully' });
      } else {
        res.status(503).json({ error: 'MQTT service unavailable' });
      }
    } catch (error) {
      console.error('Error sending command:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/system/status - Get system status
router.get('/system/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      mqtt: {
        connected: mqttService.isConnected()
      },
      nodes: {
        total: await nodeService.getNodeCount(),
        online: await nodeService.getNodeCount({ status: 'online' }),
        offline: await nodeService.getNodeCount({ status: 'offline' }),
        alerts: await nodeService.getNodeCount({ riskLevel: { $gte: 2 } })
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;