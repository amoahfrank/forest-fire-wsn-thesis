# Design and Implementation of a Solar-Assisted WSN-LoRa IoT Framework for Real-Time Forest Fire Detection and Monitoring

## Master's Thesis 2022
**Author**: Frank Amoah  
**Degree Program**: MSc Embedded Systems & IoT Engineering  
**Submitted**: July 2022
**Updated**: May 2025 (Complete Implementation)

## Abstract
Forest fires pose a severe threat to ecosystems, economies, and human safety, particularly in Sub-Saharan Africa where remote terrain and limited infrastructure hinder early detection. This thesis presents the design, implementation, and evaluation of a solar-assisted Wireless Sensor Network (WSN) using LoRa communication and IoT cloud analytics for autonomous, real-time forest fire detection. 

Each sensor node integrates temperature, humidity, smoke, CO, IR-flame, and GPS modules on an ESP32 platform, powered by a mini-solar photovoltaic array with Li-ion battery backup optimized via maximum power point tracking (MPPT). Data are transmitted over LoRa to a multi-channel gateway, then processed locally (fog layer) and in the cloud using Node-RED, MQTT, InfluxDB, and Grafana. 

A weighted-fusion algorithm computes a "fire-risk" score at the edge, triggering tiered alerts (local buzzer/LED, SMS/email) when thresholds are breached. Experimental trials, covering sensor calibration, communication range, power-budget analysis (6-month autonomy), detection accuracy (> 98%), and end-to-end latency (< 3 s); demonstrate the system's viability for rapid, low-cost deployment in remote forested areas.

## 🚀 Complete System Implementation

This repository contains the **full implementation** of the forest fire detection system, including:
- **Hardware firmware** for ESP32-based sensor nodes
- **Cloud-native microservices** architecture
- **Real-time monitoring** dashboards and alerts
- **Production-ready deployment** configurations
- **Comprehensive documentation** and testing frameworks

## 📁 Repository Structure

```
forest-fire-wsn-thesis/
├── README.md                           # This comprehensive project overview
├── thesis/                             # Academic thesis documentation
│   ├── chapters/                       # Thesis chapters in Markdown format
│   │   ├── 01_introduction.md
│   │   ├── 02_literature_review.md
│   │   ├── 03_system_design.md
│   │   ├── 04_implementation.md
│   │   ├── 05_data_processing.md
│   │   ├── 06_testing_evaluation.md
│   │   ├── 07_risk_assessment.md
│   │   └── 08_conclusions.md
│   ├── appendices/                     # Supplementary materials
│   │   ├── A_schematics.md
│   │   ├── B_firmware.md
│   │   ├── C_node_red_flows.md
│   │   ├── D_test_data.md
│   │   └── E_solar_calculations.md
│   ├── abstract.md                     # Thesis abstract
│   ├── references.md                   # Bibliography in IEEE format
│   └── table_of_contents.md            # Detailed ToC with page numbers
├── figures/                            # Diagrams, charts, and illustrations
│   └── README.md                       # Figure index and descriptions
├── code/                               # 🔥 COMPLETE SYSTEM IMPLEMENTATION
│   ├── firmware/                       # 📟 ESP32 Sensor Node Firmware
│   │   ├── SensorNodeFirmware.ino      # Main firmware application
│   │   ├── config.h                    # Hardware configuration constants
│   │   ├── sensors.h                   # Sensor interface definitions
│   │   └── platformio.ini              # Build configuration
│   ├── web_interface/                  # 🌐 React Frontend Application
│   │   ├── NodeConfigModal.jsx         # Node configuration interface
│   │   ├── NodeDetails.jsx             # Detailed node information view
│   │   ├── NodeList.jsx                # Node listing and management
│   │   ├── NodeManager.jsx             # Main node management interface
│   │   ├── NodeMap.js                  # Interactive network map
│   │   ├── package.json                # Frontend dependencies
│   │   ├── Dockerfile.web              # Container build configuration
│   │   └── README.md                   # Frontend documentation
│   ├── services/                       # 🔧 Backend API & Services  
│   │   ├── mqttService.js              # MQTT message broker service
│   │   ├── node-api.js                 # RESTful API endpoints
│   │   ├── nodeService.js              # Node management business logic
│   │   ├── server.js                   # Main application server
│   │   ├── package.json                # Backend dependencies
│   │   ├── Dockerfile.api              # API container configuration
│   │   ├── utils/                      # Utility modules
│   │   │   └── logger.js               # Winston logging configuration
│   │   └── README.md                   # Backend documentation
│   ├── node_red_flows/                 # 🔄 Data Processing Flows
│   │   ├── main-flow.json              # Primary data processing pipeline
│   │   └── README.md                   # Flow documentation
│   ├── deployment/                     # 🚀 Infrastructure as Code
│   │   ├── docker-compose.yml          # Multi-container orchestration
│   │   ├── cloudformation-template.yml # AWS infrastructure template
│   │   ├── nginx.conf                  # Reverse proxy configuration
│   │   ├── mosquitto.conf              # MQTT broker configuration
│   │   ├── .env.example                # Environment variables template
│   │   └── README.md                   # Deployment documentation
│   ├── monitoring/                     # 📊 System Observability
│   │   ├── forest-fire-monitoring-dashboard.json # Grafana dashboard
│   │   └── README.md                   # Monitoring documentation
│   └── README.md                       # Code overview and setup guide
└── resources/                          # Additional resources and references
    └── README.md                       # Resource index
```

## 🏗️ System Architecture

### Multi-Tier Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD ANALYTICS LAYER                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Grafana   │  │   InfluxDB   │  │    Notification APIs    │ │
│  │ Dashboards  │  │ Time-Series  │  │    (SMS/Email/Push)     │ │
│  │    & Alerts │  │   Database   │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
┌─────────────────────────────────────────────────────────────────┐
│                     FOG COMPUTING LAYER                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Node-RED   │  │ MQTT Broker  │  │     REST API Server     │ │
│  │ Processing  │  │  (Eclipse    │  │   (Node.js/Express)     │ │
│  │   Engine    │  │  Mosquitto)  │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE SENSOR LAYER                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   ESP32     │  │ LoRa Gateway │  │    Solar Power System   │ │
│  │ Sensor Node │  │ (Multi-CH)   │  │   (MPPT + Li-ion)       │ │
│  │  + Sensors  │  │              │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### **Edge Computing (Sensor Nodes)**
- **Microcontroller**: Heltec WiFi LoRa 32 v2 (ESP32-based)
- **Sensors**: DHT22/BME680 (Temp/Humidity), MQ-2 (Smoke), MQ-7 (CO) (Optional if BME680 is used), YG1006 (IR Flame)
- **Communication**: LoRa 868MHz, WiFi 802.11b/g/n
- **Power**: Solar panel + Li-ion battery + MPPT controller
- **Framework**: Arduino Core for ESP32, PlatformIO, Expressif-IDF (for much control over the ESP32 microcontroller ESP-IDF was used backward compatible with the other frameworks)

#### **Fog Computing (Gateway & Local Processing)**
- **Message Broker**: Eclipse Mosquitto MQTT v3.1.1 | EMQX MQTT Server (This was used for the actual implementation and not eclipse mosquitto)
- **Data Processing**: Node-RED flow-based programming
- **Local Storage**: MongoDB (metadata), InfluxDB (time-series)
- **API Server**: Node.js with Express.js framework
- **Caching**: Redis for session management

#### **Cloud Computing (Analytics & Visualization)**
- **Visualization**: Grafana dashboards with real-time charts
- **Database**: InfluxDB v2.x for time-series analytics
- **Web Interface**: React.js with Bootstrap UI components
- **Infrastructure**: Docker containers, Kubernetes orchestration
- **Cloud Provider**: AWS with CloudFormation IaC

## 🔥 Key Features & Capabilities

### **Intelligent Fire Detection**
- **Multi-sensor fusion** algorithm with weighted risk scoring
- **Configurable thresholds** for different environmental conditions  
- **Machine learning** integration for pattern recognition
- **False positive reduction** through sensor correlation

### **Real-Time Monitoring**
- **Live sensor data** streaming with < 3-second latency
- **Interactive network map** showing node locations and status
- **Customizable dashboards** with drill-down capabilities
- **Mobile-responsive** web interface for field operations

### **Autonomous Operation**
- **Solar-powered nodes** with 6+ months battery backup
- **Self-healing network** with automatic reconnection
- **Over-the-air updates** for firmware and configuration
- **Predictive maintenance** based on battery and signal metrics

### **Comprehensive Alerting**
- **Multi-channel notifications**: SMS, Email, Push, Dashboard
- **Escalation policies** based on risk levels and response times
- **Geographic alerts** with precise node location information
- **Integration APIs** for third-party emergency systems

## 🚀 Quick Start Guide

### **Prerequisites**
- Docker & Docker Compose v2.0+
- Node.js v16+ (for development)
- PlatformIO Core (for firmware development)
- Git LFS (for large binary files)

### **1. Clone Repository**
```bash
git clone https://github.com/amoahfrank/forest-fire-wsn-thesis.git
cd forest-fire-wsn-thesis
```

### **2. Environment Setup**
```bash
# Copy and configure environment variables
cp code/deployment/.env.example code/deployment/.env
# Edit .env file with your specific configuration
```

### **3. Deploy System (Docker)**
```bash
cd code/deployment
# Start all services
docker-compose up -d

# View service status
docker-compose ps

# View logs
docker-compose logs -f
```

### **4. Access Interfaces**
- **Main Dashboard**: http://localhost:3002
- **Grafana Monitoring**: http://localhost:3000/monitoring
- **Node-RED Flows**: http://localhost:1880/flows
- **API Documentation**: http://localhost:3001/api/docs

### **5. Flash Sensor Node Firmware**
```bash
cd code/firmware
# Install PlatformIO dependencies
pio lib install

# Build and flash firmware
pio run --target upload --environment heltec_wifi_lora_32_v2
```

## 📊 System Performance

### **Experimental Results Summary**
- **Detection Accuracy**: >98% for fire conditions
- **False Positive Rate**: <2% under normal conditions
- **Communication Range**: Up to 5km 
- **Power Consumption**: 6+ months autonomous operation
- **End-to-End Latency**: <3 seconds from sensor to alert
- **Network Availability**: >99.5% uptime in field trials

### **Scalability Metrics**
- **Node Capacity**: 1000+ sensor nodes per gateway
- **Data Throughput**: 10,000+ sensor readings per minute
- **Alert Processing**: <100ms response time for critical alerts
- **Storage Efficiency**: 1GB per node per year (compressed)

## 🔬 Research Contributions

### **Novel Methodologies**
1. **Multi-Modal Sensor Fusion**: Advanced algorithmic approach combining environmental sensors with IR flame detection
2. **Edge-to-Cloud Architecture**: Hierarchical processing minimizing bandwidth while maximizing responsiveness
3. **Solar-Optimized IoT**: MPPT-enhanced power management for extended autonomous operation
4. **Adaptive Risk Assessment**: Machine learning-based threat evaluation with environmental context

### **Technical Innovations**
- **Dynamic Threshold Adjustment**: Seasonal and weather-based calibration
- **Mesh Network Resilience**: Self-healing communication topology
- **Predictive Analytics**: Early fire risk assessment using environmental trends
- **Low-Power LoRa Protocol**: Optimized for forest fire monitoring applications

## 📚 Documentation & Resources

### **Academic Documentation**
- [Complete Thesis PDF](thesis/complete-thesis.pdf)
- [Research Methodology](thesis/chapters/03_system_design.md)
- [Experimental Results](thesis/chapters/06_testing_evaluation.md)
- [Technical Appendices](thesis/appendices/)

### **Technical Documentation**
- [API Reference](code/services/README.md)
- [Firmware Guide](code/firmware/README.md)
- [Deployment Manual](code/deployment/README.md)
- [Monitoring Setup](code/monitoring/README.md)

### **Development Resources**
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Issue Templates](.github/ISSUE_TEMPLATE/)
- [Security Policy](SECURITY.md)

## 🤝 Contributing

We welcome contributions from the research community and industry practitioners. Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- **Code contributions** and pull request process
- **Bug reports** and feature requests
- **Documentation** improvements
- **Research collaboration** opportunities

## 📄 License & Citation

### **License**
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### **Academic Citation**
```bibtex
@mastersthesis{amoah2022forest,
  title={Design and Implementation of a Solar-Assisted WSN-LoRa IoT Framework for Real-Time Forest Fire Detection and Monitoring},
  author={Amoah, Frank},
  year={2022},
  school={Ecole SUP Management, Fes},
  type={Master's Thesis},
  url={https://github.com/amoahfrank/forest-fire-wsn-thesis}
}
```

## 🌟 Acknowledgments

- **Academic Supervisors**: Dr. Aziz Ghazi and Prof. Abdulrahim (Chef de Departement Informatique) 
- **Research Institution**: [University/Ecole SUP Management]
- **Funding Support**: N/A (no funding was available - personally funded)
- **Open Source Community**: Contributors and maintainers of utilized libraries
- **Field Testing Partners**: Local

## 📞 Contact & Support

- **Author**: Frank Amoah
- **Email**: f.amoah@frankholds.win
- **GitHub**: [@amoahfrank](https://github.com/amoahfrank)
- **LinkedIn**: [Frank Amoah](https://linkedin.com/in/frank-amoah-59653b83)

### **Support Channels**
- **Issues**: [GitHub Issues](https://github.com/amoahfrank/forest-fire-wsn-thesis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/amoahfrank/forest-fire-wsn-thesis/discussions)
- **Wiki**: [Project Wiki](https://github.com/amoahfrank/forest-fire-wsn-thesis/wiki)

---

## 🎯 Project Status: **COMPLETE IMPLEMENTATION** ✅

This repository represents the **complete, production-ready implementation** of the forest fire detection system described in the master's thesis. All components have been developed, and documented for real-world deployment.

**Last Updated**: May 26, 2025  
**Implementation Status**: Complete (v2.1.3)  
**Documentation Status**: Comprehensive  
**Testing Status**: Field-tested and validated  

[![Build Status](https://github.com/amoahfrank/forest-fire-wsn-thesis/workflows/CI/badge.svg)](https://github.com/amoahfrank/forest-fire-wsn-thesis/actions)
[![Documentation](https://img.shields.io/badge/docs-complete-brightgreen.svg)](https://github.com/amoahfrank/forest-fire-wsn-thesis/wiki)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)
