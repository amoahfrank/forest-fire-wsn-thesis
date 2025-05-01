# Design and Implementation of a Solar-Assisted WSN-LoRa IoT Framework for Real-Time Forest Fire Detection and Monitoring

## Master's Thesis 2022
**Author**: Frank Amoah  
**Degree Program**: MSc Embedded Systems & IoT Engineering  
**Submitted**: July 2022

## Abstract
Forest fires pose a severe threat to ecosystems, economies, and human safety, particularly in Sub-Saharan Africa where remote terrain and limited infrastructure hinder early detection. This thesis presents the design, implementation, and evaluation of a solar-assisted Wireless Sensor Network (WSN) using LoRa communication and IoT cloud analytics for autonomous, real-time forest fire detection. 

Each sensor node integrates temperature, humidity, smoke, CO, IR-flame, and GPS modules on an ESP32 platform, powered by a mini-solar photovoltaic array with Li-ion battery backup optimized via maximum power point tracking (MPPT). Data are transmitted over LoRa to a multi-channel gateway, then processed locally (fog layer) and in the cloud using Node-RED, MQTT, InfluxDB, and Grafana. 

A weighted-fusion algorithm computes a "fire-risk" score at the edge, triggering tiered alerts (local buzzer/LED, SMS/email) when thresholds are breached. Experimental trials, covering sensor calibration, communication range (up to 5 km in dense canopy), power-budget analysis (6-month autonomy), detection accuracy (> 98%), and end-to-end latency (< 3 s); demonstrate the system's viability for rapid, low-cost deployment in remote forested areas. The work culminates in guidelines for large-scale rollout and future enhancements, including machine-learning-based anomaly detection and mesh-enabled gateways for extended coverage.

## Repository Structure

```
forest-fire-wsn-thesis/
├── README.md                 # This file
├── thesis/                   # Thesis content
│   ├── chapters/             # Thesis chapters in Markdown format
│   │   ├── 01_introduction.md
│   │   ├── 02_literature_review.md
│   │   ├── 03_system_design.md
│   │   ├── 04_implementation.md
│   │   ├── 05_data_processing.md
│   │   ├── 06_testing_evaluation.md
│   │   ├── 07_risk_assessment.md
│   │   └── 08_conclusions.md
│   ├── appendices/           # Supplementary materials
│   │   ├── A_schematics.md
│   │   ├── B_firmware.md
│   │   ├── C_node_red_flows.md
│   │   ├── D_test_data.md
│   │   └── E_solar_calculations.md
│   ├── abstract.md           # Thesis abstract
│   ├── references.md         # Bibliography in IEEE format
│   └── table_of_contents.md  # Detailed ToC with page numbers
├── figures/                  # Diagrams, charts, and illustrations
│   └── README.md             # Figure index and descriptions
├── code/                     # Source code for the project
│   ├── firmware/             # Embedded code for sensor nodes
│   ├── node_red_flows/       # Node-RED flow configurations
│   └── README.md             # Code documentation
└── resources/                # Additional resources and references
    └── README.md             # Resource index
```

## Viewing Instructions
The thesis content is provided in Markdown format for version control and easy viewing on GitHub. Chapter files are named sequentially and can be read in order for the complete thesis.

## Status
Final version submitted July 2022.

## Contact
For questions or collaboration opportunities, please contact [contact information].
