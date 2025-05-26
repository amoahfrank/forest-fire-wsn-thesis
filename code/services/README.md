# Backend Services and API Components

This directory contains the server-side components and API implementations for the forest fire detection system, enabling communication between sensor nodes, data processing services, and frontend interfaces.

## Service Architecture Overview

The backend architecture follows a microservices approach, with distinct service modules handling specialized functions within the IoT ecosystem:

### Core Service Components

#### MQTT Service (`mqttService.js`)
- **Purpose**: Message queuing and broker functionality for sensor data transmission
- **Protocol**: MQTT v3.1.1 with QoS levels 0-2 support
- **Features**: 
  - Topic-based message routing
  - Connection persistence and recovery
  - Payload validation and processing

#### Node API Service (`node-api.js`)
- **Purpose**: RESTful API for sensor node management and configuration
- **Endpoints**: CRUD operations for node registration, status updates, and configuration management
- **Authentication**: Token-based authentication with JWT implementation

#### Node Service (`nodeService.js`)
- **Purpose**: Business logic layer for sensor node operations
- **Functionality**: 
  - Node lifecycle management
  - Data validation and processing
  - Integration with database persistence layer

### Technical Specifications

- **Runtime Environment**: Node.js v16.x+
- **Database Integration**: MongoDB for node metadata, InfluxDB for time-series data
- **Communication Protocols**: HTTP/HTTPS, MQTT, WebSocket
- **Security**: TLS encryption, JWT tokens, API rate limiting

### Service Integration

The services operate within a distributed architecture, communicating through:
- Message queues for asynchronous data processing
- REST API calls for synchronous operations
- Event-driven notifications for alert propagation

### Deployment Considerations

Services are containerized using Docker for consistent deployment across development, testing, and production environments. Load balancing and service discovery are implemented through Docker Compose orchestration.
