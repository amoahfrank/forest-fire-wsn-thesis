# Web Interface Components

This directory contains the frontend components for the forest fire monitoring system, including React-based user interfaces and web dashboards.

## Contents

### React Components
- **NodeConfigModal.jsx** - Configuration modal for sensor nodes
- **NodeDetails.jsx** - Detailed view of individual sensor nodes
- **NodeList.jsx** - List view of all sensor nodes
- **NodeManager.jsx** - Node management interface
- **NodeMap.js** - Interactive map visualization of sensor network

### Features
- Real-time sensor data visualization
- Interactive network topology mapping
- Node configuration and management
- Alert and notification display
- Historical data analysis

### Dependencies
- React 18.x
- Material-UI components
- Leaflet for mapping
- Chart.js for data visualization
- WebSocket for real-time updates

### Installation
```bash
npm install
npm start
```

### Integration
The web interface communicates with the backend services through:
- REST API endpoints
- WebSocket connections for real-time data
- MQTT broker for sensor data streaming
