# Code Directory

This directory contains all source code developed for the forest fire detection system, organized by component.

## Contents

### Firmware
The `firmware/` directory contains the embedded software developed for the sensor nodes, based on the Heltec LoRa ESP32 v2.1 platform. Key components include:

- Sensor drivers (BME680, MQ-2, MQ-7, YG1006, NEO-M8N)
- Power management system with MPPT
- LoRaWAN communication stack
- Edge-level data fusion algorithm
- Local alert management

### Node-RED Flows
The `node_red_flows/` directory contains JSON exports of the Node-RED flows implemented for:

- LoRaWAN gateway data processing
- Fog-level thresholding and alert generation
- MQTT broker integration
- InfluxDB time-series data storage
- SMS/Email alert generation
- Basic visualization dashboards

## Development Environment

- PlatformIO with Arduino framework for ESP32 development
- Node-RED v2.2.0 for flow-based programming
- Docker containers for fog and cloud deployment
- MQTT, InfluxDB, and Grafana for data management and visualization

## Usage Instructions

1. Firmware can be compiled and flashed using PlatformIO or Arduino IDE
2. Node-RED flows can be imported directly into a Node-RED instance
3. Docker-compose files are provided for easy deployment of the fog and cloud components

## Dependencies

- Arduino Core for ESP32 v2.0.0+
- LoRaWAN library v0.8.0+
- BME680 library v1.0.8+
- ArduinoJson v6.19.4+
- Node-RED v2.2.0+
- Node-RED Dashboard v3.1.7+
- InfluxDB v2.0+
- Grafana v8.5.0+
