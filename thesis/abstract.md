# Abstract

Forest fires pose a severe threat to ecosystems, economies, and human safety, particularly in Sub-Saharan Africa where remote terrain and limited infrastructure hinder early detection. This thesis presents the design, implementation, and evaluation of a solar-assisted Wireless Sensor Network (WSN) using LoRa communication and IoT cloud analytics for autonomous, real-time forest fire detection.

Each sensor node integrates temperature, humidity, smoke, CO, IR-flame, and GPS modules on an ESP32 platform, powered by a mini-solar photovoltaic array with Li-ion battery backup optimized via maximum power point tracking (MPPT). Data are transmitted over LoRa to a multi-channel gateway, then processed locally (fog layer) and in the cloud using Node-RED, MQTT, InfluxDB, and Grafana.

A weighted-fusion algorithm computes a "fire-risk" score at the edge, triggering tiered alerts (local buzzer/LED, SMS/email) when thresholds are breached. Experimental trials, covering sensor calibration, communication range (up to 5 km in dense canopy), power-budget analysis (6-month autonomy), detection accuracy (> 98%), and end-to-end latency (< 3 s); demonstrate the system's viability for rapid, low-cost deployment in remote forested areas. The work culminates in guidelines for large-scale rollout and future enhancements, including machine-learning-based anomaly detection and mesh-enabled gateways for extended coverage.

**Keywords**: Wireless Sensor Networks, LoRa, IoT, Forest Fire Detection, Solar Energy Harvesting, Edge-Fog-Cloud, Environmental Monitoring
