// code/backend/src/api/node-api.js
const express = require('express');
const router = express.Router();
const { db, mqtt } = require('../services');
const { validateNodeConfig } = require('../validators/nodeValidator');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/nodes
 * @desc    Get all nodes
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const nodes = await db.getAllNodes();
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Server error fetching nodes' });
  }
});

/**
 * @route   GET /api/nodes/:nodeId
 * @desc    Get a single node by ID
 * @access  Private
 */
router.get('/:nodeId', async (req, res) => {
  try {
    const node = await db.getNodeById(req.params.nodeId);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error(`Error fetching node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error fetching node' });
  }
});

/**
 * @route   GET /api/nodes/:nodeId/history
 * @desc    Get historical data for a node
 * @access  Private
 */
router.get('/:nodeId/history', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const history = await db.getNodeHistory(req.params.nodeId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100
    });
    
    res.json(history);
  } catch (error) {
    console.error(`Error fetching history for node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error fetching node history' });
  }
});

/**
 * @route   PUT /api/nodes/:nodeId/config
 * @desc    Update node configuration
 * @access  Private
 */
router.put('/:nodeId/config', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const config = req.body;
    
    // Validate config
    const { error } = validateNodeConfig(config);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Get the current node to check if it exists
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Update configuration in database
    await db.updateNodeConfig(nodeId, config);
    
    // Send configuration update over MQTT
    const topic = `wsn/nodes/${nodeId}/config`;
    await mqtt.publish(topic, JSON.stringify(config));
    
    res.json({ success: true, message: 'Node configuration updated' });
  } catch (error) {
    console.error(`Error updating config for node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error updating node configuration' });
  }
});

/**
 * @route   POST /api/nodes/:nodeId/restart
 * @desc    Restart a node
 * @access  Private
 */
router.post('/:nodeId/restart', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    
    // Check if node exists
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Send restart command over MQTT
    const topic = `wsn/nodes/${nodeId}/command`;
    await mqtt.publish(topic, JSON.stringify({ command: 'restart' }));
    
    res.json({ success: true, message: 'Restart command sent to node' });
  } catch (error) {
    console.error(`Error restarting node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error restarting node' });
  }
});

/**
 * @route   POST /api/nodes/:nodeId/calibrate
 * @desc    Put node in calibration mode
 * @access  Private
 */
router.post('/:nodeId/calibrate', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { sensorType } = req.body;
    
    // Validate sensor type
    const validSensorTypes = ['temperature', 'humidity', 'smoke', 'co'];
    if (!sensorType || !validSensorTypes.includes(sensorType)) {
      return res.status(400).json({ error: 'Invalid sensor type' });
    }
    
    // Check if node exists
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Send calibration command over MQTT
    const topic = `wsn/nodes/${nodeId}/command`;
    await mqtt.publish(topic, JSON.stringify({ 
      command: 'calibrate',
      sensor: sensorType
    }));
    
    res.json({ 
      success: true, 
      message: `Calibration command sent for ${sensorType} sensor` 
    });
  } catch (error) {
    console.error(`Error calibrating node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error calibrating node' });
  }
});

/**
 * @route   GET /api/nodes/:nodeId/alerts
 * @desc    Get alerts for a node
 * @access  Private
 */
router.get('/:nodeId/alerts', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    
    const alerts = await db.getNodeAlerts(req.params.nodeId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50
    });
    
    res.json(alerts);
  } catch (error) {
    console.error(`Error fetching alerts for node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error fetching node alerts' });
  }
});

/**
 * @route   POST /api/nodes/:nodeId/firmware
 * @desc    Update node firmware
 * @access  Private
 */
router.post('/:nodeId/firmware', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Firmware version is required' });
    }
    
    // Check if node exists
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Check if firmware exists
    const firmware = await db.getFirmwareByVersion(version);
    if (!firmware) {
      return res.status(404).json({ error: 'Firmware version not found' });
    }
    
    // Send firmware update command over MQTT
    const topic = `wsn/nodes/${nodeId}/command`;
    await mqtt.publish(topic, JSON.stringify({ 
      command: 'update_firmware',
      version: version,
      url: firmware.url
    }));
    
    // Update node firmware status in database
    await db.updateNodeFirmwareStatus(nodeId, {
      targetVersion: version,
      updateStarted: new Date(),
      status: 'pending'
    });
    
    res.json({ 
      success: true, 
      message: `Firmware update initiated to version ${version}` 
    });
  } catch (error) {
    console.error(`Error updating firmware for node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error updating node firmware' });
  }
});

/**
 * @route   GET /api/nodes/:nodeId/export
 * @desc    Export node data
 * @access  Private
 */
router.get('/:nodeId/export', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { format, startDate, endDate } = req.query;
    
    // Validate format
    const validFormats = ['json', 'csv'];
    if (!format || !validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use json or csv' });
    }
    
    // Check if node exists
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Get node data
    const data = await db.getNodeHistory(nodeId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 10000 // Reasonable limit for exports
    });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=node_${nodeId}_data.json`);
      return res.json(data);
    } else {
      // Convert to CSV format
      const { Parser } = require('json2csv');
      
      // Define fields for CSV
      const fields = [
        'timestamp', 
        'temperature', 
        'humidity', 
        'smoke', 
        'co', 
        'flameDetected',
        'battery',
        'solarVoltage',
        'rssi'
      ];
      
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=node_${nodeId}_data.csv`);
      return res.send(csv);
    }
  } catch (error) {
    console.error(`Error exporting data for node ${req.params.nodeId}:`, error);
    res.status(500).json({ error: 'Server error exporting node data' });
  }
});

module.exports = router;
