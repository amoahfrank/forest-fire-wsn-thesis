// code/frontend/src/services/nodeService.js
import axios from 'axios';

// API endpoints
const API_BASE_URL = 'http://localhost:3001/api';
const NODES_ENDPOINT = `${API_BASE_URL}/nodes`;

// Fetch all nodes
export const fetchNodes = async () => {
  try {
    const response = await axios.get(NODES_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error('Error fetching nodes:', error);
    throw error;
  }
};

// Fetch a single node by ID
export const fetchNodeById = async (nodeId) => {
  try {
    const response = await axios.get(`${NODES_ENDPOINT}/${nodeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching node ${nodeId}:`, error);
    throw error;
  }
};

// Fetch node history data
export const fetchNodeHistory = async (nodeId, params = {}) => {
  try {
    const response = await axios.get(`${NODES_ENDPOINT}/${nodeId}/history`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching history for node ${nodeId}:`, error);
    throw error;
  }
};

// Update node configuration
export const updateNodeConfig = async (nodeId, config) => {
  try {
    const response = await axios.put(`${NODES_ENDPOINT}/${nodeId}/config`, config);
    return response.data;
  } catch (error) {
    console.error(`Error updating config for node ${nodeId}:`, error);
    throw error;
  }
};

// Restart a node
export const restartNode = async (nodeId) => {
  try {
    const response = await axios.post(`${NODES_ENDPOINT}/${nodeId}/restart`);
    return response.data;
  } catch (error) {
    console.error(`Error restarting node ${nodeId}:`, error);
    throw error;
  }
};

// Put node in calibration mode
export const calibrateNode = async (nodeId, sensorType) => {
  try {
    const response = await axios.post(`${NODES_ENDPOINT}/${nodeId}/calibrate`, { sensorType });
    return response.data;
  } catch (error) {
    console.error(`Error calibrating ${sensorType} sensor for node ${nodeId}:`, error);
    throw error;
  }
};

// Get node alerts
export const fetchNodeAlerts = async (nodeId, params = {}) => {
  try {
    const response = await axios.get(`${NODES_ENDPOINT}/${nodeId}/alerts`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching alerts for node ${nodeId}:`, error);
    throw error;
  }
};

// Update firmware for a node
export const updateNodeFirmware = async (nodeId, firmwareVersion) => {
  try {
    const response = await axios.post(`${NODES_ENDPOINT}/${nodeId}/firmware`, { version: firmwareVersion });
    return response.data;
  } catch (error) {
    console.error(`Error updating firmware for node ${nodeId}:`, error);
    throw error;
  }
};

// Export all node data
export const exportNodeData = async (nodeId, format = 'json', startDate, endDate) => {
  try {
    const response = await axios.get(`${NODES_ENDPOINT}/${nodeId}/export`, {
      params: {
        format,
        startDate,
        endDate
      },
      responseType: 'blob'
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error exporting data for node ${nodeId}:`, error);
    throw error;
  }
};

export default {
  fetchNodes,
  fetchNodeById,
  fetchNodeHistory,
  updateNodeConfig,
  restartNode,
  calibrateNode,
  fetchNodeAlerts,
  updateNodeFirmware,
  exportNodeData
};
