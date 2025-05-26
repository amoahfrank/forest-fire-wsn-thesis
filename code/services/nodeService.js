// code/backend/services/nodeService.js
const { MongoClient } = require('mongodb');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const config = require('../config/database-config');

class NodeService {
  constructor() {
    this.mongoClient = null;
    this.mongodb = null;
    this.influxDB = null;
    this.writeApi = null;
    this.queryApi = null;
  }

  async initialize() {
    try {
      // Initialize MongoDB connection
      this.mongoClient = new MongoClient(config.mongodb.url, {
        useUnifiedTopology: true
      });
      await this.mongoClient.connect();
      this.mongodb = this.mongoClient.db(config.mongodb.database);
      console.log('Connected to MongoDB');

      // Initialize InfluxDB connection
      this.influxDB = new InfluxDB({
        url: config.influxdb.url,
        token: config.influxdb.token
      });
      this.writeApi = this.influxDB.getWriteApi(
        config.influxdb.org, 
        config.influxdb.bucket,
        'ms'
      );
      this.queryApi = this.influxDB.getQueryApi(config.influxdb.org);
      console.log('Connected to InfluxDB');

    } catch (error) {
      console.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  async getAllNodes(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.riskLevel !== undefined) {
        query.currentRiskLevel = filters.riskLevel;
      }

      const nodes = await this.mongodb
        .collection('nodes')
        .find(query)
        .limit(filters.limit || 50)
        .skip(filters.offset || 0)
        .sort({ lastSeen: -1 })
        .toArray();

      return nodes;
    } catch (error) {
      console.error('Error fetching nodes:', error);
      throw error;
    }
  }

  async getNodeById(nodeId) {
    try {
      const node = await this.mongodb
        .collection('nodes')
        .findOne({ nodeId });

      if (node) {
        // Get latest sensor reading
        const latestReading = await this.getLatestSensorReading(nodeId);
        node.latestReading = latestReading;
      }

      return node;
    } catch (error) {
      console.error('Error fetching node:', error);
      throw error;
    }
  }

  async storeSensorData(sensorData) {
    try {
      // Store in InfluxDB for time-series analysis
      const point = new Point('sensor_data')
        .tag('nodeId', sensorData.nodeId)
        .floatField('temperature', sensorData.temperature)
        .floatField('humidity', sensorData.humidity)
        .intField('smoke', sensorData.smoke)
        .intField('co', sensorData.co)
        .booleanField('flame', sensorData.flame)
        .floatField('battery', sensorData.battery)
        .floatField('solar', sensorData.solar || 0)
        .intField('riskLevel', sensorData.riskLevel)
        .timestamp(new Date(sensorData.timestamp));

      this.writeApi.writePoint(point);
      await this.writeApi.flush();

      // Store latest reading in MongoDB for quick access
      await this.mongodb
        .collection('sensor_readings')
        .replaceOne(
          { nodeId: sensorData.nodeId },
          {
            nodeId: sensorData.nodeId,
            ...sensorData,
            updatedAt: new Date()
          },
          { upsert: true }
        );

    } catch (error) {
      console.error('Error storing sensor data:', error);
      throw error;
    }
  }

  async getSensorData(nodeId, options = {}) {
    try {
      const limit = options.limit || 100;
      const fromTime = options.from ? new Date(options.from).toISOString() : '-1h';
      const toTime = options.to ? new Date(options.to).toISOString() : 'now()';

      const query = `
        from(bucket: "${config.influxdb.bucket}")
          |> range(start: ${fromTime}, stop: ${toTime})
          |> filter(fn: (r) => r._measurement == "sensor_data")
          |> filter(fn: (r) => r.nodeId == "${nodeId}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: ${limit})
      `;

      const data = [];
      await this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          data.push({
            timestamp: record._time,
            temperature: record.temperature,
            humidity: record.humidity,
            smoke: record.smoke,
            co: record.co,
            flame: record.flame,
            battery: record.battery,
            solar: record.solar,
            riskLevel: record.riskLevel
          });
        },
        error(error) {
          console.error('InfluxDB query error:', error);
        }
      });

      return data;
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      throw error;
    }
  }

  async getLatestSensorReading(nodeId) {
    try {
      const reading = await this.mongodb
        .collection('sensor_readings')
        .findOne({ nodeId });

      return reading;
    } catch (error) {
      console.error('Error fetching latest reading:', error);
      throw error;
    }
  }

  async updateNodeStatus(nodeId, status) {
    try {
      await this.mongodb
        .collection('nodes')
        .updateOne(
          { nodeId },
          {
            $set: {
              ...status,
              updatedAt: new Date()
            },
            $setOnInsert: {
              nodeId,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
    } catch (error) {
      console.error('Error updating node status:', error);
      throw error;
    }
  }

  async updateNodeConfig(nodeId, config) {
    try {
      await this.mongodb
        .collection('nodes')
        .updateOne(
          { nodeId },
          {
            $set: {
              config,
              configUpdatedAt: new Date(),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
    } catch (error) {
      console.error('Error updating node configuration:', error);
      throw error;
    }
  }

  async getNodeCount(filter = {}) {
    try {
      return await this.mongodb
        .collection('nodes')
        .countDocuments(filter);
    } catch (error) {
      console.error('Error counting nodes:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.writeApi) {
        await this.writeApi.close();
      }
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

module.exports = NodeService;