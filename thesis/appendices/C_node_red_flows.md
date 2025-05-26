# Appendix C: Node-RED Flow Configurations

## C.1 Introduction

This appendix provides comprehensive documentation of the Node-RED flow configurations used in the forest fire detection system's cloud analytics platform. Node-RED serves as the central data processing and workflow orchestration engine, handling data ingestion, processing, alert generation, and dashboard integration.

## C.2 System Architecture Overview

### C.2.1 Node-RED Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Node-RED Flow Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│  Data Ingestion Layer                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   MQTT In    │ │   HTTP In    │ │    LoRa Gateway         │ │
│  │  (Sensors)   │ │ (REST API)   │ │     Interface           │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Data Processing Layer                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   Parser     │ │  Validator   │ │    Data Enrichment      │ │
│  │              │ │              │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Analytics Layer                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │Fire Detection│ │   Alerting   │ │    ML Processing        │ │
│  │  Algorithm   │ │    Engine    │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Data Storage Layer                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │  InfluxDB    │ │   MongoDB    │ │      File System        │ │
│  │ (Time Series)│ │ (Documents)  │ │    (Logs/Reports)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Output Layer                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   Dashboard  │ │   Email      │ │        SMS              │ │
│  │   (Grafana)  │ │   Alerts     │ │       Alerts            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## C.3 Core Flow Configurations

### C.3.1 Main Data Ingestion Flow

**Flow Name:** `sensor-data-ingestion`
**Description:** Handles incoming sensor data from LoRa gateway and MQTT sources

```json
[
    {
        "id": "mqtt-sensor-input",
        "type": "mqtt in",
        "z": "main-flow",
        "name": "Sensor Data MQTT",
        "topic": "forest-fire-wsn/nodes/+/sensors/+",
        "qos": "1",
        "datatype": "json",
        "broker": "mqtt-broker-config",
        "nl": false,
        "rap": true,
        "rh": 0,
        "x": 120,
        "y": 80,
        "wires": [["data-parser"]]
    },
    {
        "id": "lora-gateway-input",
        "type": "http in",
        "z": "main-flow",
        "name": "LoRa Gateway HTTP",
        "url": "/api/lora/data",
        "method": "post",
        "upload": false,
        "swaggerDoc": "",
        "x": 120,
        "y": 140,
        "wires": [["data-parser"]]
    },
    {
        "id": "data-parser",
        "type": "function",
        "z": "main-flow",
        "name": "Parse Sensor Data",
        "func": "// Parse incoming sensor data\nlet payload = msg.payload;\nlet nodeId = '';\nlet sensorType = '';\n\n// Extract node ID and sensor type from topic (MQTT) or payload (HTTP)\nif (msg.topic) {\n    const topicParts = msg.topic.split('/');\n    nodeId = topicParts[2];\n    sensorType = topicParts[4];\n} else if (payload.nodeId) {\n    nodeId = payload.nodeId;\n    sensorType = 'multi';\n}\n\n// Validate and structure data\nif (!nodeId) {\n    node.error('Invalid node ID', msg);\n    return null;\n}\n\n// Create standardized message structure\nlet processedMsg = {\n    payload: {\n        nodeId: nodeId,\n        sensorType: sensorType,\n        timestamp: payload.timestamp || Date.now(),\n        data: payload,\n        source: msg.topic ? 'mqtt' : 'http'\n    },\n    topic: `processed/${nodeId}/${sensorType}`\n};\n\n// Add GPS coordinates if available\nif (payload.latitude && payload.longitude) {\n    processedMsg.payload.location = {\n        lat: payload.latitude,\n        lon: payload.longitude\n    };\n}\n\nreturn processedMsg;",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 340,
        "y": 110,
        "wires": [["data-validator"]]
    }
]
```

### C.3.2 Data Validation and Enrichment Flow

```json
[
    {
        "id": "data-validator",
        "type": "function",
        "z": "main-flow",
        "name": "Validate Data",
        "func": "// Data validation rules\nconst validationRules = {\n    temperature: { min: -50, max: 100 },\n    humidity: { min: 0, max: 100 },\n    smokePPM: { min: 0, max: 10000 },\n    coPPM: { min: 0, max: 1000 },\n    batteryVoltage: { min: 2.5, max: 4.2 }\n};\n\nlet data = msg.payload.data;\nlet validationErrors = [];\n\n// Validate each sensor reading\nfor (const [field, value] of Object.entries(data)) {\n    if (validationRules[field]) {\n        const rule = validationRules[field];\n        if (value < rule.min || value > rule.max) {\n            validationErrors.push(`${field}: ${value} out of range [${rule.min}, ${rule.max}]`);\n        }\n    }\n}\n\n// Check for missing critical fields\nconst requiredFields = ['temperature', 'humidity', 'timestamp'];\nfor (const field of requiredFields) {\n    if (!(field in data)) {\n        validationErrors.push(`Missing required field: ${field}`);\n    }\n}\n\n// Add validation result to message\nmsg.payload.validation = {\n    valid: validationErrors.length === 0,\n    errors: validationErrors,\n    timestamp: Date.now()\n};\n\n// Store raw data for debugging if validation fails\nif (validationErrors.length > 0) {\n    node.warn(`Validation errors for node ${msg.payload.nodeId}: ${validationErrors.join(', ')}`);\n    // Send to error handling flow\n    node.send([null, msg]);\n} else {\n    // Send to processing flow\n    node.send([msg, null]);\n}\n\nreturn null;",
        "outputs": 2,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 560,
        "y": 110,
        "wires": [["data-enrichment"], ["error-handler"]]
    },
    {
        "id": "data-enrichment",
        "type": "function",
        "z": "main-flow",
        "name": "Enrich Data",
        "func": "// Data enrichment with calculated fields\nlet data = msg.payload.data;\nlet enrichedData = { ...data };\n\n// Calculate derived metrics\nenrichedData.heatIndex = calculateHeatIndex(data.temperature, data.humidity);\nenrichedData.dewPoint = calculateDewPoint(data.temperature, data.humidity);\nenrichedData.fireRiskScore = calculateFireRisk(data);\n\n// Add node metadata\nenrichedData.nodeMetadata = flow.get(`node_${msg.payload.nodeId}`) || {\n    location: 'Unknown',\n    installDate: '2022-01-01',\n    lastCalibration: '2022-01-01'\n};\n\n// Function definitions\nfunction calculateHeatIndex(temp, humidity) {\n    if (temp < 27) return temp; // Heat index only relevant above 27°C\n    \n    const T = temp;\n    const RH = humidity;\n    \n    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));\n    \n    if (HI >= 80) {\n        HI = -42.379 + 2.04901523 * T + 10.14333127 * RH\n             - 0.22475541 * T * RH - 0.00683783 * T * T\n             - 0.05481717 * RH * RH + 0.00122874 * T * T * RH\n             + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;\n    }\n    \n    return Math.round(HI * 10) / 10;\n}\n\nfunction calculateDewPoint(temp, humidity) {\n    const a = 17.27;\n    const b = 237.7;\n    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);\n    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;\n}\n\nfunction calculateFireRisk(data) {\n    let riskScore = 0;\n    \n    // Temperature component (weight: 0.25)\n    if (data.temperature > 30) {\n        riskScore += Math.min((data.temperature - 30) / 50, 1.0) * 0.25;\n    }\n    \n    // Humidity component (weight: 0.15) - inverse relationship\n    if (data.humidity < 60) {\n        riskScore += (60 - data.humidity) / 60 * 0.15;\n    }\n    \n    // Smoke component (weight: 0.35)\n    if (data.smokePPM > 100) {\n        riskScore += Math.min(Math.log10(data.smokePPM / 100) / 2, 1.0) * 0.35;\n    }\n    \n    // CO component (weight: 0.15)\n    if (data.coPPM > 10) {\n        riskScore += Math.min((data.coPPM - 10) / 200, 1.0) * 0.15;\n    }\n    \n    // Flame detection component (weight: 0.10)\n    if (data.flameDetected) {\n        riskScore += 1.0 * 0.10;\n    }\n    \n    return Math.round(Math.min(riskScore, 1.0) * 1000) / 1000;\n}\n\n// Update message with enriched data\nmsg.payload.data = enrichedData;\nmsg.payload.processed = true;\nmsg.payload.processingTimestamp = Date.now();\n\nreturn msg;",
        "outputs": 1,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 780,
        "y": 80,
        "wires": [["fire-detection-engine", "data-storage"]]
    }
]
```

## C.4 Fire Detection and Alert Processing

### C.4.1 Fire Detection Engine Flow

```json
[
    {
        "id": "fire-detection-engine",
        "type": "function",
        "z": "alert-flow",
        "name": "Fire Detection Engine",
        "func": "// Advanced fire detection algorithm\nconst data = msg.payload.data;\nconst nodeId = msg.payload.nodeId;\n\n// Get historical data for trend analysis\nconst historicalData = flow.get(`history_${nodeId}`) || [];\n\n// Current risk assessment\nconst currentRisk = data.fireRiskScore;\n\n// Trend analysis\nlet trendMultiplier = 1.0;\nif (historicalData.length >= 3) {\n    const recent = historicalData.slice(-3).map(d => d.fireRiskScore);\n    const trend = (recent[2] - recent[0]) / 2; // Simple linear trend\n    \n    if (trend > 0.1) {\n        trendMultiplier = 1.3; // Escalating risk\n    } else if (trend < -0.1) {\n        trendMultiplier = 0.8; // Diminishing risk\n    }\n}\n\n// Spatial correlation (if multiple nodes nearby)\nconst nearbyNodes = flow.get('nearby_nodes') || {};\nlet spatialMultiplier = 1.0;\n\nif (nearbyNodes[nodeId]) {\n    const neighbors = nearbyNodes[nodeId];\n    let neighborRiskSum = 0;\n    let neighborCount = 0;\n    \n    for (const neighborId of neighbors) {\n        const neighborData = flow.get(`current_${neighborId}`);\n        if (neighborData && neighborData.fireRiskScore) {\n            neighborRiskSum += neighborData.fireRiskScore;\n            neighborCount++;\n        }\n    }\n    \n    if (neighborCount > 0) {\n        const avgNeighborRisk = neighborRiskSum / neighborCount;\n        if (avgNeighborRisk > 0.3) {\n            spatialMultiplier = 1.2; // Nearby elevated risk\n        }\n    }\n}\n\n// Calculate final risk score\nconst finalRiskScore = Math.min(currentRisk * trendMultiplier * spatialMultiplier, 1.0);\n\n// Determine alert level\nlet alertLevel = 0;\nlet alertMessage = '';\n\nif (finalRiskScore >= 0.9) {\n    alertLevel = 4; // Critical\n    alertMessage = 'CRITICAL FIRE RISK DETECTED';\n} else if (finalRiskScore >= 0.7) {\n    alertLevel = 3; // High\n    alertMessage = 'HIGH FIRE RISK DETECTED';\n} else if (finalRiskScore >= 0.5) {\n    alertLevel = 2; // Moderate\n    alertMessage = 'MODERATE FIRE RISK DETECTED';\n} else if (finalRiskScore >= 0.3) {\n    alertLevel = 1; // Low\n    alertMessage = 'ELEVATED FIRE RISK DETECTED';\n} else {\n    alertLevel = 0; // Normal\n    alertMessage = 'Normal conditions';\n}\n\n// Update historical data\nhistoricalData.push({\n    timestamp: data.timestamp,\n    fireRiskScore: finalRiskScore,\n    temperature: data.temperature,\n    humidity: data.humidity,\n    smokePPM: data.smokePPM\n});\n\n// Keep only last 100 readings\nif (historicalData.length > 100) {\n    historicalData.shift();\n}\n\nflow.set(`history_${nodeId}`, historicalData);\nflow.set(`current_${nodeId}`, data);\n\n// Check if alert level changed\nconst lastAlertLevel = flow.get(`alert_level_${nodeId}`) || 0;\nconst alertChanged = alertLevel !== lastAlertLevel;\n\nif (alertChanged) {\n    flow.set(`alert_level_${nodeId}`, alertLevel);\n    \n    // Create alert message\n    const alertPayload = {\n        nodeId: nodeId,\n        alertLevel: alertLevel,\n        message: alertMessage,\n        riskScore: finalRiskScore,\n        currentReading: data,\n        timestamp: Date.now(),\n        location: data.nodeMetadata ? data.nodeMetadata.location : 'Unknown',\n        coordinates: msg.payload.location || null\n    };\n    \n    // Send to alert processing\n    if (alertLevel > 0) {\n        node.send([{ payload: alertPayload }, null]);\n    } else {\n        node.send([null, { payload: { nodeId, status: 'normal' }}]);\n    }\n} else {\n    // No alert change, send status update\n    node.send([null, { payload: { nodeId, status: 'monitoring', riskScore: finalRiskScore }}]);\n}\n\nreturn null;",
        "outputs": 2,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 200,
        "y": 200,
        "wires": [["alert-processor"], ["status-logger"]]
    }
]
```

### C.4.2 Alert Processing and Distribution Flow

```json
[
    {
        "id": "alert-processor",
        "type": "function",
        "z": "alert-flow",
        "name": "Alert Processor",
        "func": "// Alert processing and distribution logic\nconst alert = msg.payload;\nconst alertLevel = alert.alertLevel;\nconst nodeId = alert.nodeId;\n\n// Rate limiting - prevent spam alerts\nconst lastAlertTime = flow.get(`last_alert_${nodeId}`) || 0;\nconst minAlertInterval = alertLevel >= 3 ? 60000 : 300000; // 1 min for high/critical, 5 min for others\n\nif (Date.now() - lastAlertTime < minAlertInterval) {\n    node.warn(`Alert rate limited for node ${nodeId}`);\n    return null;\n}\n\nflow.set(`last_alert_${nodeId}`, Date.now());\n\n// Store alert in database\nconst alertRecord = {\n    ...alert,\n    id: `${nodeId}_${Date.now()}`,\n    acknowledged: false,\n    responseTime: null\n};\n\n// Prepare different alert formats\nconst outputs = [];\n\n// 1. Email alert (for moderate and above)\nif (alertLevel >= 2) {\n    const emailMsg = {\n        topic: 'Forest Fire Alert',\n        payload: {\n            to: flow.get('alert_email_recipients') || ['admin@forestfire.com'],\n            subject: `${alert.message} - Node ${nodeId}`,\n            html: generateEmailHTML(alert)\n        }\n    };\n    outputs[0] = emailMsg;\n}\n\n// 2. SMS alert (for high and critical)\nif (alertLevel >= 3) {\n    const smsMsg = {\n        payload: {\n            to: flow.get('alert_sms_recipients') || ['+1234567890'],\n            body: `URGENT: ${alert.message} at ${alert.location}. Risk Score: ${alert.riskScore.toFixed(3)}. Time: ${new Date().toLocaleString()}`\n        }\n    };\n    outputs[1] = smsMsg;\n}\n\n// 3. Dashboard alert (all levels)\nconst dashboardMsg = {\n    topic: `alert/${nodeId}`,\n    payload: alert\n};\noutputs[2] = dashboardMsg;\n\n// 4. Database storage\nconst dbMsg = {\n    topic: 'alerts',\n    payload: alertRecord\n};\noutputs[3] = dbMsg;\n\n// 5. External API notification (critical only)\nif (alertLevel >= 4) {\n    const apiMsg = {\n        url: flow.get('emergency_api_url'),\n        method: 'POST',\n        payload: {\n            alert_type: 'forest_fire',\n            severity: 'critical',\n            location: alert.coordinates,\n            description: alert.message,\n            node_id: nodeId,\n            timestamp: alert.timestamp\n        },\n        headers: {\n            'Content-Type': 'application/json',\n            'Authorization': `Bearer ${flow.get('api_token')}`\n        }\n    };\n    outputs[4] = apiMsg;\n}\n\nfunction generateEmailHTML(alert) {\n    return `\n    <html>\n    <body style=\"font-family: Arial, sans-serif;\">\n        <div style=\"background-color: ${alert.alertLevel >= 3 ? '#ff4444' : '#ffaa00'}; color: white; padding: 20px; text-align: center;\">\n            <h1>${alert.message}</h1>\n        </div>\n        \n        <div style=\"padding: 20px;\">\n            <h2>Alert Details</h2>\n            <table style=\"border-collapse: collapse; width: 100%;\">\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Node ID:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.nodeId}</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Location:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.location}</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Risk Score:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.riskScore.toFixed(3)}</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Temperature:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.currentReading.temperature}°C</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Humidity:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.currentReading.humidity}%</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Smoke Level:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.currentReading.smokePPM} PPM</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>CO Level:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.currentReading.coPPM} PPM</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Flame Detected:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${alert.currentReading.flameDetected ? 'YES' : 'NO'}</td></tr>\n                <tr><td style=\"border: 1px solid #ddd; padding: 8px;\"><strong>Timestamp:</strong></td><td style=\"border: 1px solid #ddd; padding: 8px;\">${new Date(alert.timestamp).toLocaleString()}</td></tr>\n            </table>\n            \n            <p style=\"margin-top: 20px;\">\n                <strong>Recommended Actions:</strong>\n            </p>\n            <ul>\n                ${alert.alertLevel >= 4 ? '<li>Immediately contact emergency services</li>' : ''}\n                ${alert.alertLevel >= 3 ? '<li>Dispatch fire response team</li>' : ''}\n                <li>Verify alert with additional sensors in the area</li>\n                <li>Monitor situation closely</li>\n                <li>Prepare evacuation procedures if necessary</li>\n            </ul>\n        </div>\n        \n        <div style=\"background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;\">\n            Forest Fire Detection System - Automated Alert\n        </div>\n    </body>\n    </html>\n    `;\n}\n\n// Log alert generation\nnode.log(`Alert generated for node ${nodeId}: Level ${alertLevel}, Score ${alert.riskScore.toFixed(3)}`);\n\nreturn outputs;",
        "outputs": 5,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 420,
        "y": 200,
        "wires": [
            ["email-sender"],
            ["sms-sender"],
            ["dashboard-update"],
            ["database-insert"],
            ["external-api-call"]
        ]
    }
]
```

## C.5 Data Storage and Database Integration

### C.5.1 InfluxDB Time-Series Storage Flow

```json
[
    {
        "id": "influxdb-writer",
        "type": "influxdb out",
        "z": "storage-flow",
        "influxdb": "influxdb-config",
        "name": "Write to InfluxDB",
        "measurement": "sensor_readings",
        "precision": "ms",
        "retentionPolicy": "autogen",
        "database": "forest_fire_db",
        "precisionV18FluxV20": "ms",
        "retentionPolicyV18Flux": "",
        "writePrecisionV18Flux": "ms",
        "bucketV18Flux": "",
        "orgV18Flux": "",
        "x": 400,
        "y": 300,
        "wires": []
    },
    {
        "id": "data-storage",
        "type": "function",
        "z": "storage-flow",
        "name": "Prepare InfluxDB Format",
        "func": "// Convert data to InfluxDB line protocol format\nconst data = msg.payload.data;\nconst nodeId = msg.payload.nodeId;\nconst timestamp = data.timestamp;\n\n// Prepare InfluxDB measurement points\nconst measurements = [];\n\n// Main sensor reading measurement\nconst sensorPoint = {\n    measurement: 'sensor_readings',\n    tags: {\n        node_id: nodeId,\n        location: data.nodeMetadata ? data.nodeMetadata.location : 'unknown'\n    },\n    fields: {\n        temperature: parseFloat(data.temperature),\n        humidity: parseFloat(data.humidity),\n        smoke_ppm: parseInt(data.smokePPM),\n        co_ppm: parseInt(data.coPPM),\n        flame_detected: data.flameDetected ? 1 : 0,\n        light_level: parseFloat(data.lightLevel || 0),\n        battery_voltage: parseFloat(data.batteryVoltage || 0),\n        solar_voltage: parseFloat(data.solarVoltage || 0),\n        fire_risk_score: parseFloat(data.fireRiskScore),\n        heat_index: parseFloat(data.heatIndex || data.temperature),\n        dew_point: parseFloat(data.dewPoint || 0)\n    },\n    timestamp: new Date(timestamp)\n};\n\n// Add GPS coordinates if available\nif (msg.payload.location) {\n    sensorPoint.tags.latitude = msg.payload.location.lat.toString();\n    sensorPoint.tags.longitude = msg.payload.location.lon.toString();\n}\n\nmeasurements.push(sensorPoint);\n\n// System status measurement\nif (data.uptimeSeconds || data.memoryUsage || data.signalStrength) {\n    const statusPoint = {\n        measurement: 'system_status',\n        tags: {\n            node_id: nodeId\n        },\n        fields: {\n            uptime_seconds: parseInt(data.uptimeSeconds || 0),\n            free_memory: parseInt(data.memoryUsage || 0),\n            signal_strength: parseInt(data.signalStrength || 0),\n            packet_count: parseInt(data.packetCount || 0)\n        },\n        timestamp: new Date(timestamp)\n    };\n    measurements.push(statusPoint);\n}\n\n// Create separate messages for each measurement\nconst outputs = measurements.map(measurement => ({\n    payload: measurement\n}));\n\nreturn outputs;",
        "outputs": 2,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 200,
        "y": 300,
        "wires": [["influxdb-writer"], ["influxdb-writer"]]
    }
]
```

### C.5.2 MongoDB Document Storage Flow

```json
[
    {
        "id": "mongodb-writer",
        "type": "mongodb4",
        "z": "storage-flow",
        "clientdb": "mongodb-config",
        "name": "Write to MongoDB",
        "collection": "sensor_documents",
        "operation": "insert",
        "upsert": false,
        "multi": false,
        "fullMsg": false,
        "x": 400,
        "y": 400,
        "wires": [["mongodb-response"]]
    },
    {
        "id": "document-storage",
        "type": "function",
        "z": "storage-flow",
        "name": "Prepare MongoDB Document",
        "func": "// Prepare complete document for MongoDB storage\nconst data = msg.payload.data;\nconst nodeId = msg.payload.nodeId;\n\n// Create comprehensive document\nconst document = {\n    nodeId: nodeId,\n    timestamp: new Date(data.timestamp),\n    sensorReadings: {\n        temperature: data.temperature,\n        humidity: data.humidity,\n        smokePPM: data.smokePPM,\n        coPPM: data.coPPM,\n        flameDetected: data.flameDetected,\n        lightLevel: data.lightLevel,\n        batteryVoltage: data.batteryVoltage,\n        solarVoltage: data.solarVoltage\n    },\n    calculatedMetrics: {\n        fireRiskScore: data.fireRiskScore,\n        heatIndex: data.heatIndex,\n        dewPoint: data.dewPoint\n    },\n    metadata: {\n        nodeMetadata: data.nodeMetadata,\n        location: msg.payload.location,\n        dataSource: msg.payload.source,\n        processingTimestamp: msg.payload.processingTimestamp,\n        validation: msg.payload.validation\n    }\n};\n\n// Add system status if available\nif (data.uptimeSeconds) {\n    document.systemStatus = {\n        uptimeSeconds: data.uptimeSeconds,\n        memoryUsage: data.memoryUsage,\n        signalStrength: data.signalStrength,\n        packetCount: data.packetCount\n    };\n}\n\n// Add alerts if any are active\nconst currentAlertLevel = flow.get(`alert_level_${nodeId}`) || 0;\nif (currentAlertLevel > 0) {\n    document.alertStatus = {\n        level: currentAlertLevel,\n        active: true,\n        lastAlertTime: flow.get(`last_alert_${nodeId}`)\n    };\n}\n\nmsg.payload = document;\nreturn msg;",
        "outputs": 1,
        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 200,\n        "y": 400,\n        "wires": [["mongodb-writer"]]\n    }\n]\n```\n\n## C.6 Dashboard and Visualization Integration\n\n### C.6.1 Real-time Dashboard Updates\n\n```json\n[\n    {\n        "id": "dashboard-update",\n        "type": "websocket out",\n        "z": "dashboard-flow",\n        "name": "Dashboard WebSocket",\n        "server": "websocket-server",\n        "client": "",\n        "x": 400,\n        "y": 500,\n        "wires": []\n    },\n    {\n        "id": "dashboard-formatter",\n        "type": "function",\n        "z": "dashboard-flow",\n        "name": "Format Dashboard Data",\n        "func": "// Format data for real-time dashboard display\nconst alert = msg.payload;\nconst nodeId = alert.nodeId;\n\n// Get node configuration\nconst nodeConfig = flow.get(`node_config_${nodeId}`) || {\n    name: `Node ${nodeId}`,\n    location: 'Unknown',\n    coordinates: null\n};\n\n// Prepare dashboard update message\nconst dashboardUpdate = {\n    type: 'alert_update',\n    timestamp: Date.now(),\n    data: {\n        nodeId: nodeId,\n        nodeName: nodeConfig.name,\n        location: nodeConfig.location,\n        coordinates: alert.coordinates || nodeConfig.coordinates,\n        alertLevel: alert.alertLevel,\n        message: alert.message,\n        riskScore: alert.riskScore,\n        sensorData: {\n            temperature: alert.currentReading.temperature,\n            humidity: alert.currentReading.humidity,\n            smokePPM: alert.currentReading.smokePPM,\n            coPPM: alert.currentReading.coPPM,\n            flameDetected: alert.currentReading.flameDetected,\n            batteryVoltage: alert.currentReading.batteryVoltage\n        },\n        status: getStatusText(alert.alertLevel),\n        color: getStatusColor(alert.alertLevel),\n        priority: alert.alertLevel >= 3 ? 'high' : 'normal'\n    }\n};\n\n// Helper functions\nfunction getStatusText(level) {\n    const statusMap = {\n        0: 'Normal',\n        1: 'Elevated',\n        2: 'Moderate Risk',\n        3: 'High Risk',\n        4: 'Critical Risk'\n    };\n    return statusMap[level] || 'Unknown';\n}\n\nfunction getStatusColor(level) {\n    const colorMap = {\n        0: '#4CAF50',  // Green\n        1: '#FFF176',  // Light Yellow\n        2: '#FF9800',  // Orange\n        3: '#F44336',  // Red\n        4: '#9C27B0'   // Purple (Critical)\n    };\n    return colorMap[level] || '#757575';\n}\n\n// Also prepare Grafana annotation if critical\nif (alert.alertLevel >= 3) {\n    const annotation = {\n        dashboardId: null,\n        panelId: null,\n        time: alert.timestamp,\n        timeEnd: alert.timestamp + 300000, // 5 minutes\n        tags: ['fire-alert', `level-${alert.alertLevel}`, nodeId],\n        text: `${alert.message} - Node ${nodeId}`,\n        title: 'Fire Alert'\n    };\n    \n    // Send both dashboard update and annotation\n    return [{ payload: dashboardUpdate }, { payload: annotation }];\n}\n\nreturn [{ payload: dashboardUpdate }, null];",\n        "outputs": 2,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 200,\n        "y": 500,\n        "wires": [["dashboard-update"], ["grafana-annotation"]]\n    }\n]\n```\n\n## C.7 System Configuration and Management\n\n### C.7.1 Configuration Management Flow\n\n```json\n[\n    {\n        "id": "config-manager",\n        "type": "http in",\n        "z": "config-flow",\n        "name": "Configuration API",\n        "url": "/api/config/:nodeId",\n        "method": "post",\n        "upload": false,\n        "swaggerDoc": "",\n        "x": 120,\n        "y": 600,\n        "wires": [["config-processor"]]\n    },\n    {\n        "id": "config-processor",\n        "type": "function",\n        "z": "config-flow",\n        "name": "Process Configuration",\n        "func": "// Handle configuration updates for sensor nodes\nconst nodeId = msg.req.params.nodeId;\nconst config = msg.payload;\n\n// Validate configuration\nconst validationResult = validateConfiguration(config);\n\nif (!validationResult.valid) {\n    msg.statusCode = 400;\n    msg.payload = {\n        error: 'Invalid configuration',\n        details: validationResult.errors\n    };\n    return msg;\n}\n\n// Store configuration\nflow.set(`node_config_${nodeId}`, config);\n\n// Update thresholds if provided\nif (config.fireDetection) {\n    const thresholds = config.fireDetection.thresholds;\n    flow.set(`thresholds_${nodeId}`, thresholds);\n}\n\n// Update alert recipients if provided\nif (config.alerting) {\n    if (config.alerting.emailRecipients) {\n        flow.set('alert_email_recipients', config.alerting.emailRecipients);\n    }\n    if (config.alerting.smsRecipients) {\n        flow.set('alert_sms_recipients', config.alerting.smsRecipients);\n    }\n}\n\n// Log configuration update\nnode.log(`Configuration updated for node ${nodeId}`);\n\n// Prepare response\nmsg.payload = {\n    success: true,\n    message: `Configuration updated for node ${nodeId}`,\n    timestamp: Date.now()\n};\n\nfunction validateConfiguration(config) {\n    const errors = [];\n    \n    // Validate required fields\n    if (!config.name) errors.push('Node name is required');\n    if (!config.location) errors.push('Location is required');\n    \n    // Validate fire detection thresholds\n    if (config.fireDetection && config.fireDetection.thresholds) {\n        const thresholds = config.fireDetection.thresholds;\n        if (thresholds.length !== 5) {\n            errors.push('Fire detection thresholds must have 5 levels');\n        }\n        \n        // Check threshold ordering\n        for (let i = 1; i < thresholds.length; i++) {\n            if (thresholds[i] <= thresholds[i-1]) {\n                errors.push('Thresholds must be in ascending order');\n            }\n        }\n    }\n    \n    // Validate coordinates if provided\n    if (config.coordinates) {\n        if (typeof config.coordinates.lat !== 'number' || \n            typeof config.coordinates.lon !== 'number') {\n            errors.push('Invalid coordinates format');\n        }\n    }\n    \n    return {\n        valid: errors.length === 0,\n        errors: errors\n    };\n}\n\nreturn msg;",\n        "outputs": 1,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 340,\n        "y": 600,\n        "wires": [["config-response"]]\n    }\n]\n```\n\n## C.8 Error Handling and Logging\n\n### C.8.1 Comprehensive Error Handling Flow\n\n```json\n[\n    {\n        "id": "error-handler",\n        "type": "function",\n        "z": "error-flow",\n        "name": "Global Error Handler",\n        "func": "// Global error handling and logging\nconst error = {\n    timestamp: Date.now(),\n    nodeId: msg.payload.nodeId || 'unknown',\n    errorType: msg.error ? msg.error.name : 'ValidationError',\n    errorMessage: msg.error ? msg.error.message : 'Data validation failed',\n    rawData: msg.payload,\n    source: msg.topic || 'unknown'\n};\n\n// Log error details\nnode.error(`Error in node ${error.nodeId}: ${error.errorMessage}`);\n\n// Store error in database for analysis\nconst errorRecord = {\n    ...error,\n    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,\n    resolved: false,\n    severity: determineSeverity(error)\n};\n\n// Send to error database\nconst dbMsg = {\n    topic: 'errors',\n    payload: errorRecord\n};\n\n// Send alert for critical errors\nlet alertMsg = null;\nif (errorRecord.severity === 'critical') {\n    alertMsg = {\n        payload: {\n            type: 'system_error',\n            message: `Critical system error in node ${error.nodeId}`,\n            details: error.errorMessage,\n            timestamp: error.timestamp\n        }\n    };\n}\n\nfunction determineSeverity(error) {\n    if (error.errorType === 'ValidationError') return 'warning';\n    if (error.errorType === 'NetworkError') return 'error';\n    if (error.errorType === 'SystemError') return 'critical';\n    return 'info';\n}\n\nreturn [dbMsg, alertMsg];",\n        "outputs": 2,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 200,\n        "y": 700,\n        "wires": [["error-database"], ["error-alert"]]\n    }\n]\n```\n\n## C.9 External Integration Flows\n\n### C.9.1 Weather Service Integration\n\n```json\n[\n    {\n        "id": "weather-service",\n        "type": "http request",\n        "z": "external-flow",\n        "name": "Weather API",\n        "method": "GET",\n        "ret": "obj",\n        "paytoqs": "ignore",\n        "url": "",\n        "tls": "",\n        "persist": false,\n        "proxy": "",\n        "authType": "",\n        "senderr": false,\n        "x": 340,\n        "y": 800,\n        "wires": [["weather-processor"]]\n    },\n    {\n        "id": "weather-fetcher",\n        "type": "function",\n        "z": "external-flow",\n        "name": "Fetch Weather Data",\n        "func": "// Fetch weather data for enhanced fire risk assessment\nconst nodeId = msg.payload.nodeId;\nconst coordinates = msg.payload.location;\n\nif (!coordinates) {\n    node.warn(`No coordinates available for node ${nodeId}`);\n    return null;\n}\n\n// Prepare weather API request\nconst apiKey = flow.get('weather_api_key') || env.get('WEATHER_API_KEY');\nconst lat = coordinates.lat;\nconst lon = coordinates.lon;\n\nmsg.url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;\n\n// Add node context to message\nmsg.nodeContext = {\n    nodeId: nodeId,\n    coordinates: coordinates,\n    requestTime: Date.now()\n};\n\nreturn msg;",\n        "outputs": 1,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 160,\n        "y": 800,\n        "wires": [["weather-service"]]\n    }\n]\n```\n\n## C.10 Performance Monitoring and Optimization\n\n### C.10.1 System Performance Monitoring\n\n```json\n[\n    {\n        "id": "performance-monitor",\n        "type": "function",\n        "z": "monitor-flow",\n        "name": "Performance Monitor",\n        "func": "// Monitor Node-RED performance metrics\nconst stats = {\n    timestamp: Date.now(),\n    memoryUsage: process.memoryUsage(),\n    cpuUsage: process.cpuUsage(),\n    uptime: process.uptime(),\n    nodeRedVersion: RED.version(),\n    activeFlows: Object.keys(RED.nodes.getFlows()).length,\n    messageCount: flow.get('total_messages') || 0\n};\n\n// Calculate derived metrics\nstats.memoryUsageMB = {\n    rss: Math.round(stats.memoryUsage.rss / 1024 / 1024),\n    heapUsed: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024),\n    heapTotal: Math.round(stats.memoryUsage.heapTotal / 1024 / 1024),\n    external: Math.round(stats.memoryUsage.external / 1024 / 1024)\n};\n\n// Check for performance issues\nconst issues = [];\n\nif (stats.memoryUsageMB.heapUsed > 500) {\n    issues.push('High memory usage detected');\n}\n\nif (stats.uptime > 7 * 24 * 3600) { // 7 days\n    issues.push('System has been running for over 7 days - consider restart');\n}\n\nconst messageRate = flow.get('message_rate') || 0;\nif (messageRate > 1000) { // messages per minute\n    issues.push('High message processing rate');\n}\n\n// Store performance data\nflow.set('performance_stats', stats);\n\n// Send alert if issues detected\nif (issues.length > 0) {\n    const alertMsg = {\n        payload: {\n            type: 'performance_alert',\n            issues: issues,\n            stats: stats,\n            timestamp: Date.now()\n        }\n    };\n    return [{ payload: stats }, alertMsg];\n}\n\nreturn [{ payload: stats }, null];",\n        "outputs": 2,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 200,\n        "y": 900,\n        "wires": [["performance-storage"], ["performance-alert"]]\n    }\n]\n```\n\n---\n\n## C.11 Flow Deployment and Configuration\n\n### C.11.1 Environment Configuration\n\n```json\n{\n    "mqtt-broker-config": {\n        "name": "Forest Fire MQTT Broker",\n        "broker": "mqtt.forestfire.local",\n        "port": "1883",\n        "clientid": "node-red-main",\n        "autoConnect": true,\n        "usetls": false,\n        "protocolVersion": "4",\n        "keepalive": "60",\n        "cleansession": true,\n        "birthTopic": "nodered/status",\n        "birthQos": "0",\n        "birthPayload": "online",\n        "birthMsg": {},\n        "closeTopic": "nodered/status",\n        "closeQos": "0",\n        "closePayload": "offline",\n        "closeMsg": {},\n        "willTopic": "",\n        "willQos": "0",\n        "willPayload": "",\n        "willMsg": {},\n        "sessionExpiry": ""\n    },\n    "influxdb-config": {\n        "hostname": "influxdb.forestfire.local",\n        "port": "8086",\n        "protocol": "http",\n        "database": "forest_fire_db",\n        "name": "Forest Fire InfluxDB",\n        "usetls": false,\n        "tls": "",\n        "influxdbVersion": "1.x",\n        "url": "http://influxdb.forestfire.local:8086",\n        "rejectUnauthorized": false\n    },\n    "mongodb-config": {\n        "name": "Forest Fire MongoDB",\n        "url": "mongodb://mongodb.forestfire.local:27017/forest_fire"\n    }\n}\n```\n\n### C.11.2 Global Context Variables\n\n```javascript\n// Global context initialization\nconst globalContext = {\n    // System Configuration\n    system_name: "Forest Fire Detection System",\n    version: "2.1.0",\n    timezone: "UTC",\n    \n    // Alert Configuration\n    alert_email_recipients: [\n        "admin@forestfire.com",\n        "emergency@forestservice.gov"\n    ],\n    alert_sms_recipients: [\n        "+1234567890",\n        "+0987654321"\n    ],\n    \n    // API Keys and Tokens\n    weather_api_key: process.env.WEATHER_API_KEY,\n    sms_api_token: process.env.SMS_API_TOKEN,\n    email_api_token: process.env.EMAIL_API_TOKEN,\n    \n    // Performance Thresholds\n    max_memory_usage: 1024, // MB\n    max_message_rate: 1000,  // messages per minute\n    max_error_rate: 10,      // errors per hour\n    \n    // Fire Detection Defaults\n    default_fire_thresholds: [0.1, 0.3, 0.5, 0.7, 0.9],\n    default_weights: {\n        temperature: 0.25,\n        humidity: 0.15,\n        smoke: 0.35,\n        co: 0.15,\n        flame: 0.10\n    }\n};\n\n// Initialize global context\nRED.settings.functionGlobalContext = globalContext;\n```\n\n---\n\n## C.12 Testing and Validation\n\n### C.12.1 Flow Testing Configuration\n\n```json\n[\n    {\n        "id": "test-data-generator",\n        "type": "inject",\n        "z": "test-flow",\n        "name": "Generate Test Data",\n        "props": [\n            {\n                "p": "payload"\n            }\n        ],\n        "repeat": "10",\n        "crontab": "",\n        "once": false,\n        "onceDelay": 0.1,\n        "topic": "",\n        "payload": "",\n        "payloadType": "date",\n        "x": 140,\n        "y": 1000,\n        "wires": [["test-data-formatter"]]\n    },\n    {\n        "id": "test-data-formatter",\n        "type": "function",\n        "z": "test-flow",\n        "name": "Format Test Data",\n        "func": "// Generate realistic test sensor data\nconst testScenarios = [\n    { name: 'normal', temp: 25, humidity: 45, smoke: 50, co: 5, flame: false },\n    { name: 'elevated', temp: 35, humidity: 30, smoke: 150, co: 15, flame: false },\n    { name: 'moderate_risk', temp: 45, humidity: 20, smoke: 300, co: 25, flame: false },\n    { name: 'high_risk', temp: 55, humidity: 15, smoke: 800, co: 50, flame: true },\n    { name: 'critical', temp: 65, humidity: 10, smoke: 2000, co: 100, flame: true }\n];\n\n// Select random scenario\nconst scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];\n\n// Add some random variation\nconst testData = {\n    nodeId: 'TEST001',\n    timestamp: Date.now(),\n    temperature: scenario.temp + (Math.random() - 0.5) * 10,\n    humidity: Math.max(0, scenario.humidity + (Math.random() - 0.5) * 20),\n    smokePPM: Math.max(0, scenario.smoke + (Math.random() - 0.5) * 100),\n    coPPM: Math.max(0, scenario.co + (Math.random() - 0.5) * 10),\n    flameDetected: scenario.flame || (Math.random() < 0.05), // 5% random flame detection\n    batteryVoltage: 3.7 + (Math.random() - 0.5) * 0.6,\n    solarVoltage: 12 + (Math.random() - 0.5) * 4,\n    lightLevel: Math.random() * 100,\n    latitude: 45.5017 + (Math.random() - 0.5) * 0.01,\n    longitude: -73.5673 + (Math.random() - 0.5) * 0.01\n};\n\nmsg.payload = testData;\nmsg.topic = 'forest-fire-wsn/nodes/TEST001/sensors/multi';\n\nnode.log(`Generated test data for scenario: ${scenario.name}`);\n\nreturn msg;",\n        "outputs": 1,\n        "noerr": 0,\n        "initialize": "",\n        "finalize": "",\n        "libs": [],\n        "x": 360,\n        "y": 1000,\n        "wires": [["data-parser"]]\n    }\n]\n```\n\n---\n\n**Implementation Notes:**\n\n1. **Flow Import:** Import these flows into Node-RED using the Import function in the hamburger menu\n2. **Configuration:** Update all configuration nodes with your specific database and service endpoints\n3. **Dependencies:** Install required Node-RED nodes using the Palette Manager:\n   - node-red-contrib-influxdb\n   - node-red-node-mongodb\n   - node-red-contrib-web-worldmap\n   - node-red-dashboard\n\n4. **Environment Variables:** Set up environment variables for API keys and sensitive credentials\n5. **Testing:** Use the test data generator to validate flow functionality before connecting real sensors\n\n---\n\n**Revision History:**\n\n| Version | Date | Changes | Author |\n|---------|------|---------|--------|\n| 1.0 | 2022-04-15 | Initial flow designs | F. Amoah |\n| 1.5 | 2022-05-20 | Added error handling and monitoring | F. Amoah |\n| 2.0 | 2022-06-25 | Enhanced fire detection algorithm | F. Amoah |\n| 2.1 | 2022-07-15 | Performance optimization and testing | F. Amoah |\n