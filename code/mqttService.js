// code/frontend/src/services/mqttService.js
import mqtt from 'mqtt';

// MQTT client connection settings
const MQTT_BROKER_URL = 'ws://localhost:9001'; // WebSocket URL for EMQX broker
const MQTT_OPTIONS = {
  clientId: `wsn-dashboard-${Date.now()}`,
  username: 'wsn-user',
  password: 'wsn-password',
  clean: true,
  reconnectPeriod: 5000, // Reconnect every 5 seconds if connection lost
  connectTimeout: 30000 // Timeout of 30 seconds
};

let client = null;
const subscribers = {};

// Initialize MQTT client
const initializeMqtt = () => {
  if (client) return client;
  
  try {
    client = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);
    
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
    });
    
    client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });
    
    client.on('offline', () => {
      console.warn('MQTT client is offline');
    });
    
    client.on('reconnect', () => {
      console.log('Attempting to reconnect to MQTT broker');
    });
    
    client.on('message', (topic, message) => {
      // Handle received message and dispatch to subscribers
      if (subscribers[topic]) {
        try {
          const parsedMessage = message.toString();
          subscribers[topic].forEach(callback => callback(topic, parsedMessage));
        } catch (error) {
          console.error('Error processing MQTT message:', error);
        }
      }
    });
    
    return client;
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    throw error;
  }
};

// Subscribe to a topic
export const subscribeTopic = (topic, callback) => {
  if (!client) {
    initializeMqtt();
  }
  
  // Add callback to subscribers list
  if (!subscribers[topic]) {
    subscribers[topic] = [];
    // Only subscribe to the topic on the broker if this is the first subscriber
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Error subscribing to ${topic}:`, err);
      } else {
        console.log(`Subscribed to ${topic}`);
      }
    });
  }
  
  subscribers[topic].push(callback);
  
  return () => {
    unsubscribeTopic(topic, callback);
  };
};

// Unsubscribe from a topic
export const unsubscribeTopic = (topic, callback = null) => {
  if (!client || !subscribers[topic]) return;
  
  if (callback) {
    // Remove specific callback
    subscribers[topic] = subscribers[topic].filter(cb => cb !== callback);
  } else {
    // Remove all callbacks
    subscribers[topic] = [];
  }
  
  // If no more subscribers for this topic, unsubscribe from the broker
  if (subscribers[topic].length === 0) {
    client.unsubscribe(topic, (err) => {
      if (err) {
        console.error(`Error unsubscribing from ${topic}:`, err);
      } else {
        console.log(`Unsubscribed from ${topic}`);
      }
    });
    
    delete subscribers[topic];
  }
};

// Publish a message to a topic
export const publishMessage = (topic, message) => {
  if (!client) {
    initializeMqtt();
  }
  
  try {
    const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
    client.publish(topic, messageStr, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error(`Error publishing to ${topic}:`, err);
      }
    });
  } catch (error) {
    console.error('Error publishing MQTT message:', error);
    throw error;
  }
};

// Close MQTT connection
export const closeMqttConnection = () => {
  if (client) {
    client.end(true, () => {
      console.log('MQTT client disconnected');
      client = null;
    });
  }
};

// Initialize client on service import
initializeMqtt();

// Clean up on window unload
window.addEventListener('beforeunload', () => {
  closeMqttConnection();
});

export default {
  subscribeTopic,
  unsubscribeTopic,
  publishMessage,
  closeMqttConnection
};
