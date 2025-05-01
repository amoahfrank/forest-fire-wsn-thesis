# Chapter 3: System Design

## 3.1 Three-Tier Architecture Overview

The forest fire detection system presented in this thesis utilizes a hierarchical three-tier architecture that distributes processing, storage, and decision-making capabilities across multiple layers, thereby optimizing both performance and resource utilization. As illustrated in Figure 3.1, the architecture comprises three distinct layers: edge, fog, and cloud, each with specific responsibilities aligned with its computational capabilities, energy constraints, and connectivity characteristics.

### 3.1.1 Architectural Philosophy

The design philosophy underlying this architecture centers on several key principles:

**Resource-Appropriate Processing:** Computational tasks are allocated to the layer best suited to their resource requirements and time sensitivity. Simple, immediate processing occurs at the edge, while complex analytics run in the cloud, with intermediate operations at the fog layer.

**Progressive Data Refinement:** Data undergoes successive transformations as it moves through the layers—from raw sensor readings at the edge to actionable information at the fog layer to comprehensive analytics in the cloud.

**Layered Autonomy:** Each layer maintains essential functionality even when higher tiers become unavailable, with the edge layer providing minimal but critical operations (detection and local alerts), the fog layer offering intermediate processing and regional coordination, and the cloud layer delivering comprehensive analytics and visualization.

**Optimized Communication:** The architecture minimizes unnecessary data transmission by processing information as close to its source as possible, with each successive layer transmitting increasingly abstracted and filtered data.

This approach balances the trade-offs between local processing (minimizing latency and communication overhead) and centralized computation (enabling more sophisticated analysis and cross-node correlation). The implementation leverages widely available, cost-effective components and open-source software to ensure accessibility and potential for deployment in resource-constrained environments like Sub-Saharan Africa.

### 3.1.2 Data Flow and Interactions

The system's data flow follows a primarily unidirectional pattern from edge to cloud, with specific control messages flowing in the reverse direction:

1. **Sensor Data Acquisition:** Environmental parameters are measured by sensor nodes in the edge layer.
2. **Edge Processing:** Nodes compute local fire risk scores through sensor fusion algorithms.
3. **LoRa Transmission:** Processed data and alert statuses are transmitted to the gateway using LoRaWAN protocol.
4. **Fog Layer Aggregation:** The gateway and local server aggregate data from multiple nodes, performing spatial correlation and redundancy checks.
5. **Alert Generation:** Based on configurable thresholds, the fog layer triggers appropriate alerts through local and remote channels.
6. **Cloud Synchronization:** Processed data is forwarded to the cloud platform using MQTT protocol.
7. **Long-term Storage and Analysis:** The cloud layer stores historical data and performs advanced analytics, trend identification, and visualization.
8. **Configuration Updates:** Parameter adjustments and firmware updates propagate from the cloud through the fog to edge nodes.

This structured approach enables effective fire detection while balancing multiple constraints, including energy limitations, communication reliability, processing capabilities, and deployment costs.

## 3.2 Edge Layer: Solar-Assisted Sensor Nodes

The edge layer forms the foundation of the forest fire detection system, comprising multiple sensor nodes deployed throughout the monitored area. Each node functions as an autonomous data acquisition and preliminary processing unit, integrating environmental sensing, local computation, wireless communication, and sustainable power generation.

### 3.2.1 Hardware Platform Selection

The Heltec LoRa ESP32 v2.1 development board serves as the primary hardware platform for the sensor nodes. This selection balances several critical factors:

**Processing Capabilities:** The ESP32 microcontroller (dual-core Tensilica LX6, 240 MHz) provides sufficient computational power for implementing sensor fusion algorithms while maintaining low power consumption.

**Integrated LoRa Connectivity:** The onboard SX1276 LoRa transceiver (with u.FL antenna connector) enables long-range communications crucial for forest deployment.

**Power Efficiency:** Advanced sleep modes (deep sleep current < 10 μA) support extended operation on limited energy budgets.

**Development Ecosystem:** Arduino compatibility and extensive library support facilitate rapid prototyping and implementation.

**Cost-Effectiveness:** The module's reasonable price point (approximately $20 USD per unit) contributes to the overall system affordability.

The ESP32's peripheral interfaces (I2C, SPI, UART, ADC) provide the flexibility required to integrate multiple sensor types, while its dual-core architecture allows separation of sensing/processing and communication tasks.

### 3.2.2 Sensor Suite Integration

The design incorporates a complementary suite of sensors for comprehensive environmental monitoring and reliable fire detection:

**BME680 Environmental Sensor:** This integrated sensor provides temperature (-40°C to 85°C, ±1.0°C accuracy), relative humidity (0-100%, ±3% accuracy), barometric pressure (300-1100 hPa, ±1 hPa accuracy), and gas resistance measurements in a single I2C-connected package. The BME680's low power consumption (3.7 μA at 1 Hz sampling) and high accuracy make it ideal for baseline environmental monitoring.

**MQ-2 Smoke Sensor:** This widely available metal oxide semiconductor (MOS) sensor detects smoke particles and combustible gases (particularly H₂, LPG, CH₄, CO, alcohol, propane). While relatively power-intensive (approximately 150 mA during heating), its high sensitivity to smoke—a critical indicator of fire—justifies its inclusion. The sensor interfaces through an analog output connected to the ESP32's ADC.

**MQ-7 Carbon Monoxide Sensor:** This sensor specifically detects CO concentrations between 20-2000 ppm, a key signature of incomplete combustion during forest fires. Like the MQ-2, it requires significant power (approximately 120 mA) but provides vital early detection capability. The MQ-7 connects through an analog interface.

**YG1006 IR Flame Sensor:** This digital sensor detects infrared radiation in the 760-1100 nm wavelength range, responding to flickering flames up to 1 meter away with an approximately 60° detection angle. Its extremely low power consumption (< 15 mA) and digital output (triggering when flames are detected) complement the gas-based sensors.

**u-blox NEO-M8N GPS Module:** This GNSS receiver provides location data (±2.5m accuracy) and time synchronization for the sensor node. While consuming significant power during active operation (approximately 67 mA), its duty cycle is carefully managed, activating only during initial deployment and periodic updates.

This multi-modal sensing approach significantly enhances detection reliability by monitoring diverse fire signatures simultaneously. Figure 3.2 illustrates the sensor node hardware architecture, showing the interconnections between components.

### 3.2.3 Solar Power Subsystem

Energy autonomy represents a fundamental requirement for long-term deployment in remote forest environments. The power subsystem incorporates solar energy harvesting with battery storage and intelligent power management to ensure continuous operation:

**Photovoltaic Panel Selection:** A 6W (12V nominal) monocrystalline silicon panel with dimensions of 200 × 220 mm provides the primary energy input. This capacity was determined through power budget analysis, allowing sufficient energy harvest even under suboptimal conditions (partial shade, cloudy days). Monocrystalline technology was selected for its superior efficiency (approximately 21%) and performance in variable lighting.

**MPPT Charge Controller:** The system employs the CN3791 Maximum Power Point Tracking controller to optimize energy extraction from the PV panel. This IC implements the Perturb and Observe (P&O) algorithm, continuously adjusting the operating point to maximize power output under varying illumination and temperature conditions. Figure 3.3 illustrates the MPPT-based charging circuit.

**Energy Storage:** A 3.7V, 5200mAh lithium-ion battery (18650 form factor) serves as the primary energy storage element. This capacity provides approximately 10 days of autonomy during complete lack of solar input (based on the power budget detailed in Chapter 6). The system includes over-voltage, under-voltage, and over-current protection circuits to ensure safe operation.

**Power Management:** The MCP1700 low-dropout (LDO) regulator provides a stable 3.3V supply to the ESP32 and sensors, while a separate regulator handles the higher voltages required for the MQ-series sensors. Power to these sensors is controlled through MOSFET switches, enabling them to be completely deactivated during sleep intervals.

The power subsystem design includes monitoring capabilities, with the ESP32 measuring battery voltage, charging current, and solar panel output through its ADC channels. This data enables adaptive power management strategies, with the node dynamically adjusting its duty cycle based on available energy.

### 3.2.4 Node Enclosure and Environmental Protection

For successful deployment in forest environments, sensor nodes must withstand various environmental challenges, including precipitation, humidity, temperature fluctuations, and potential physical disturbances. The node enclosure provides appropriate protection while ensuring optimal sensor operation:

**Housing Design:** A custom-designed IP65-rated enclosure (160 × 120 × 60 mm) houses the electronic components, featuring:
- UV-resistant ABS material for long-term outdoor exposure
- Integrated mounting brackets for attachment to trees or poles
- Passive ventilation system with waterproof membranes to prevent condensation while maintaining environmental isolation
- Transparent windows for the flame sensor
- Screened openings for the gas sensors with replaceable dust filters

**Temperature Management:** The enclosure incorporates passive thermal management features, including:
- External sun shield to reduce solar heating
- Internal reflective coating to minimize heat absorption
- Thermal isolation between power electronics and sensitive sensors

**Mounting Considerations:** The design includes an adjustable mounting system allowing the solar panel to be oriented for optimal solar exposure (typically facing south or north depending on hemisphere, with inclination approximately equal to the location's latitude). The sensor section maintains a fixed orientation toward the monitored area.

Testing results for enclosure performance under simulated environmental conditions are presented in Chapter 6, demonstrating the design's effectiveness in protecting electronic components while maintaining accurate sensor readings.

## 3.3 Fog Layer: LoRaWAN Gateway & Local Server

The fog layer bridges the communication gap between distributed sensor nodes and cloud infrastructure, providing intermediate processing capabilities, local storage, and alert generation. This layer serves a critical role in ensuring system resilience during network disruptions while reducing bandwidth requirements for cloud communication.

### 3.3.1 LoRaWAN Gateway Architecture

The gateway serves as the central communication hub for the sensor network, receiving LoRaWAN transmissions from all nodes within range and forwarding processed data to the local server and cloud infrastructure:

**Hardware Platform:** The implementation utilizes the RAK7258 Micro Gateway, featuring:
- Semtech SX1301 baseband processor with eight parallel demodulation paths, supporting multiple spreading factors simultaneously
- 8-channel operation in the 868 MHz (EU) or 915 MHz (US/AU) ISM bands
- Transmit power up to 27 dBm
- Ethernet and Wi-Fi backhaul connectivity options
- Built-in omnidirectional antenna with 2 dBi gain
- Outdoor-rated IP65 enclosure

**Deployment Configuration:** The gateway is positioned centrally within the monitored area, mounted at sufficient elevation (typically 6-10 meters) to maximize coverage range. Theoretical coverage extends to approximately 5 km radius in open terrain, though dense forest conditions reduce this range to approximately 2-3 km (as validated in the experiments presented in Chapter 6).

**Power Supply:** The gateway operates on 12V DC power, supplied through either:
- A dedicated solar power system (100W panel with 50Ah battery) for remote deployments
- Grid power with UPS backup for installations with available infrastructure

**Network Server:** The gateway incorporates a lightweight LoRaWAN Network Server (LNS) implementation based on ChirpStack, handling:
- Device authentication and join procedures
- Frame counter validation and duplicate packet elimination
- Adaptive data rate (ADR) management
- MAC layer command processing

This integrated gateway approach simplifies deployment in remote locations by reducing the number of separate components and connections required.

### 3.3.2 Fog Server Implementation

The local server functions as the computational core of the fog layer, performing immediate data processing, temporal and spatial correlation, and alert generation. Figure 3.4 illustrates the logical architecture of the fog layer components.

**Hardware Platform:** The implementation utilizes a Raspberry Pi 4 Model B (4GB RAM) with the following peripherals:
- 128GB microSD storage for operating system and local database
- 1TB SSD connected via USB 3.0 for extended data storage
- Real-time clock module for timestamp reliability during network outages
- GPS module for location awareness and time synchronization
- Cellular modem (Quectel EC25-E) for backup connectivity where available

**Operating System and Containerization:** The server runs Raspberry Pi OS (64-bit) with Docker containers for service isolation and simplified deployment, including:
- LoRaWAN Network Server (ChirpStack) for device management
- MQTT broker (Eclipse Mosquitto) for pub/sub messaging
- Node-RED for visual flow-based programming
- InfluxDB for time-series data storage
- Grafana for local visualization

**Software Architecture:** The fog server implements several key functions:
- **Data Reception:** The server receives data from the gateway via MQTT, with dedicated topics for each sensor node.
- **Temporal Analysis:** Time-series processing identifies trends and anomalies in parameter values from individual nodes.
- **Spatial Correlation:** Readings from multiple nodes are compared to identify genuine events and filter false alarms.
- **Alert Logic:** Configurable threshold-based rules trigger appropriate alerts based on processed sensor data.
- **Local Storage:** Recent data (typically 30-60 days) is retained in the time-series database for offline analysis.
- **Data Forwarding:** Processed and filtered data is transmitted to the cloud layer when connectivity is available.

**Redundancy and Reliability:** The system implements several mechanisms to ensure continued operation under adverse conditions:
- Automated container restart on failure
- Scheduled backups of critical configuration
- Fallback operational modes during partial component failure
- Watchdog timers for monitoring system health

The fog layer is designed for autonomous operation, capable of maintaining essential fire detection and alerting functions even during extended periods without cloud connectivity.

### 3.3.3 Alert Subsystem

The fog layer incorporates a multi-channel alert system that can operate independently from cloud infrastructure, providing immediate notification through various communication paths:

**Local Visual and Audible Alerts:** The gateway installation includes:
- High-intensity LED beacon (amber/red) for visual alerts visible up to 1km
- 110dB siren with configurable patterns for audible notification
- These alerts are directly triggered via GPIO connections to the Raspberry Pi

**Short Message Service (SMS):** For areas with cellular coverage, the system sends text message alerts to predefined emergency contacts. The implementation utilizes:
- Quectel EC25-E modem with AT command interface
- Message queuing with retry logic for connectivity interruptions
- Delivery confirmation tracking

**Email Notifications:** When internet access is available, the system sends detailed alerts with contextual information:
- Sensor readings triggering the alert
- GPS coordinates of affected nodes
- Timestamp and detection confidence metrics
- Link to dashboard for additional information

**Radio Transmission (Optional):** For extremely remote deployments, the system can be extended with:
- VHF/UHF radio modem for long-range text messaging
- Integration with existing forestry service radio systems

All alert mechanisms are configurable through a unified interface, allowing customization of message content, recipients, and triggering thresholds.

## 3.4 Cloud Layer: Analytics & Visualization

The cloud layer provides comprehensive data storage, advanced analytics capabilities, and user interface components, complementing the real-time processing performed at lower layers. This layer leverages elastic resources to implement functions that would be impractical on constrained edge or fog hardware.

### 3.4.1 Infrastructure Selection

The implementation utilizes Amazon Web Services (AWS) as the cloud platform, balancing cost, performance, and service availability considerations. Key infrastructure components include:

**Compute Resources:** Amazon Elastic Compute Cloud (EC2) provides the core computational capabilities:
- t3.medium instance (2 vCPU, 4GB RAM) for standard operation
- Auto-scaling capability to t3.large during high-demand periods
- Amazon Linux 2 OS with Docker container deployment

**Storage Services:** The system leverages multiple storage options based on specific requirements:
- Amazon S3 for long-term data archiving and backup
- Amazon EBS (gp3, 200GB) for database and application storage
- Instance store for temporary processing

**Networking:** Secure communication is established through:
- Virtual Private Cloud (VPC) with appropriate subnet isolation
- Security groups restricting access to authorized sources
- TLS encryption for all data transmission
- VPN connectivity for administrative access

This infrastructure provides sufficient resources for managing approximately 100 sensor nodes while maintaining reasonable operational costs (estimated at $75-95 USD monthly).

### 3.4.2 Data Management Architecture

The cloud layer implements a comprehensive data management pipeline for processing, storing, and analyzing incoming sensor data:

**Ingestion Layer:** Incoming data from fog servers is received through:
- MQTT broker (AWS IoT Core) with appropriate authentication
- Message validation and transformation functions
- Rate limiting and throttling to manage traffic spikes

**Processing Pipeline:** The data undergoes several processing stages:
- Schema validation and normalization
- Enrichment with metadata (location information, node configuration)
- Aggregation for various time intervals (hourly, daily, weekly)
- Anomaly detection using statistical methods

**Storage Layer:** The processed data is stored in:
- InfluxDB for time-series data with retention policies (raw data: 90 days, aggregated data: multiple years)
- PostgreSQL for relational metadata (node configurations, alert history, system events)
- S3 for long-term archival in Parquet format

**Export Interfaces:** The system provides standardized access methods:
- REST API for programmatic data access
- CSV/JSON export for offline analysis
- Integration with external systems via webhooks

This architecture balances performance, cost, and data accessibility requirements while providing scalable storage for historical analysis.

### 3.4.3 Visualization and User Interface

The cloud layer provides comprehensive visualization tools and user interfaces for monitoring, analysis, and system management:

**Dashboard Implementation:** The primary interface utilizes Grafana, featuring:
- Real-time system overview with node health status
- Interactive maps showing node locations and fire risk levels
- Historical trend analysis with customizable time ranges
- Alert visualization and acknowledgment interface
- Custom dashboards for different user roles (operators, managers, researchers)

**Reporting Module:** The system generates scheduled and on-demand reports:
- Daily operational summaries
- Monthly system performance metrics
- Seasonal fire risk assessments
- Custom exports for specific analysis needs

**Administrative Interface:** A separate administrative portal provides:
- User management with role-based access control
- System configuration and parameter adjustment
- Firmware update management for edge and fog components
- Audit logging for security and compliance

Figure 3.5a illustrates the dashboard layout, while Figure 3.5b shows the administrative interface components.

## 3.5 Security & Communication Protocols

Security considerations are integrated throughout the system design, addressing threats and vulnerabilities appropriate to each layer while ensuring efficient communication.

### 3.5.1 Edge Layer Security

At the edge layer, security mechanisms balance protection requirements against severe resource constraints:

**Device Authentication:** Each sensor node implements LoRaWAN OTAA (Over-The-Air Activation) with unique device credentials:
- DevEUI: Factory-assigned 64-bit IEEE EUI
- AppEUI: Application identifier
- AppKey: AES-128 root key (securely provisioned during manufacturing)

**Payload Encryption:** Data transmission security utilizes:
- AES-128 encryption of all application payloads
- Message integrity checking with MIC calculation
- Frame counter validation to prevent replay attacks

**Physical Security:** The node design incorporates physical protection:
- Tamper-evident enclosure seals
- Removal detection through accelerometer monitoring
- Critical parameters stored in protected flash memory

These measures provide sufficient security for the deployment context while maintaining practical power and processing requirements.

### 3.5.2 Communication Protocols

The system implements different communication protocols at each interface, optimized for the specific requirements of each connection:

**Node-to-Gateway Communication:** LoRaWAN protocol provides long-range, low-power wireless connectivity:
- LoRaWAN 1.0.4 specification compliance
- Class A device operation for optimal power conservation
- Regional parameters appropriate to deployment location (EU868, US915, etc.)
- Spreading factor adaptation based on range requirements and link quality

**Gateway-to-Server Communication:** Local communication between the gateway and fog server utilizes:
- Ethernet connection (preferred) or Wi-Fi with WPA2-Enterprise
- MQTT over TLS for data transmission
- JSON message format with schema validation

**Fog-to-Cloud Communication:** Internet-based data transmission employs:
- MQTT over TLS 1.2 with client certificate authentication
- Compressed JSON payload format with binary sensor data encoding
- Configurable QoS levels (typically QoS 1) with message persistence
- HTTP REST API fallback for environments with restrictive firewall policies

**Administrative Access:** Management interfaces are secured through:
- HTTPS with modern TLS configuration (TLS 1.2+, strong cipher suites)
- Multi-factor authentication for all administrative accounts
- OAuth 2.0 based authorization with fine-grained permission model
- Rate limiting and brute-force protection

Each protocol selection balances security requirements, communication efficiency, power consumption, and compatibility with existing infrastructure.

### 3.5.3 Fog Layer Security

The fog layer implements intermediate security measures appropriate to its capabilities and exposure:

**Network Security:** The local network is protected through:
- Network segmentation with VLANs where supported
- Stateful firewall controlling all ingress/egress traffic
- Intrusion detection monitoring for suspicious activities
- MAC address filtering for authorized devices

**Service Protection:** Application services are secured via:
- Container isolation limiting impact of potential compromise
- Least-privilege execution for all services
- Regular automated updates for security patches
- Resource quotas preventing denial-of-service conditions

**Data Protection:** Local data is protected through:
- Filesystem encryption for sensitive information
- Access control limiting data visibility to authorized services
- Regular integrity checking for critical configuration
- Secure backup procedures with encryption

### 3.5.4 Cloud Layer Security

The cloud layer implements comprehensive security controls appropriate to internet-exposed infrastructure:

**Infrastructure Security:** The underlying platform is protected through:
- Virtual private cloud with limited internet exposure
- Bastion host architecture for administrative access
- Security groups restricting network access to minimum required ports
- Regular vulnerability scanning and remediation

**Application Security:** Cloud applications implement:
- Web application firewall protecting against OWASP Top 10 threats
- Input validation at all interfaces with parameter sanitization
- Output encoding preventing cross-site scripting attacks
- CSRF protection for all state-changing operations

**Data Security:** Cloud-stored information is protected via:
- Encryption at rest for all sensitive data
- Encryption in transit for all communications
- Data classification and handling according to sensitivity
- Retention policies and secure deletion procedures

**Identity and Access Management:** Access controls include:
- Role-based access with principle of least privilege
- Multi-factor authentication for all administrative users
- Comprehensive audit logging of all security-relevant actions
- Automated monitoring for suspicious access patterns

These security measures create defense-in-depth protection throughout the system, addressing threats appropriate to a forest fire detection system while remaining pragmatic about implementation costs and operational complexity.

## References

[90] M. A. Razzaque, M. Milojevic-Jevric, A. Palade, and S. Clarke, "Middleware for Internet of Things: A Survey," IEEE Internet of Things Journal, vol. 3, no. 1, pp. 70-95, Feb. 2016, doi: 10.1109/JIOT.2015.2498900.

[91] S. K. Datta, C. Bonnet, and N. Nikaein, "An IoT gateway centric architecture to provide novel M2M services," in IEEE World Forum on Internet of Things (WF-IoT), Seoul, South Korea, 2014, pp. 514-519, doi: 10.1109/WF-IoT.2014.6803221.

[92] W. Shi, J. Cao, Q. Zhang, Y. Li, and L. Xu, "Edge Computing: Vision and Challenges," IEEE Internet of Things Journal, vol. 3, no. 5, pp. 637-646, Oct. 2016, doi: 10.1109/JIOT.2016.2579198.

[93] J. A. Khan, H. K. Qureshi, and A. Iqbal, "Energy management in Wireless Sensor Networks: A survey," Computers & Electrical Engineering, vol. 41, pp. 159-176, Jan. 2015, doi: 10.1016/j.compeleceng.2014.06.009.

[94] P. Garcia Lopez et al., "Edge-centric Computing: Vision and Challenges," ACM SIGCOMM Computer Communication Review, vol. 45, no. 5, pp. 37-42, Oct. 2015, doi: 10.1145/2831347.2831354.

[95] F. Bonomi, R. Milito, J. Zhu, and S. Addepalli, "Fog computing and its role in the internet of things," in Proceedings of the first edition of the MCC workshop on Mobile cloud computing, Helsinki, Finland, 2012, pp. 13-16, doi: 10.1145/2342509.2342513.

[96] A. V. Dastjerdi and R. Buyya, "Fog Computing: Helping the Internet of Things Realize Its Potential," Computer, vol. 49, no. 8, pp. 112-116, Aug. 2016, doi: 10.1109/MC.2016.245.

[97] M. Satyanarayanan, P. Bahl, R. Caceres, and N. Davies, "The Case for VM-Based Cloudlets in Mobile Computing," IEEE Pervasive Computing, vol. 8, no. 4, pp. 14-23, Oct.-Dec. 2009, doi: 10.1109/MPRV.2009.82.

[98] C. Mouradian, D. Naboulsi, S. Yangui, R. H. Glitho, M. J. Morrow, and P. A. Polakos, "A Comprehensive Survey on Fog Computing: State-of-the-Art and Research Challenges," IEEE Communications Surveys & Tutorials, vol. 20, no. 1, pp. 416-464, 2018, doi: 10.1109/COMST.2017.2771153.

[99] N. Chen, Y. Chen, Y. You, H. Ling, P. Liang, and R. Zimmermann, "Dynamic Urban Surveillance Video Stream Processing Using Fog Computing," in IEEE Second International Conference on Multimedia Big Data (BigMM), Taipei, Taiwan, 2016, pp. 105-112, doi: 10.1109/BigMM.2016.53.

[100] Y. Ai, M. Peng, and K. Zhang, "Edge computing technologies for Internet of Things: a primer," Digital Communications and Networks, vol. 4, no. 2, pp. 77-86, Apr. 2018, doi: 10.1016/j.dcan.2017.07.001.
