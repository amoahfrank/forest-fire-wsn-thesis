// code/backend/services/mqttService.js
const mqtt = require('mqtt');
const EventEmitter = require('events');
const config = require('../config/mqtt-config');

class MQTTService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async connect() {
    try {
      const options = {
        clientId: `forest-fire-gateway-${Math.random().toString(16).substr(2, 8)}`,
        username: config.username,
        password: config.password,
        keepalive: 60,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
          topic: 'forest-fire/gateway/status',
          payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
          qos: 1,
          retain: true
        }
      };

      this.client = mqtt.connect(config.brokerUrl, options);

      this.client.on('connect', () => {
        console.log('Connected to MQTT broker');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Publish gateway online status
        this.publish('forest-fire/gateway/status', {
          status: 'online',
          timestamp: Date.now()
        }, { qos: 1, retain: true });
        
        // Re-establish subscriptions
        this.resubscribeAll();
      });

      this.client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          this.emit('message', topic, data);
          
          // Emit specific topic events
          if (this.subscriptions.has(topic)) {
            const callback = this.subscriptions.get(topic);
            if (callback) callback(data);
          }
        } catch (error) {
          console.error('Error parsing MQTT message:', error);
        }
      });

      this.client.on('error', (error) => {
        console.error('MQTT connection error:', error);
        this.emit('error', error);
      });

      this.client.on('close', () => {
        console.log('MQTT connection closed');
        this.connected = false;
        this.emit('disconnected');
      });

      this.client.on('offline', () => {
        console.log('MQTT client offline');
        this.connected = false;
        this.emit('offline');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`MQTT reconnect attempt ${this.reconnectAttempts}`);
        
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error('Max reconnect attempts reached');
          this.client.end();
        }
      });

    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.connected) {
      // Publish gateway offline status
      await this.publish('forest-fire/gateway/status', {
        status: 'offline',
        timestamp: Date.now()
      }, { qos: 1, retain: true });
      
      this.client.end();
    }
  }

  async subscribe(topic, callback = null, options = { qos: 1 }) {
    if (!this.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, options, (error) => {
        if (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Subscribed to ${topic}`);
          this.subscriptions.set(topic, callback);
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic) {
    if (!this.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error);
          reject(error);
        } else {
          console.log(`Unsubscribed from ${topic}`);
          this.subscriptions.delete(topic);
          resolve();
        }
      });
    });
  }

  async publish(topic, payload, options = { qos: 1 }) {
    if (!this.connected) {
      throw new Error('MQTT client not connected');
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, options, (error) => {
        if (error) {
          console.error(`Failed to publish to ${topic}:`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  resubscribeAll() {
    for (const [topic, callback] of this.subscriptions) {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Failed to resubscribe to ${topic}:`, error);
        } else {
          console.log(`Resubscribed to ${topic}`);
        }
      });
    }
  }

  isConnected() {
    return this.connected;
  }

  getClient() {
    return this.client;
  }
}

module.exports = MQTTService;