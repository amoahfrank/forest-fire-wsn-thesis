# Table of Contents

## Abstract...................................i
## Acknowledgments...........................ii
## List of Figures..........................iii
## List of Tables...........................iv
## List of Abbreviations.....................v

## 1. Introduction..........................1
1.1 Background and Motivation...............1
1.2 Problem Statement......................3
1.3 Objectives............................4
1.4 Scope and Delimitations................4
1.5 Contributions of the Study.............5
1.6 Thesis Organization...................6

## 2. Literature Review.....................7
2.1 Traditional & Emerging Fire-Detection Methods......7
2.2 WSNs for Environmental Monitoring..............9
2.3 LoRa/LoRaWAN in Long-Range IoT...............11
2.4 Powering WSN Nodes: Solar & Batteries........13
2.5 Edge-Fog-Cloud Architectures.................15
2.6 IoT Data Protocols: MQTT, CoAP, HTTP.........17
2.7 Research Gaps & Opportunities...............19

## 3. System Design........................21
3.1 Three-Tier Architecture Overview............21
3.2 Edge Layer: Solar-Assisted Sensor Nodes.....23
3.3 Fog Layer: LoRaWAN Gateway & Local Server...27
3.4 Cloud Layer: Analytics & Visualization......29
3.5 Security & Communication Protocols..........30

## 4. Implementation......................32
4.1 Sensor Node Firmware (Heltec LoRa ESP32 v2.1)......32
4.2 Gateway & Fog Software Stack (Raspberry Pi 4; Docker: EMQX, Node-RED, InfluxDB, Grafana)...........36
4.3 Cloud Deployment (AWS EC2; Managed MQTT & Time-Series DB)......................................41

## 5. Data Processing & Analytics...........43
5.1 Edge-Level Sensor Fusion Algorithm..........43
5.2 Fog-Level Thresholding & Redundancy........45
5.3 Cloud-Level Trend Analysis.................47
5.4 Alert Hierarchy: Local vs. Remote..........49
5.5 Pathway to ML-Based Enhancements...........50

## 6. Testing, Evaluation & Results.........52
6.1 Sensor Calibration & Accuracy..............52
6.2 Communication Performance (RSSI, Latency)...54
6.3 Power Budget & Autonomy (6-month PV + Li-ion + MPPT)....57
6.4 Detection Accuracy & False Alarms...........60
6.5 Scalability & Node Density.................62
6.6 Limitations & Discussion...................63

## 7. Risk Assessment & Mitigation...........65
7.1 Environmental & Wildlife Impact.............65
7.2 Security & Privacy Considerations..........66
7.3 Reliability in Harsh Conditions............67
7.4 Maintenance & Lifecycle Management.........68

## 8. Conclusions & Future Work..............69
8.1 Summary of Contributions...................69
8.2 Deployment Recommendations.................70
8.3 Machine-Learning Integration Pathways......71
8.4 Mesh Gateways & 5G Prospects...............72

## References..............................73

## Appendices..............................78
A. Schematics & PCB Layouts..................78
B. Firmware Code Excerpts...................81
C. Node-RED Flow Diagrams...................84
D. Test Data Logs..........................86
E. Solar MPPT Calculations..................88
