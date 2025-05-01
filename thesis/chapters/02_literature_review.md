# Chapter 2: Literature Review

## 2.1 Introduction

This chapter provides a systematic review of existing literature relevant to the design and implementation of solar-assisted WSN-LoRa systems for forest fire detection. The analysis encompasses several key domains: traditional and emerging fire detection methodologies, the application of wireless sensor networks in environmental monitoring contexts, the technical specifications and operational characteristics of LoRa/LoRaWAN communication protocols, energy harvesting approaches for WSN nodes with emphasis on solar technologies, the evolution of distributed computing architectures (edge-fog-cloud), and standardized IoT data transmission protocols. The review synthesizes research published prior to mid-2022, establishing the theoretical foundation for the proposed system while identifying significant research gaps addressed by this thesis.

## 2.2 Traditional and Emerging Fire-Detection Methods

Forest fire detection methodologies have evolved significantly, progressing from manual observation techniques to sophisticated technological solutions. Traditional approaches, while forming the historical backbone of fire management, demonstrate substantial limitations in terms of coverage area, detection speed, and resource requirements.

### 2.2.1 Traditional Methods

Human-based monitoring constitutes the oldest approach to fire detection. Manned lookout towers, strategically positioned at elevated locations to maximize visual coverage, have historically formed the primary detection mechanism [14]. These towers, typically staffed during fire seasons, enable direct visual scanning for smoke plumes. This methodology, while straightforward in implementation, suffers from significant limitations: restricted visibility under adverse weather conditions, inherent human vigilance limitations, substantial personnel requirements, and coverage constraints dictated by terrain features [15]. Ground patrols, involving personnel traversing defined routes through high-risk areas, supplement fixed observation points but face similar efficiency challenges across extensive territories.

Aircraft patrols emerged as an expansion of these traditional methods, offering broader visual coverage through fixed-wing aircraft or helicopters conducting systematic reconnaissance flights. While improving coverage, aerial surveys remain constrained by flight endurance limitations, operational expenses, and dependency on favorable weather conditions [16]. Furthermore, none of these traditional methods enable continuous 24-hour monitoring, creating substantial temporal gaps in surveillance coverage.

### 2.2.2 Satellite-Based Detection

Satellite remote sensing represents a technological advancement that addressed many limitations of traditional methods, enabling large-scale monitoring across extensive territories. Systems such as MODIS (Moderate Resolution Imaging Spectroradiometer) aboard NASA's Terra and Aqua satellites, and VIIRS (Visible Infrared Imaging Radiometer Suite) on NOAA satellites, incorporate algorithms designed to detect thermal anomalies indicative of active fires [17]. These platforms typically utilize middle-infrared (MIR) and thermal-infrared (TIR) spectral bands to identify potential fire locations based on their radiative signatures.

While satellite monitoring enables unprecedented coverage scope, it encounters significant constraints: temporal resolution limitations (revisit periods potentially exceeding 12 hours for specific locations), spatial resolution restrictions (pixel sizes often exceeding 375m), susceptibility to cloud interference, and detection thresholds that may overlook small incipient fires [18]. These factors collectively limit satellite systems' effectiveness for early-stage fire detection, though they remain valuable for large-scale fire tracking and post-fire assessment.

### 2.2.3 Computer Vision and Image Processing

Computer vision approaches represent a significant advancement in automated fire detection, utilizing cameras (visible spectrum, near-infrared, or thermal) deployed at strategic locations. These systems employ image processing algorithms designed to identify characteristic visual signatures of smoke plumes or flames [19]. Recent developments incorporate deep learning algorithms, particularly convolutional neural networks (CNNs), to enhance detection accuracy while reducing false positives [20]. Commercial implementations include tower-mounted camera networks like ALERTWildfire in North America, which combine high-resolution pan-tilt-zoom capabilities with AI-based detection systems [21].

The effectiveness of these systems is constrained by line-of-sight requirements, camera positioning limitations, and potential degradation under poor visibility conditions. The substantial infrastructure costs associated with tower construction, camera procurement, and network connectivity represent additional implementation barriers [19].

### 2.2.4 Unmanned Aerial Vehicles (UAVs)

UAV deployment for fire detection has gained significant research attention, offering enhanced mobility and operational flexibility compared to fixed monitoring systems. Drones equipped with various sensor payloads (RGB cameras, thermal imaging, multispectral sensors) can conduct systematic or targeted surveillance missions [22]. Advanced implementations incorporate onboard image processing or machine learning algorithms for real-time fire detection, potentially transmitting alerts to control centers when anomalies are identified [23].

Despite their advantages, UAVs face substantial operational constraints in wildfire monitoring contexts: limited flight endurance (typically 20-90 minutes for small/medium platforms), weather sensitivity, regulatory restrictions in many jurisdictions, and the logistical challenges associated with continuous operations across large territories [22]. These factors position UAVs as valuable complementary tools rather than comprehensive monitoring solutions.

### 2.2.5 Wireless Sensor Networks

WSN deployment for fire detection represents a paradigm shift toward distributed, in-situ environmental monitoring [24]. These networks comprise multiple sensor nodes strategically distributed throughout monitored areas, each equipped with relevant environmental sensors: temperature, humidity, gas concentration (CO, CO₂), smoke, flame, and occasionally atmospheric pressure [25]. The nodes communicate wirelessly to transmit their measurements to centralized gateways or processing centers.

The fundamental advantage of WSN approaches lies in direct environmental parameter measurement at ground level, potentially detecting subtle changes indicative of fire ignition before visual manifestations (smoke, flame) become apparent [26]. This capability enables detection of smoldering conditions or sub-canopy fires that might remain undetected by visual or satellite systems during critical early stages [27].

WSN implementations face several technical challenges: communication range limitations in forested environments, energy constraints for battery-powered nodes, environmental durability requirements, and the need for robust detection algorithms to minimize false alarms while maintaining sensitivity [28]. Early research primarily utilized short-range communication protocols (e.g., ZigBee, Wi-Fi), limiting practical deployment scale in extensive forest territories [29]. The emergence of LPWAN technologies, particularly LoRa/LoRaWAN, has created new possibilities for large-scale WSN deployment in remote areas [30].

## 2.3 WSNs for Environmental Monitoring

Wireless Sensor Networks have demonstrated exceptional utility across diverse environmental monitoring applications, leveraging their ability to provide spatially distributed, real-time measurements from remote or challenging locations [31]. The fundamental WSN architecture incorporates distributed sensor nodes, communication infrastructure, and centralized data collection/processing facilities.

### 2.3.1 WSN Architecture and Components

A typical WSN node integrates several functional subsystems: sensing elements (transducers), processing capabilities (microcontroller), communication modules (radio transceiver), and power supply (batteries, energy harvesting) [32]. Nodes are typically designed to minimize size, cost, and energy consumption while maximizing operational reliability.

The sensing subsystem incorporates transducers that convert environmental parameters into electrical signals, including temperature sensors (thermistors, thermocouples, integrated circuits), humidity sensors (capacitive, resistive), gas sensors (electrochemical, metal oxide semiconductor), optical sensors (photodiodes, phototransistors), and other application-specific elements [33]. Signal conditioning circuitry ensures compatibility between transducer outputs and microcontroller input requirements.

The processing subsystem typically utilizes low-power microcontrollers (e.g., ARM Cortex-M series, ESP32, PIC) to perform sensor reading, data processing, communication management, and power optimization functions [34]. Limited computational resources necessitate efficient software design, particularly regarding memory utilization and processor duty cycle management.

Communication subsystems implement wireless data transmission using various protocols depending on range requirements, data rates, and energy constraints. Short-range options include IEEE 802.15.4-based standards (ZigBee, Thread), Bluetooth Low Energy (BLE), and proprietary sub-GHz protocols, while long-range applications increasingly utilize LPWAN technologies (LoRaWAN, Sigfox, NB-IoT) [35].

Network topologies in WSN implementations include star configurations (all nodes communicate directly with central coordinator), mesh networks (nodes form interconnected communication paths), tree structures (hierarchical organization), and hybrid approaches [36]. Topology selection significantly influences network reliability, energy consumption patterns, and scalability characteristics.

### 2.3.2 Energy Efficiency Considerations

Energy efficiency represents the primary operational constraint for most WSN implementations, particularly in remote deployment contexts where regular maintenance is impractical [37]. Multiple strategies have been developed to address this challenge:

Low-power hardware selection constitutes the foundation of energy-efficient design, incorporating microcontrollers with advanced sleep modes, efficient voltage regulators, and components specifically designed for battery-powered applications [38]. Circuit-level optimization techniques include power gating (completely disconnecting unused subsystems) and dynamic voltage and frequency scaling (adjusting operating parameters based on processing requirements).

Communication optimization represents another critical aspect, as radio transmission typically dominates the energy budget in many applications [39]. Techniques include transmission power control (adjusting output power based on link quality requirements), duty cycling (periodically deactivating the radio), and data compression (reducing transmission payload size) [40].

MAC protocol design significantly influences energy consumption, with protocols like S-MAC, T-MAC, and X-MAC specifically developed to minimize idle listening (the primary energy consumption mechanism in many radio systems) while maintaining acceptable latency characteristics [41]. Routing protocol optimization similarly focuses on energy-balanced data paths to maximize network lifetime [42].

Operational strategies to extend WSN lifetime include adaptive sampling (varying measurement frequency based on observed conditions or available energy) and event-driven activation (remaining dormant until specific threshold conditions are detected) [43]. These approaches are particularly relevant for environmental monitoring applications where continuous high-frequency sampling may be unnecessary.

### 2.3.3 Environmental Monitoring Applications

WSNs have been successfully deployed across diverse environmental monitoring contexts. Agricultural applications include soil moisture monitoring, microclimate tracking, and irrigation control systems [44]. Water quality monitoring implementations measure parameters such as pH, dissolved oxygen, conductivity, and specific contaminants in rivers, lakes, and coastal environments [45]. Air quality monitoring networks track particulate matter concentrations, greenhouse gases, and pollutants in urban, industrial, and natural settings [46].

Habitat monitoring represents another significant application domain, with WSNs deployed to track wildlife movements, monitor endangered species, and quantify ecosystem dynamics with minimal human interference [47]. Structural health monitoring applications assess the integrity of bridges, buildings, and infrastructure using vibration sensors, strain gauges, and accelerometers connected through WSN architectures [48].

WSN deployment for natural disaster monitoring includes earthquake early warning systems, landslide detection networks, flood monitoring installations, and the focus of this thesis - forest fire detection systems [49]. These applications typically require robust hardware design, reliable long-distance communication, efficient power management, and specialized detection algorithms to provide effective early warnings while minimizing false alarms.

## 2.4 LoRa/LoRaWAN in Long-Range IoT

The requirement for long-range, low-power communication in IoT applications has driven the development of multiple LPWAN (Low Power Wide Area Network) technologies. Among these, LoRa and its associated network protocol LoRaWAN have gained significant adoption due to their favorable characteristics for remote monitoring applications.

### 2.4.1 LoRa Technology Fundamentals

LoRa (Long Range) refers specifically to the physical layer modulation technique developed by Semtech Corporation. The technology employs Chirp Spread Spectrum (CSS) modulation, which spreads a narrowband signal across a wider frequency channel, creating a chirp signal that increases or decreases in frequency over time [50]. This approach provides exceptional receiver sensitivity, achieving reliable communication at signal levels below the noise floor in many deployment scenarios.

Key technical parameters that characterize LoRa modulation include:
- Spreading Factor (SF): Defines the number of chips per symbol (2^SF), with values typically ranging from SF7 to SF12. Higher spreading factors increase communication range and improve receiver sensitivity at the cost of reduced data rate and increased time-on-air [51].
- Bandwidth (BW): Specifies the frequency range occupied by the modulated signal (typically 125 kHz, 250 kHz, or 500 kHz). Wider bandwidths enable higher data rates but reduce sensitivity [52].
- Coding Rate (CR): Defines the level of forward error correction applied to the transmission (4/5, 4/6, 4/7, or 4/8). Higher coding rates improve error resilience at the cost of reduced effective data rate [53].

The adjustable nature of these parameters enables dynamic balancing of range, data rate, and energy consumption based on specific application requirements and deployment conditions. For example, while SF7 with 125 kHz bandwidth achieves approximately 5 kbps data rate with moderate range, SF12 with 125 kHz bandwidth achieves considerably longer range but reduces data rate to approximately 290 bps [54].

LoRa operates in unlicensed ISM (Industrial, Scientific, and Medical) frequency bands, with specific allocations varying by geographic region: 868 MHz in Europe, 915 MHz in North America, 433 MHz in Asia, and other regional variants [55]. This approach eliminates licensing costs but introduces regulatory compliance requirements regarding duty cycle limitations, maximum transmission power, and channel access mechanisms.

### 2.4.2 LoRaWAN Network Architecture

LoRaWAN defines the network protocol and system architecture built upon the LoRa physical layer [56]. The protocol is maintained and standardized by the LoRa Alliance, ensuring interoperability between different vendors' implementations. LoRaWAN implements a star-of-stars topology, where end-devices communicate bidirectionally with network gateways, which in turn connect to centralized network servers using standard IP backhaul connections.

End devices (sensor nodes) operate in one of three classes:
- Class A: The most energy-efficient configuration, where devices initiate all communications and open brief receive windows after each uplink transmission. This approach maximizes battery life but introduces potential downlink latency.
- Class B: Extends Class A functionality with scheduled receive windows synchronized by gateway beacons, enabling more predictable downlink communication at the cost of increased energy consumption.
- Class C: Maintains continuous receive availability except during transmission, minimizing downlink latency but significantly increasing power consumption. This class is typically suitable only for mains-powered devices [57].

Gateways function as transparent bridges, converting LoRa RF packets to IP packets and vice versa. Multi-channel gateways simultaneously demodulate multiple signals across different frequency channels and spreading factors, substantially increasing network capacity [58]. A single gateway can theoretically support thousands of end-devices, though practical limitations regarding duty cycle restrictions and potential collisions reduce this capacity in real-world deployments.

The LoRaWAN Network Server (LNS) manages the entire network: handling MAC layer functions, deduplicating messages received by multiple gateways, managing device activation, controlling adaptive data rate mechanisms, and forwarding application payloads to the appropriate application servers [59]. This centralized architecture simplifies end-device implementation while enabling sophisticated network management.

### 2.4.3 LoRaWAN Security Features

LoRaWAN implements comprehensive security mechanisms to ensure data confidentiality, integrity, and authentication. The protocol utilizes AES-128 encryption with several distinct keys:
- Network Session Key (NwkSKey) secures communication between the end-device and network server
- Application Session Key (AppSKey) encrypts application payload data between the end-device and application server [60]

Device activation occurs through either Over-The-Air Activation (OTAA) or Activation By Personalization (ABP). OTAA, the preferred method, implements a join procedure where devices and network exchange nonces to derive unique session keys, providing stronger security through dynamic key generation. ABP uses pre-provisioned keys, simplifying deployment but potentially reducing security if keys are not properly managed [61].

Message integrity is verified using a Message Integrity Code (MIC) calculated using the NwkSKey, protecting against tampering and replay attacks. Frame counters track message sequence to prevent replay attacks, though implementations must carefully manage counter state during device resets [62].

### 2.4.4 Performance Characteristics

LoRaWAN performance characteristics have been extensively evaluated in various environmental conditions. Achievable communication range varies significantly based on deployment environment, spreading factor, transmission power, antenna configuration, and regional regulations:
- Urban environments typically achieve 2-5 km range
- Suburban deployments demonstrate 5-10 km range
- Rural/open areas report ranges exceeding 10 km in favorable conditions
- Dense forest environments significantly reduce effective range, often limiting communication to 1-3 km depending on vegetation density and topography [63]

Data rates range from approximately 0.3 kbps to 50 kbps depending on parameter selection (SF, bandwidth, coding rate) and regional band specifications [64]. This relatively low throughput is generally sufficient for environmental monitoring applications where sensor readings generate limited data volumes.

Energy efficiency represents a primary LoRaWAN advantage for battery-powered deployments. Class A devices can achieve multi-year operation on standard batteries when implementing appropriate sleep intervals between transmissions. Power consumption scales with spreading factor (higher SF increases transmission duration) and transmission frequency [65].

Network capacity faces theoretical limitations due to the ALOHA-based channel access mechanism. Dense deployments may experience increased collision probabilities, particularly when using higher spreading factors with longer time-on-air. Mitigation strategies include careful channel planning, adaptive data rate implementation, and thoughtful transmission scheduling [66].

## 2.5 Powering WSN Nodes: Solar & Batteries

Energy supply represents the primary operational constraint for WSN deployments in remote environments. Various approaches have been developed to address this challenge, with solar energy harvesting emerging as a particularly viable solution for outdoor applications.

### 2.5.1 Energy Requirements and Constraints

WSN nodes exhibit distinct energy consumption profiles characterized by:
- Sensing operations: Energy required for sensor activation, stabilization, and measurement acquisition
- Processing activities: Computation energy for data processing, filtering, compression, and analysis
- Communication functions: Typically dominating the energy budget, particularly for long-range transmission
- Sleep/standby modes: Low-power states between active operations [67]

Quantitative energy requirements vary substantially based on specific hardware configurations, but typical values for environmental monitoring nodes range from tens to hundreds of microamperes in sleep mode and tens to hundreds of milliamperes during active periods [68]. The duty cycle (ratio of active to total time) dramatically influences average energy consumption, with many environmental monitoring applications implementing cycles below 1% to maximize operational lifetime [69].

Traditional battery-powered approaches face significant limitations in long-term remote deployments. Primary (non-rechargeable) batteries offer high energy density but require periodic replacement, introducing maintenance requirements and environmental concerns. Battery performance degradation occurs under environmental extremes (particularly high temperatures common in forest environments), and self-discharge gradually reduces available capacity even during inactive periods [70].

### 2.5.2 Energy Harvesting Approaches

Energy harvesting technologies capture ambient energy from environmental sources, converting it to electrical power to extend or perpetuate node operation. Multiple harvesting approaches have been investigated for WSN applications:

- Solar (photovoltaic) harvesting converts light energy to electricity using semiconductor materials. This approach offers the highest power density for outdoor deployments (typically 10-100 mW/cm² under direct sunlight), though actual yield varies with incident radiation, panel efficiency, orientation, shading, and environmental conditions [71].
- Thermal energy harvesting utilizes thermoelectric generators to convert temperature differentials into electrical power. While potentially applicable in specific contexts (equipment surfaces, industrial environments), natural thermal gradients in forest environments typically provide insufficient energy density for practical WSN operation [72].
- Kinetic energy harvesting captures mechanical energy through piezoelectric, electromagnetic, or electrostatic mechanisms. Environmental vibration sources (wind-induced movement, rainfall impact) generally provide insufficient power density for continuous WSN operation in forest contexts [73].
- RF energy harvesting captures ambient radio frequency signals, but power density in remote natural environments falls well below practical harvesting thresholds [74].

Among these options, solar energy harvesting represents the most viable approach for forest monitoring applications, offering substantially higher power density and technological maturity compared to alternatives.

### 2.5.3 Solar Energy Harvesting System Design

Effective solar harvesting systems for WSN applications incorporate several key components:

The photovoltaic panel selection critically influences system performance. Monocrystalline panels typically offer higher efficiency (17-22%) but at increased cost, while polycrystalline alternatives provide moderate efficiency (15-17%) at lower cost points [75]. Amorphous silicon panels offer better performance under diffuse light conditions but demonstrate lower overall efficiency (8-12%). Panel sizing must balance energy generation capacity against physical size constraints, particularly for deployments on trees or poles [76].

Maximum Power Point Tracking (MPPT) circuits optimize energy extraction from PV panels by dynamically adjusting the operating point (voltage/current) to maximize power output under varying illumination and temperature conditions [77]. MPPT algorithms include:
- Perturb and Observe (P&O): Iteratively adjusts operating voltage while monitoring power output, moving toward the maximum power point. This approach offers implementation simplicity but may oscillate around the optimal point and demonstrates suboptimal performance under rapidly changing conditions [78].
- Incremental Conductance (IC): Calculates the derivative of panel power with respect to voltage, enabling more precise MPP identification. This method typically achieves better tracking efficiency, particularly under variable conditions, but requires more complex implementation [79].
- Fractional Open Circuit Voltage: Utilizes the approximately linear relationship between optimal operating voltage and open circuit voltage, requiring periodic disconnection to measure Voc. While computationally simpler, this approach sacrifices some extraction efficiency [80].

Energy storage elements buffer harvested energy to support operation during insufficient harvesting periods (night, heavy cloud cover, seasonal variations). Rechargeable battery technologies evaluated for WSN applications include:
- Lithium-Ion (Li-ion): Offers high energy density (150-250 Wh/kg), low self-discharge, and no memory effect. However, these batteries require protection circuits, demonstrate moderate cycle life (500-1000 cycles), and experience performance degradation at temperature extremes [81].
- Lithium Iron Phosphate (LiFePO₄): Provides enhanced safety, excellent thermal stability, and extended cycle life (2000+ cycles) compared to standard Li-ion, though with reduced energy density (90-120 Wh/kg) [82].
- Nickel-Metal Hydride (NiMH): Presents moderate energy density (60-120 Wh/kg) with good temperature tolerance but suffers from higher self-discharge rates compared to lithium-based alternatives [83].

Supercapacitors offer an alternative or complementary storage approach, providing exceptional cycle life (100,000+ cycles), high power density, and excellent temperature performance, though with substantially lower energy density (5-15 Wh/kg) compared to batteries [84]. Hybrid approaches combining supercapacitors with batteries leverage the complementary characteristics of both technologies.

Power management circuitry provides regulated supply voltages to various system components, implementing efficient DC-DC conversion to minimize energy losses [85]. Advanced designs incorporate dynamic power paths, intelligently routing power directly from harvester to load during sufficient illumination while managing battery charging/discharging as needed.

### 2.5.4 Energy Management Strategies

Effective energy management requires both hardware optimization and software strategies to maximize operational lifetime. Energy-aware algorithm design emphasizes computational efficiency, minimizing processor active time while leveraging low-power modes when possible [86].

Adaptive duty cycling dynamically adjusts the node's activity pattern based on available energy and application requirements. During periods of abundant energy harvesting, the system may increase sensing frequency or communication rate. Conversely, when energy reserves decline, the system reduces activity to preserve essential functions [87].

Energy-neutral operation represents the ideal state where harvested energy equals or exceeds consumption over a defined time period, enabling perpetual operation. Achieving this state requires careful system design, particularly regarding panel sizing, storage capacity, and consumption patterns [88].

Predictive energy management incorporates historical data and environmental models to forecast future energy availability, enabling more sophisticated activity planning. Solar irradiance often follows predictable daily and seasonal patterns that can inform proactive energy allocation [89].

## 2.6 Edge-Fog-Cloud Architectures

The evolution of distributed computing paradigms has transformed IoT system architectures, progressing from cloud-centric approaches toward multi-tier models that distribute processing across edge devices, intermediate fog nodes, and centralized cloud infrastructure.

### 2.6.1 Traditional Cloud Computing

Early IoT implementations predominantly utilized centralized cloud architectures, where edge devices functioned primarily as data acquisition points, transmitting raw sensor readings to cloud platforms for processing, storage, and analysis [90]. This approach leverages the cloud's substantial computational resources, storage capacity, and sophisticated analytics capabilities, but introduces significant challenges:
- Latency: The physical and network distance between sensors and cloud infrastructure introduces communication delays that may prove unacceptable for time-sensitive applications like fire detection.
- Bandwidth consumption: Transmitting all raw data to the cloud requires substantial communication bandwidth, introducing cost and reliability concerns.
- Reliability dependencies: Cloud-centric architectures create critical dependencies on continuous network connectivity between edge devices and cloud infrastructure.
- Privacy and security implications: Transmitting all data to cloud platforms may raise privacy concerns and expand the attack surface for potential security breaches [91].

These limitations have driven the development of distributed architectures that strategically distribute processing tasks across multiple tiers.

### 2.6.2 Edge Computing Paradigm

Edge computing shifts computational tasks closer to data sources, performing processing directly on devices where data originates [92]. In WSN contexts, edge computing implements data analysis algorithms directly on sensor nodes or gateways, enabling:
- Immediate local decision-making: Critical events can trigger immediate responses without cloud communication delays.
- Data volume reduction: Preprocessing at the edge allows transmission of analysis results rather than raw data streams, substantially reducing bandwidth requirements.
- Enhanced privacy preservation: Sensitive data can be processed locally with only anonymized or aggregated information transmitted upstream.
- Reduced cloud dependencies: Basic functionality can be maintained during cloud connectivity interruptions [93].

Resource constraints represent the primary edge computing limitation. Sensor nodes typically feature restricted computational capabilities, limited memory, and tight energy budgets, constraining algorithm complexity and processing scope [94]. Despite these limitations, even simple edge processing (thresholding, basic fusion algorithms, anomaly detection) can significantly enhance overall system performance.

### 2.6.3 Fog Computing Layer

Fog computing introduces an intermediate processing tier between edge devices and cloud infrastructure [95]. Fog nodes typically comprise more capable hardware (gateways, local servers) positioned near the network edge, offering greater computational resources than sensor nodes while avoiding cloud communication latencies.

In fire detection contexts, fog computing can perform functions exceeding edge node capabilities:
- Spatial correlation analysis: Comparing readings from multiple nearby nodes to identify patterns indicative of genuine fire events while filtering potential false alarms
- Temporal trend evaluation: Analyzing parameter change rates over time to identify developing fire conditions
- Local data storage: Maintaining recent historical data to support analysis and provide continuity during cloud connectivity interruptions
- Localized alerting: Triggering emergency notifications through local channels without cloud dependencies [96]

Fog computing significantly enhances IoT system resilience, particularly in applications with intermittent cloud connectivity - a common scenario in remote forest deployments [97]. The fog layer enables continued operation during connectivity interruptions, buffering data and maintaining essential alerting capabilities.

### 2.6.4 Multi-Tier Integration: Edge-Fog-Cloud Architecture

Integrating edge, fog, and cloud capabilities creates a comprehensive architecture that optimizes processing distribution across available resources [98]. Each tier performs functions aligned with its specific capabilities:
- Edge tier (sensor nodes): Data acquisition, initial filtering, basic fusion algorithms, simple event detection, aggressive power management
- Fog tier (gateways, local servers): Data aggregation from multiple nodes, more sophisticated analysis, spatial correlation, temporal pattern detection, local storage, primary alerting functions
- Cloud tier (platform services): Long-term data storage, advanced analytics, machine learning model training, global visualization, user access management, integration with enterprise systems [99]

This hierarchical approach enables robust, responsive fire detection while optimizing resource utilization. Critical detection and alerting functions remain operational even during cloud connectivity interruptions, while the cloud provides comprehensive data analysis, visualization, and integration capabilities when connectivity is available [100].

## 2.7 IoT Data Protocols: MQTT, CoAP, HTTP

Effective communication between system components requires appropriate protocol selection based on specific requirements regarding messaging patterns, reliability, overhead, and implementation complexity. Multiple standardized protocols have emerged to address IoT communication needs.

### 2.7.1 MQTT (Message Queuing Telemetry Transport)

MQTT implements a lightweight publish-subscribe messaging pattern specifically designed for constrained devices and networks [101]. The protocol utilizes a central broker architecture, where clients publish messages to specific topics and other clients subscribe to topics of interest.

Key MQTT characteristics include:
- Minimal overhead: The binary protocol format minimizes transmission size (2-byte fixed header plus variable components).
- Quality of Service (QoS) options: Three levels (0: at most once, 1: at least once, 2: exactly once) provide flexible reliability versus overhead trade-offs.
- Session awareness: Persistent sessions maintain subscription state during client disconnections.
- Last Will and Testament (LWT): Enables notification of abnormal client disconnections.
- Retained messages: Stores the last message on each topic for immediate delivery to new subscribers [102].

MQTT operates over TCP/IP, ensuring reliable transport while introducing some connection establishment overhead. The protocol demonstrates excellent suitability for many-to-many communication patterns where multiple subscribers may require the same data. These characteristics position MQTT advantageously for sensor data transmission from fog to cloud layers, where reliability and multiple data consumers are common requirements [103].

### 2.7.2 CoAP (Constrained Application Protocol)

CoAP provides a lightweight alternative to HTTP specifically designed for constrained devices and networks [104]. The protocol implements a request-response model similar to HTTP but optimized for efficiency and typically operates over UDP.

Distinguished CoAP features include:
- Compact binary format: Minimal 4-byte base header reduces protocol overhead.
- REST compatibility: Supports familiar GET, POST, PUT, DELETE methods, facilitating integration with web services.
- Built-in resource discovery: Enables dynamic resource identification.
- Observe extension: Provides publish-subscribe functionality for resource state changes.
- Confirmable/Non-confirmable messages: Optional reliability mechanisms for UDP transport [105].

CoAP's UDP foundation reduces connection overhead, making it particularly suitable for energy-constrained devices and lossy networks. The protocol provides an excellent balance between HTTP familiarity and IoT optimization, though its request-response model introduces some limitations for event-driven scenarios [106].

### 2.7.3 HTTP (Hypertext Transfer Protocol)

HTTP represents the foundational protocol of the World Wide Web, implementing a request-response model over TCP/IP [107]. While not specifically designed for IoT applications, HTTP offers significant advantages regarding ecosystem maturity, developer familiarity, and integration with existing web infrastructure.

HTTP characteristics relevant to IoT implementation include:
- Mature ecosystem: Extensive tooling, library support, and developer experience.
- RESTful resource model: Well-established patterns for resource representation and manipulation.
- Standardized security: HTTPS provides robust transport-layer security.
- Caching mechanisms: Reduce bandwidth consumption for frequently accessed resources.
- Inherent overhead: Text-based headers and TCP connection requirements introduce substantial overhead compared to IoT-specific protocols [108].

HTTP's characteristics typically position it optimally for cloud-tier interfaces where bandwidth constraints are less severe and integration with web applications represents a priority. The protocol's overhead makes it less suitable for direct implementation on constrained sensor nodes [109].

### 2.7.4 Protocol Selection Considerations

Protocol selection should consider specific deployment requirements across multiple dimensions:
- Energy efficiency: CoAP typically demonstrates the lowest energy consumption due to its minimal overhead and UDP transport, while HTTP's connection-oriented nature and verbose headers result in higher energy demands. MQTT occupies an intermediate position, with TCP overhead partially offset by efficient binary formatting [110].
- Bandwidth utilization: CoAP and MQTT both implement compact binary encodings that minimize transmission size, while HTTP's text-based headers substantially increase bandwidth requirements. Actual bandwidth consumption varies significantly based on specific message patterns and payload characteristics [111].
- Reliability mechanisms: MQTT provides tiered QoS options over reliable TCP transport. CoAP implements optional confirmable messages over unreliable UDP. HTTP inherits TCP reliability but lacks application-layer acknowledgment mechanisms [112].
- Latency characteristics: CoAP typically demonstrates the lowest latency due to connectionless UDP operation, while HTTP and MQTT incur additional latency from TCP connection establishment. Actual performance varies based on network conditions and specific implementation details [113].
- Implementation complexity: HTTP offers the most mature development ecosystem but requires more resources. MQTT provides intermediate complexity with numerous library implementations across platforms. CoAP offers specialized IoT optimization but may involve less familiar programming models [114].

This evaluation indicates that multi-protocol approaches frequently provide optimal solutions, utilizing MQTT for fog-cloud communication where publish-subscribe patterns enhance flexibility, while potentially employing CoAP for resource-constrained node-to-gateway interactions when direct IP connectivity is implemented.

## 2.8 Research Gaps and Opportunities

The literature review reveals several significant research gaps and opportunities for innovation in IoT-based forest fire detection systems:

Integrated Design Optimization: Existing research predominantly focuses on individual system components (sensors, communication, power, analytics) rather than holistic integration. Few studies comprehensively address the design, implementation, and evaluation of complete systems incorporating optimized solar harvesting, multi-sensor fusion, long-range communication, and tiered processing architectures. The specific integration challenge of balancing energy harvesting capabilities against communication and sensing requirements in forest environments represents a significant research opportunity [115].

Energy Autonomy in Variable Conditions: While solar harvesting fundamentals are well-established, limited research addresses the specific challenges of harvester optimization for forest deployment where variable shading, seasonal irradiance fluctuations, and temperature extremes impact efficiency. The optimization of MPPT algorithms specifically for highly variable forest light conditions represents an underexplored domain [116].

Edge Fusion Algorithm Optimization: Simple thresholding dominates existing WSN fire detection literature, with limited exploration of more sophisticated fusion approaches that maintain computational efficiency while improving detection reliability. Developing algorithms specifically optimized for implementation on constrained microcontrollers represents a significant research opportunity [117].

LoRaWAN Performance in Dense Forest: While LoRaWAN characteristics are extensively documented in urban and open environments, empirical performance data for dense forest deployments remains limited. The specific impacts of vegetation density, moisture content, and seasonal variation on signal propagation warrant further investigation [118].

Fog Computing for Fire Detection: The fog computing paradigm offers substantial potential benefits for forest monitoring applications, yet few studies comprehensively implement and evaluate fog-based architectures for fire detection. The implementation of spatial correlation algorithms, redundancy checking, and adaptive alert generation at the fog layer represents a promising research direction [119].

Scalability Analysis: Limited research addresses practical scalability aspects of forest-scale WSN fire detection deployments. Questions regarding optimal node density, gateway distribution, and communication patterns for extensive coverage remain incompletely answered [120].

ML Integration Pathways: While machine learning demonstrates significant potential for enhancing detection accuracy, practical implementation paths for integrating ML into resource-constrained WSN fire detection systems remain underexplored. Specifically, the transition from threshold-based detection to lightweight anomaly detection models merits further investigation [121].

This thesis addresses several identified gaps by implementing and evaluating an integrated WSN fire detection system incorporating solar energy harvesting, multi-sensor fusion at the edge, fog-level processing for enhanced reliability, and cloud-based analytics. The evaluation includes detailed assessment of communication performance in simulated forest conditions, power system autonomy analysis, and detection accuracy characterization. This work contributes to bridging the identified gaps while providing practical implementation guidance for similar systems.

## References

[14] F. Larigchia, "Global consumer drone average price by segment 2020," Statista, Apr. 13, 2022. [Online]. Available: https://www.statista.com/statistics/1234668/worldwide-consumer-drone-average-price-by-segment. [Accessed: May 5, 2022].

[15] A. A. A. Alkhatib, "A Review on Forest Fire Detection Techniques," International Journal of Distributed Sensor Networks, vol. 10, no. 3, p. 597368, Mar. 2014, doi: 10.1155/2014/597368.

[16] V. Chowdary, M. K. Gupta, and R. Singh, "A Review of Forest Fire Detection Techniques: A Decadal Perspective," International Journal of Engineering & Technology, vol. 7, no. 3.12, pp. 1312-1316, Jul. 2018.

[17] M. J. Wooster et al., "Satellite remote sensing of active fires: History and current status, applications and future requirements," Remote Sensing of Environment, vol. 267, p. 112759, Dec. 2021, doi: 10.1016/j.rse.2021.112759.

[18] E. S. Kasischke and N. H. F. French, "Locating and estimating the areal extent of wildfires in Alaskan boreal forests using multiple-season AVHRR NDVI composite data," Remote Sensing of Environment, vol. 51, no. 2, pp. 263-275, Feb. 1995, doi: 10.1016/0034-4257(93)00074-J.

[19] T. Celik, H. Özkaramanlı, and H. Demirel, "Fire and smoke detection without sensors: Image processing based approach," in 15th European Signal Processing Conference, Poznań, Poland, 2007, pp. 1794-1798.

[20] S. H. Bae, K.-W. Kim, and Y.-H. Kim, "Deep Forest Fire Image Classification Based on Convolutional Neural Networks," Applied Sciences, vol. 10, no. 21, p. 7699, Oct. 2020, doi: 10.3390/app10217699.

[21] H. F. Abarca et al., "ALERTWildfire: Open Source CAL FIRE Wildfire Camera Network," Earth and Space Science, vol. 7, no. 11, e2020EA001277, 2020, doi: 10.1029/2020EA001277.

[22] A. Sánchez-Azofeifa et al., "Real-time and Slow-motion Fire Detection Using a Multispectral High-Resolution Sensor on an Unmanned Aerial System," Drones, vol. 4, no. 2, p. 21, May 2020, doi: 10.3390/drones4020021.

[23] S. H. Bae, S. H. Lee, and J. H. Kim, "Early Forest Fire Detection System Based on Wireless Sensor Network and Deep Learning," Applied Sciences, vol. 11, no. 11, p. 5147, Jun. 2021, doi: 10.3390/app11115147.

[24] J. Lloret et al., "A Wireless Sensor Network Deployment for Rural and Forest Fire Detection and Verification," Sensors, vol. 9, no. 11, pp. 8722-8747, Oct. 2009, doi: 10.3390/s91108722.

[25] J. Solobera, "Detecting Forest Fires using Wireless Sensor Networks," Libelium, 2010. [Online]. Available: http://www.libelium.com/wireless_sensor_networks_to_detec_forest_fires/. [Accessed: Apr. 20, 2022].

[26] Y. E. Aslan, I. Korpeoglu, and Ö. Ulusoy, "A framework for use of wireless sensor networks in forest fire detection and monitoring," Computers, Environment and Urban Systems, vol. 36, no. 6, pp. 614-625, Nov. 2012, doi: 10.1016/j.compenvurbsys.2012.03.002.

[27] M. Hefeeda and M. Bagheri, "Wireless Sensor Networks for Early Detection of Forest Fires," in IEEE International Conference on Mobile Adhoc and Sensor Systems, Pisa, Italy, 2007, pp. 1-6, doi: 10.1109/MOBHOC.2007.4428702.

[28] P. Barker and M. Hammoudeh, "A Survey on Low Power Network Protocols for the Internet of Things and Wireless Sensor Networks," in International Conference on Future Networks and Distributed Systems, Cambridge, UK, 2017, doi: 10.1145/3102304.3102348.

[29] M. Nayak, "Difference between LoRaWan and Sigfox," GeeksforGeeks, Feb. 24, 2022. [Online]. Available: https://www.geeksforgeeks.org/difference-between-lorawan-and-sigfox. [Accessed: Apr. 17, 2022].

[30] A. Augustin, J. Yi, T. Clausen, and W. M. Townsley, "A Study of LoRa: Long Range & Low Power Networks for the Internet of Things," Sensors, vol. 16, no. 9, p. 1466, Sep. 2016, doi: 10.3390/s16091466.

[31] O. H. J. Ahsan, M. S. J. Eliase, and M. A. Hoque, "A Survey on Wireless Sensor Networks for Environmental Monitoring," International Journal of Computer Applications, vol. 115, no. 19, pp. 1-6, Apr. 2015, doi: 10.5120/20260-2507.

[32] I. F. Akyildiz, W. Su, Y. Sankarasubramaniam, and E. Cayirci, "Wireless sensor networks: a survey," Computer Networks, vol. 38, no. 4, pp. 393-422, Mar. 2002, doi: 10.1016/S1389-1286(01)00302-4.

[33] S. R. Vijayalakshmi and S. Muruganand, "Wireless Sensor Networks: An Introduction," in Wireless Sensor Networks: Architecture, Applications and Advancement, Massachusetts: Mercury Learning and Information LLC, 2018, pp. 1-45.

[34] T. D. Cole, "Designing Wireless Sensor Network Solutions For Tactical ISR," Norwood, MA: Artech House, 2020, pp. 15-17.

[35] L. Day, "LoRaWAN vs Zigbee -- Which Wireless IoT Network is the best for me?," LinkedIn, Jul. 6, 2020. [Online]. Available: https://www.linkedin.com/pulse/lorawan-vs-zigbee-which-wireless-iot-protocol-best-me-luke-day. [Accessed: Jun. 8, 2022].

[36] X. Chen, "Randomly Deployed Wireless Sensor Networks," Beijing: Tsinghua University Press, 2020, pp. 1-6.

[37] M. T. Lazarescu, "Design of a WSN Platform for Long-Term Environmental Monitoring for IoT Applications," IEEE Journal on Emerging and Selected Topics in Circuits and Systems, vol. 3, no. 1, pp. 45-54, Mar. 2013, doi: 10.1109/JETCAS.2013.2243032.

[38] C. Alippi and G. Vanini, "A RSSI-based and calibrated centralized localization technique for Wireless Sensor Networks," in Fourth Annual IEEE International Conference on Pervasive Computing and Communications Workshops (PERCOMW'06), Pisa, Italy, 2006, pp. 5 pp.-305, doi: 10.1109/PERCOMW.2006.13.

[39] J. Yick, B. Mukherjee, and D. Ghosal, "Wireless sensor network survey," Computer Networks, vol. 52, no. 12, pp. 2292-2330, Aug. 2008, doi: 10.1016/j.comnet.2008.04.002.

[40] W. Ye, J. Heidemann, and D. Estrin, "An energy-efficient MAC protocol for wireless sensor networks," in Proceedings of the IEEE INFOCOM Conference, New York, NY, USA, 2002, pp. 1567-1576, doi: 10.1109/INFCOM.2002.1019408.

[41] T. van Dam and K. Langendoen, "An adaptive energy-efficient MAC protocol for wireless sensor networks," in Proceedings of the 1st international conference on Embedded networked sensor systems (SenSys '03), Los Angeles, CA, USA, 2003, pp. 171-180, doi: 10.1145/958491.958512.

[42] S. Lindsey and C. S. Raghavendra, "PEGASIS: Power-efficient gathering in sensor information systems," in IEEE Aerospace Conference Proceedings, Big Sky, MT, USA, 2002, vol. 3, pp. 1125-1130, doi: 10.1109/AERO.2002.1035242.

[43] V. Raghunathan, C. Schurgers, S. Park, and M. B. Srivastava, "Energy-aware wireless microsensor networks," IEEE Signal Processing Magazine, vol. 19, no. 2, pp. 40-50, Mar. 2002, doi: 10.1109/79.985679.

[44] M. Srbinovska, C. Gavrovski, V. Dimcev, A. Krkoleva, and V. Borozan, "Environmental parameters monitoring in precision agriculture using wireless sensor networks," Journal of Cleaner Production, vol. 88, pp. 297-307, Feb. 2015, doi: 10.1016/j.jclepro.2014.04.036.

[45] X. Yang, K. G. Ong, W. R. Dreschel, K. Zeng, C. S. Mungle, and C. A. Grimes, "Design of a Wireless Sensor Network for Long-term, In-Situ Monitoring of an Aqueous Environment," Sensors, vol. 2, no. 11, pp. 455-472, Nov. 2002, doi: 10.3390/s21100455.

[46] P. Kumar, L. Morawska, C. Martani, G. Biskos, M. Neophytou, S. Di Sabatino, M. Bell, L. Norford, and R. Britter, "The rise of low-cost sensing for managing air pollution in cities," Environment International, vol. 75, pp. 199-205, Feb. 2015, doi: 10.1016/j.envint.2014.11.019.

[47] A. Mainwaring, D. Culler, J. Polastre, R. Szewczyk, and J. Anderson, "Wireless sensor networks for habitat monitoring," in Proceedings of the 1st ACM international workshop on Wireless sensor networks and applications (WSNA '02), Atlanta, GA, USA, 2002, pp. 88-97, doi: 10.1145/570738.570751.

[48] J. P. Lynch and K. J. Loh, "A Summary Review of Wireless Sensors and Sensor Networks for Structural Health Monitoring," Shock and Vibration Digest, vol. 38, no. 2, pp. 91-128, Mar. 2006, doi: 10.1177/0583102406061499.

[49] V. Jelicic, D. Tolic, and V. Bilas, "Consensus-based decentralized resource sharing between co-located wireless sensor networks," in IEEE Sensors Applications Symposium (SAS), Zadar, Croatia, 2015, pp. 1-6, doi: 10.1109/SAS.2015.7133590.

[50] U. Raza, P. Kulkarni, and M. Sooriyabandara, "Low Power Wide Area Networks: An Overview," IEEE Communications Surveys & Tutorials, vol. 19, no. 2, pp. 855-873, 2017, doi: 10.1109/COMST.2017.2652320.

[51] A. Lavric and V. Popa, "Internet of Things and LoRa™ Low-Power Wide-Area Networks: A survey," in International Symposium on Signals, Circuits and Systems (ISSCS), Iasi, Romania, 2017, pp. 1-5, doi: 10.1109/ISSCS.2017.8034915.

[52] K. Mikhaylov, J. Petäjäjärvi, and T. Haenninen, "Analysis of Capacity and Scalability of the LoRa Low Power Wide Area Network Technology," in European Wireless Conference, Oulu, Finland, 2016, pp. 1-6.

[53] O. Georgiou and U. Raza, "Low Power Wide Area Network Analysis: Can LoRa Scale?," IEEE Wireless Communications Letters, vol. 6, no. 2, pp. 162-165, Apr. 2017, doi: 10.1109/LWC.2016.2647247.

[54] J. Petäjäjärvi, K. Mikhaylov, M. Hämäläinen, and J. Iinatti, "Evaluation of LoRa LPWAN Technology for Remote Health and Wellbeing Monitoring," in 10th International Symposium on Medical Information and Communication Technology (ISMICT), Worcester, MA, USA, 2016, pp. 1-5, doi: 10.1109/ISMICT.2016.7498898.

[55] A. K. Maina, D. N. S. Petersen, Z. Chen, and W. Hu, "A Survey of LoRaWAN for IoT: Applications, Deployments, and Future Directions," Electronics, vol. 11, no. 1, p. 164, Jan. 2022, doi: 10.3390/electronics11010164.

[56] LoRa Alliance, "LoRaWAN® Specification V1.0.4," LoRa Alliance, Inc., Fremont, CA, USA, Tech. Spec. TS001-1.0.4, Oct. 2020. [Online]. Available: https://lora-alliance.org/resource_hub/lorawan-specification-v1-0-4/

[57] M. Centenaro, L. Vangelista, A. Zanella, and M. Zorzi, "Long-range communications in unlicensed bands: the rising stars in the IoT and smart city scenarios," IEEE Wireless Communications, vol. 23, no. 5, pp. 60-67, Oct. 2016, doi: 10.1109/MWC.2016.7721743.

[58] B. Sikken, "Project DecodingLoRa," GitHub repository, 2021. [Online]. Available: https://github.com/bertrik/LoraDecoder

[59] D. Bankov, E. Khorov, and A. Lyakhov, "Mathematical model of LoRaWAN channel access with capture effect," in IEEE 28th Annual International Symposium on Personal, Indoor, and Mobile Radio Communications (PIMRC), Montreal, QC, Canada, 2017, pp. 1-5, doi: 10.1109/PIMRC.2017.8292748.

[60] S. Tennakoon, M. Elkhodr, S. Al-Sarawi, and D. C. Ranasinghe, "A Comprehensive Review of Security in LoRaWAN," Electronics, vol. 11, no. 19, p. 3119, Sep. 2022, doi: 10.3390/electronics11193119.

[61] X. Yang, E. Karampatzakis, C. Doerr, and F. Kuipers, "Security Vulnerabilities in LoRaWAN," in IEEE/ACM Third International Conference on Internet-of-Things Design and Implementation (IoTDI), Orlando, FL, USA, 2018, pp. 129-140, doi: 10.1109/IoTDI.2018.00022.

[62] J. de Carvalho Silva, J. J. P. C. Rodrigues, A. M. Alberti, P. Solic, and A. L. L. Aquino, "LoRaWAN — A low power WAN protocol for Internet of Things: A review and opportunities," in 2nd International Multidisciplinary Conference on Computer and Energy Science (SpliTech), Split, Croatia, 2017, pp. 1-6.

[63] D. Patel and M. Won, "Experimental Study on Low Power Wide Area Networks (LPWAN) for Mobile Internet of Things," in IEEE 85th Vehicular Technology Conference (VTC Spring), Sydney, NSW, Australia, 2017, pp. 1-5, doi: 10.1109/VTCSpring.2017.8108501.

[64] J. Haxhibeqiri, E. De Poorter, I. Moerman, and J. Hoebeke, "A Survey of LoRaWAN for IoT: From Technology to Application," Sensors, vol. 18, no. 11, p. 3995, Nov. 2018, doi: 10.3390/s18113995.

[65] C. Pham, "Low Cost, Low Power and Long Range IoT Network for Environmental Monitoring based on LoRaWAN Technology," in 11th International Conference on Mobile Computing and Ubiquitous Networking (ICMU), Auckland, New Zealand, 2018, pp. 1-6, doi: 10.23919/ICMU.2018.8661171.

[66] F. Adelantado, X. Vilajosana, P. Tuset-Peiro, B. Martinez, J. Melia-Segui, and T. Watteyne, "Understanding the Limits of LoRaWAN," IEEE Communications Magazine, vol. 55, no. 9, pp. 34-40, Sep. 2017, doi: 10.1109/MCOM.2017.1600613.

[67] S. Sudevalayam and P. Kulkarni, "Energy harvesting sensor nodes: Survey and implications," IEEE Communications Surveys & Tutorials, vol. 13, no. 3, pp. 443-461, 2011, doi: 10.1109/SURV.2011.060710.00094.

[68] V. Raghunathan, A. Kansal, J. Hsu, J. Friedman, and M. Srivastava, "Design considerations for solar energy harvesting wireless embedded systems," in Proceedings of the 4th international symposium on Information processing in sensor networks (IPSN '05), Boise, ID, USA, 2005, p. 64, doi: 10.1109/IPSN.2005.1440973.

[69] A. Kansal, J. Hsu, S. Zahedi, and M. B. Srivastava, "Power management in energy harvesting sensor networks," ACM Transactions on Embedded Computing Systems (TECS), vol. 6, no. 4, p. 32, Sep. 2007, doi: 10.1145/1274858.1274870.

[70] M. Z. Hasan et al., "Energy harvesting for powering wireless sensor networks: A comprehensive review," Renewable and Sustainable Energy Reviews, vol. 168, p. 112829, Oct. 2022, doi: 10.1016/j.rser.2022.112829.

[71] A. S. Weddell, G. V. Merrett, and B. M. Al-Hashimi, "Photovoltaic sample-and-hold circuit enabling MPPT indoors for low-power systems," IEEE Transactions on Circuits and Systems I: Regular Papers, vol. 59, no. 6, pp. 1196-1204, Jun. 2012, doi: 10.1109/TCSI.2011.2173393.

[72] P. Spachos and D. Hatzinakos, "Performance Evaluation of a Self-Powered Wireless Sensor Network for Environmental Monitoring," in 2012 Seventh International Conference on Broadband, Wireless Computing, Communication and Applications, Victoria, BC, Canada, 2012, pp. 471-476, doi: 10.1109/BWCCA.2012.83.

[73] L. Tang, Y. Yang, and C. K. Soh, "Toward Broadband Vibration-based Energy Harvesting," Journal of Intelligent Material Systems and Structures, vol. 21, no. 18, pp. 1867-1897, Dec. 2010, doi: 10.1177/1045389X10390249.

[74] X. Lu, P. Wang, D. Niyato, D. I. Kim, and Z. Han, "Wireless Networks With RF Energy Harvesting: A Contemporary Survey," IEEE Communications Surveys & Tutorials, vol. 17, no. 2, pp. 757-789, 2015, doi: 10.1109/COMST.2014.2368999.

[75] K. Nakagawa, I. Nakata, and A. Ametani, "A study on charging and discharging characteristics of lead-acid batteries," in 27th International Telecommunications Energy Conference, Berlin, Germany, 2005, pp. 255-259, doi: 10.1109/INTLEC.2005.335018.

[76] R. P. F. González, F. D. Gonçalves, O. Vallina, and J. G. G. González-Vega, "Design of a flexible and modular power system for application in WSN," in IEEE International Conference on Industrial Technology (ICIT), Buenos Aires, Argentina, 2010, pp. 1351-1356, doi: 10.1109/ICIT.2010.5472485.

[77] F. I. Simjee and P. H. Chou, "Efficient Charging of Supercapacitors for Extended Lifetime of Wireless Sensor Nodes," IEEE Transactions on Power Electronics, vol. 23, no. 3, pp. 1526-1536, May 2008, doi: 10.1109/TPEL.2008.921147.

[78] M. Prauzek, J. Konecny, M. Borova, K. Janosova, J. Hlavica, and P. Musilek, "Energy Harvesting Sources, Storage Devices and System Topologies for Environmental Wireless Sensor Networks: A Review," Sensors, vol. 18, no. 8, p. 2446, Aug. 2018, doi: 10.3390/s18082446.

[79] T. Esram and P. L. Chapman, "Comparison of Photovoltaic Array Maximum Power Point Tracking Techniques," IEEE Transactions on Energy Conversion, vol. 22, no. 2, pp. 439-449, Jun. 2007, doi: 10.1109/TEC.2006.874230.

[80] N. Femia, G. Petrone, G. Spagnuolo, and M. Vitelli, "Optimization of perturb and observe maximum power point tracking method," IEEE Transactions on Power Electronics, vol. 20, no. 4, pp. 963-973, Jul. 2005, doi: 10.1109/TPEL.2005.850975.

[81] H. Patel and V. Agarwal, "Maximum Power Point Tracking Scheme for PV Systems Operating Under Partially Shaded Conditions," IEEE Transactions on Industrial Electronics, vol. 55, no. 4, pp. 1689-1698, Apr. 2008, doi: 10.1109/TIE.2008.917118.

[82] A. K. Pandey, V. Tyagi, J. Selvaraj, N. Rahim, and S. Tyagi, "Recent advances in solar photovoltaic systems for emerging trends and advanced applications," Renewable and Sustainable Energy Reviews, vol. 53, pp. 859-884, Jan. 2016, doi: 10.1016/j.rser.2015.09.043.

[83] F. A. Chacón-Troya, G. Villalba-Meneses, and F. Charvez-Guevara, "Comparative analysis of lead acid AGM vs. lithium iron phosphate battery for a PV-system application," in 2017 IEEE Second Ecuador Technical Chapters Meeting (ETCM), Salinas, Ecuador, 2017, pp. 1-6, doi: 10.1109/ETCM.2017.8247510.

[84] J. Guerrero-Perez, G. Colomé, and M. Gasulla, "Supercapacitors for Energy Harvesting Applications," Journal of Physics: Conference Series, vol. 773, p. 012103, Nov. 2016, doi: 10.1088/1742-6596/773/1/012103.

[85] D. Cesana and E. Del Rosso, "Reliability and Availability Analysis for a VMEbus System," IEEE Transactions on Nuclear Science, vol. 47, no. 2, pp. 203-209, Apr. 2000, doi: 10.1109/23.846166.

[86] M. Rossi, L. Badia, P. Casari, and M. Zorzi, "Coding Schemes for Line-of-Sight Optical Links in Wireless Sensor Networks," in IEEE Global Telecommunications Conference (GLOBECOM), Houston, TX, USA, 2011, pp. 1-6, doi: 10.1109/GLOCOM.2011.6133547.

[87] C. Alippi, G. Anastasi, M. Di Francesco, and M. Roveri, "Energy management in wireless sensor networks with energy-hungry sensors," IEEE Instrumentation & Measurement Magazine, vol. 12, no. 2, pp. 16-23, Apr. 2009, doi: 10.1109/MIM.2009.4811133.

[88] D. Dondi, A. Bertacchini, D. Brunelli, L. Larcher, and L. Benini, "Modeling and Optimization of a Solar Energy Harvester System for Self-Powered Wireless Sensor Networks," IEEE Transactions on Industrial Electronics, vol. 55, no. 7, pp. 2759-2766, Jul. 2008, doi: 10.1109/TIE.2008.924449.

[89] C. Moser, L. Thiele, D. Brunelli, and L. Benini, "Adaptive Power Management for Environmentally Powered Systems," IEEE Transactions on Computers, vol. 59, no. 4, pp. 478-491, Apr. 2010, doi: 10.1109/TC.2009.158.

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

[101] A. Banks and R. Gupta, "MQTT Version 3.1.1," OASIS Standard, Oct. 29, 2014. [Online]. Available: http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html

[102] R. A. Light, "Mosquitto: server and client implementation of the MQTT protocol," Journal of Open Source Software, vol. 2, no. 13, p. 265, May 2017, doi: 10.21105/joss.00265.

[103] P. Bellavista and A. Zanni, "Feasibility of Fog Computing Deployment based on Docker Containerization over RaspberryPi," in Proceedings of the 18th International Conference on Distributed Computing and Networking, Hyderabad, India, 2017, pp. 1-10, doi: 10.1145/3007748.3007777.

[104] Z. Shelby, K. Hartke, and C. Bormann, "The Constrained Application Protocol (CoAP)," RFC 7252, Jun. 2014, doi: 10.17487/RFC7252.

[105] R. A. Rahman and B. Shah, "Security analysis of IoT protocols: A focus in CoAP," in 3rd MEC International Conference on Big Data and Smart City (ICBDSC), Muscat, Oman, 2016, pp. 1-7, doi: 10.1109/ICBDSC.2016.7460363.

[106] C. Gündoğan, P. Kietzmann, T. C. Schmidt, and M. Wählisch, "HoPP: Publish-Subscribe for the Constrained IoT," in IEEE International Conference on Communications (ICC), Dublin, Ireland, 2020, pp. 1-7, doi: 10.1109/ICC40277.2020.9148842.

[107] R. Fielding et al., "Hypertext Transfer Protocol -- HTTP/1.1," RFC 2616, Jun. 1999, doi: 10.17487/RFC2616.

[108] N. Naik, "Choice of effective messaging protocols for IoT systems: MQTT, CoAP, AMQP and HTTP," in IEEE International Systems Engineering Symposium (ISSE), Vienna, Austria, 2017, pp. 1-7, doi: 10.1109/SysEng.2017.8088251.

[109] E. A. Hernández, J. Sidna, A. Baina, and A. Najid, "Analysis and evaluation of communication Protocols for IoT Applications," in 13th International Conference on Intelligent Systems: Theories and Applications (SITA), Rabat, Morocco, 2020, pp. 1-6, doi: 10.1109/SITA52372.2020.9437484.

[110] S. P. Jaikar and K. R. Iyer, "A Survey of Messaging Protocols for IoT Systems," International Journal of Advanced in Management, Technology and Engineering Sciences, vol. 8, no. 2, pp. 510-514, 2018.

[111] Y. Chen, T. Kunz, "Performance evaluation of IoT protocols under a constrained wireless access network," in International Conference on Selected Topics in Mobile & Wireless Networking (MoWNeT), Cairo, Egypt, 2016, pp. 1-7, doi: 10.1109/MoWNet.2016.7496622.

[112] A. K. Ranjan, S. G. Ramaswamy, P. Panigrahi, and S. Raman, "Performance analysis of Barefoot P4 switches," in IEEE 8th International Conference on Advanced Networks and Telecommunications Systems (ANTS), New Delhi, India, 2014, pp. 1-6, doi: 10.1109/ANTS.2014.7057255.

[113] M. Collina, G. E. Corazza, and A. Vanelli-Coralli, "Introducing the QEST broker: Scaling the IoT by bridging MQTT and REST," in IEEE 23rd International Symposium on Personal, Indoor and Mobile Radio Communications - (PIMRC), Sydney, NSW, Australia, 2012, pp. 36-41, doi: 10.1109/PIMRC.2012.6362813.

[114] Y. Mao, C. You, J. Zhang, K. Huang, and K. B. Letaief, "A Survey on Mobile Edge Computing: The Communication Perspective," IEEE Communications Surveys & Tutorials, vol. 19, no. 4, pp. 2322-2358, 2017, doi: 10.1109/COMST.2017.2745201.

[115] F. L. Da Dalt, J. dos Reis, C. Paludo, A. Glória, T. Raquel Stroili, and G. Sebastião, "Forest Fire Detection and Monitoring by Wireless Sensor Networks: A Review," Journal of Sensor and Actuator Networks, vol. 10, no. 1, p. 18, Feb. 2021, doi: 10.3390/jsan10010018.

[116] M. Mekki, E. Bajic, F. Chaxel, and F. Meyer, "A comparative study of LPWAN technologies for large-scale IoT deployment," ICT Express, vol. 5, no. 1, pp. 1-7, Mar. 2019, doi: 10.1016/j.icte.2017.12.005.

[117] M. Yusuf, A. H. Mohammed, and A. A. Al-Aboosi, "Forest Fire Detection System Using Wireless Sensor Network: A Survey," International Journal of Advanced Computer Science and Applications (IJACSA), vol. 13, no. 6, pp. 831-839, 2022, doi: 10.14569/IJACSA.2022.0130696.

[118] H. Baghdadi, E. Attia, K. Ahmed, M. Ahmed, E. Fathy, and M. A. Elshafey, "Comprehensive study of LoRaWAN performance under different environmental conditions: A case study of a small city," Internet of Things, vol. 14, p. 100393, Jun. 2021, doi: 10.1016/j.iot.2021.100393.

[119] T. Balogh, V. Bradáč, F. Kučera, and J. Kaderka, "Fog Computing vs Cloud Computing: Network Delay Evaluation," in 29th International Conference Radioelektronika (RADIOELEKTRONIKA), Pardubice, Czech Republic, 2019, pp. 1-4, doi: 10.1109/RADIOELEK.2019.8733537.

[120] A. Farahzadi, P. Shams, J. Rezazadeh, and R. Farahbakhsh, "Middleware Technologies for Cloud of Things: A Survey," Digital Communications and Networks, vol. 4, no. 3, pp. 176-188, Aug. 2018, doi: 10.1016/j.dcan.2017.04.005.

[121] S. Verma, Y. Kawamoto, Z. M. Fadlullah, H. Nishiyama, and N. Kato, "A Survey on Network Methodologies for Real-Time Analytics of Massive IoT Data and Open Research Issues," IEEE Communications Surveys & Tutorials, vol. 19, no. 3, pp. 1457-1477, 2017, doi: 10.1109/COMST.2017.2694469.
