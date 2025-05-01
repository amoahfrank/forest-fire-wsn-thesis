## 4.1 Sensor Node Firmware (Heltec LoRa ESP32 v2.1)

The firmware implementation for the sensor nodes translates the architectural design into operational code, balancing performance requirements against severe resource constraints. This section details the development approach, structure, and key components of the embedded software running on the Heltec LoRa ESP32 v2.1 platform.

### 4.1.1 Development Environment and Framework

The firmware was developed using the following toolchain and framework:

**PlatformIO:** This open-source ecosystem provides a unified environment for embedded development, offering significant advantages over the Arduino IDE:
- Structured project organization with differentiated source and include directories
- Advanced dependency management
- Automated library resolution
- Cross-platform compatibility
- Integrated continuous integration capabilities

**Arduino Framework:** Despite the use of PlatformIO, the underlying codebase leverages the Arduino framework for ESP32, providing:
- Simplified hardware abstraction layer
- Extensive community support
- Broad library ecosystem
- Familiar API for rapid development

This combination delivers development efficiency while maintaining the performance benefits of a more structured environment. The codebase adheres to C++11 standards, avoiding advanced language features that might impact runtime performance on the constrained MCU.

### 4.1.2 Firmware Architecture

The firmware implements a modular, event-driven architecture designed for clarity, maintainability, and power efficiency:

**Core Components:**
- **SensorManager:** Coordinates all sensor interactions, abstracting hardware-specific implementations
- **PowerManager:** Controls system power states, sleep scheduling, and energy monitoring
- **CommunicationManager:** Handles LoRaWAN protocol implementation and message formatting
- **StorageManager:** Manages persistent configuration and local data caching
- **FusionEngine:** Implements the data fusion algorithm for fire detection
- **AlertManager:** Controls local alert mechanisms (LED, buzzer)
- **SystemController:** Orchestrates overall system operation and state transitions

**Execution Model:** The firmware implements a cooperative, non-preemptive multitasking approach:
1. Task scheduling occurs in the main loop with priority-based execution
2. Long-running operations are decomposed into state machines with incremental processing
3. Interrupt service routines (ISRs) are kept minimal, primarily setting flags for the main loop

Figure 4.1 illustrates the interaction between these components, showing data and control flows.

### 4.1.3 Sensor Interface Implementation

Each sensor in the node requires specific interface code to manage initialization, data acquisition, and power control:

**BME680 Environmental Sensor:**
```cpp
#include <Adafruit_BME680.h>

Adafruit_BME680 bme;

bool initializeBME680() {
  if (!bme.begin(0x76)) {  // I2C address
    return false;
  }
  
  // Set up oversampling and filter initialization
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150); // 320°C for 150 ms
  
  return true;
}

EnvironmentalData readBME680() {
  EnvironmentalData data;
  
  if (!bme.performReading()) {
    data.valid = false;
    return data;
  }
  
  data.temperature = bme.temperature;
  data.humidity = bme.humidity;
  data.pressure = bme.pressure / 100.0; // Convert to hPa
  data.gasResistance = bme.gas_resistance / 1000.0; // Convert to kOhms
  data.valid = true;
  
  return data;
}
```

**MQ Gas Sensors:**
The MQ-2 (smoke) and MQ-7 (carbon monoxide) sensors require analog reading with appropriate warm-up periods:

```cpp
#define MQ2_PIN 36  // ADC1_CH0
#define MQ2_POWER_PIN 13
#define MQ7_PIN 39  // ADC1_CH3
#define MQ7_POWER_PIN 12

// Calibration values determined during testing
const float MQ2_CLEAN_AIR_FACTOR = 9.83;
const float MQ7_CLEAN_AIR_FACTOR = 27.5;

void initializeMQSensors() {
  pinMode(MQ2_POWER_PIN, OUTPUT);
  pinMode(MQ7_POWER_PIN, OUTPUT);
  digitalWrite(MQ2_POWER_PIN, LOW); // Initially off
  digitalWrite(MQ7_POWER_PIN, LOW); // Initially off
}

float readMQ2Sensor(bool preheated = false) {
  if (!preheated) {
    digitalWrite(MQ2_POWER_PIN, HIGH);
    delay(20000); // 20 second warm-up
  }
  
  int adcValue = analogRead(MQ2_PIN);
  float sensorVoltage = adcValue * (3.3 / 4095.0);
  float sensorResistance = ((3.3 - sensorVoltage) / sensorVoltage) * 10.0; // 10K load resistor
  float ratio = sensorResistance / MQ2_CLEAN_AIR_FACTOR;
  
  // Formula derived from datasheet curve fitting
  float ppm = 574.25 * pow(ratio, -2.222);
  
  return ppm;
}

// MQ7 implementation follows similar pattern
```

**YG1006 Flame Detector:**

```cpp
#define FLAME_SENSOR_PIN 25
#define FLAME_POWER_PIN 27

void initializeFlameDetector() {
  pinMode(FLAME_SENSOR_PIN, INPUT);
  pinMode(FLAME_POWER_PIN, OUTPUT);
  digitalWrite(FLAME_POWER_PIN, LOW); // Initially off
}

bool detectFlame() {
  digitalWrite(FLAME_POWER_PIN, HIGH);
  delay(100); // Brief stabilization
  bool flameDetected = (digitalRead(FLAME_SENSOR_PIN) == LOW); // Active low
  digitalWrite(FLAME_POWER_PIN, LOW);
  return flameDetected;
}
```

**GPS Module Interface:**

```cpp
#include <TinyGPS++.h>
#include <HardwareSerial.h>

TinyGPSPlus gps;
HardwareSerial GPSSerial(1);  // UART1

void initializeGPS() {
  GPSSerial.begin(9600, SERIAL_8N1, 23, 22); // RX, TX pins
}

LocationData updateGPS(uint32_t timeout) {
  LocationData data;
  data.valid = false;
  
  uint32_t startTime = millis();
  while ((millis() - startTime) < timeout && !data.valid) {
    while (GPSSerial.available()) {
      gps.encode(GPSSerial.read());
    }
    
    if (gps.location.isUpdated() && gps.location.isValid()) {
      data.latitude = gps.location.lat();
      data.longitude = gps.location.lng();
      data.altitude = gps.altitude.meters();
      data.valid = true;
      break;
    }
    
    delay(10);
  }
  
  return data;
}
```

Each sensor implementation includes error handling, calibration functions, and power control mechanisms to optimize energy usage.

### 4.1.4 Power Management Implementation

Efficient power management forms a critical aspect of the firmware implementation, directly impacting node lifespan and reliability:

**Sleep Mode Control:**

```cpp
#include <esp_sleep.h>

// Wake-up sources
#define WAKE_PIN GPIO_NUM_35  // External interrupt pin
RTC_DATA_ATTR int bootCount = 0;

void setupDeepSleep(uint64_t sleepTime) {
  // Configure wake-up sources
  esp_sleep_enable_timer_wakeup(sleepTime);
  esp_sleep_enable_ext0_wakeup(WAKE_PIN, LOW);
  
  // Prepare peripherals for sleep
  disableSensors();
  disableLoRaModule();
  
  // Record wake-up reason for next boot
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_PERIPH, ESP_PD_OPTION_ON);
  
  // Enter deep sleep
  esp_deep_sleep_start();
}

void handleWakeUp() {
  bootCount++;
  esp_sleep_wakeup_cause_t wakeupReason = esp_sleep_get_wakeup_cause();
  
  switch(wakeupReason) {
    case ESP_SLEEP_WAKEUP_EXT0:
      // Handle external interrupt (potentially a local alarm)
      checkAlarmTrigger();
      break;
    case ESP_SLEEP_WAKEUP_TIMER:
      // Normal timer-based wake-up for measurements
      performRegularMeasurements();
      break;
    default:
      // Cold boot or reset
      performInitialSetup();
      break;
  }
}
```

**Dynamic Duty Cycle Adjustment:**

```cpp
RTC_DATA_ATTR float batteryVoltage = 0;
RTC_DATA_ATTR uint8_t dutyCycleMinutes = 15; // Default measurement interval

void updateDutyCycle() {
  // Read battery voltage through voltage divider
  analogReadResolution(12);
  int adcValue = analogRead(BATTERY_VOLTAGE_PIN);
  batteryVoltage = adcValue * (3.3 / 4095.0) * VOLTAGE_DIVIDER_FACTOR;
  
  // Adjust duty cycle based on available energy
  if (batteryVoltage > 4.0) {
    dutyCycleMinutes = 10; // More frequent measurements with high battery
  } else if (batteryVoltage > 3.7) {
    dutyCycleMinutes = 15; // Normal operation
  } else if (batteryVoltage > 3.5) {
    dutyCycleMinutes = 30; // Reduced frequency to conserve power
  } else {
    dutyCycleMinutes = 60; // Minimal operation to preserve battery
  }
  
  // Configure next sleep duration
  uint64_t sleepTime = dutyCycleMinutes * 60 * 1000000ULL;
  setupDeepSleep(sleepTime);
}
```

**Sensor Power Sequencing:**

```cpp
void manageSensorPower(bool enableSensors) {
  if (enableSensors) {
    // Sequential power-up to avoid current spikes
    digitalWrite(BME680_POWER_PIN, HIGH);
    delay(50);
    
    digitalWrite(MQ2_POWER_PIN, HIGH);
    delay(100);
    
    digitalWrite(MQ7_POWER_PIN, HIGH);
    delay(100);
    
    // Warm-up period for MQ sensors
    delay(20000);
  } else {
    // Power down in reverse order
    digitalWrite(MQ7_POWER_PIN, LOW);
    digitalWrite(MQ2_POWER_PIN, LOW);
    digitalWrite(BME680_POWER_PIN, LOW);
  }
}
```

These power management techniques ensure optimal energy consumption while maintaining measurement reliability, adapting dynamically to available power resources.

### 4.1.5 LoRaWAN Communication Implementation

LoRaWAN communication is implemented using the MCCI LoRaWAN LMIC library, providing a complete protocol stack for Class A device operation:

**LoRaWAN Initialization:**

```cpp
#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>

// LoRaWAN credentials (obtained during device provisioning)
static const u1_t PROGMEM APPEUI[8] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
static const u1_t PROGMEM DEVEUI[8] = { 0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF };
static const u1_t PROGMEM APPKEY[16] = { 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF };

// Pin mapping for Heltec ESP32 LoRa V2
const lmic_pinmap lmic_pins = {
  .nss = 18,
  .rxtx = LMIC_UNUSED_PIN,
  .rst = 14,
  .dio = {26, 35, 34}  // DIO0, DIO1, DIO2
};

void initializeLoRaWAN() {
  // Initialize LMIC
  os_init();
  LMIC_reset();
  
  // Set up EU868 frequency plan
  LMIC_setupChannel(0, 868100000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(1, 868300000, DR_RANGE_MAP(DR_SF12, DR_SF7B), BAND_CENTI);
  LMIC_setupChannel(2, 868500000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(3, 867100000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(4, 867300000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(5, 867500000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(6, 867700000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  LMIC_setupChannel(7, 867900000, DR_RANGE_MAP(DR_SF12, DR_SF7),  BAND_CENTI);
  
  // Disable link check validation
  LMIC_setLinkCheckMode(0);
  
  // Set data rate and transmit power
  LMIC_setDrTxpow(DR_SF9, 14);
  
  // Start join procedure
  LMIC_startJoining();
}
```

**Data Transmission:**

```cpp
uint8_t dataBuffer[20]; // Buffer for sensor data
static osjob_t sendjob;

void prepareDataPacket(SensorData sensorData, float fireRiskScore) {
  // Compact binary format to minimize airtime
  // Temperature: 16-bit signed fixed-point (0.01°C resolution)
  int16_t temp = (int16_t)(sensorData.temperature * 100);
  dataBuffer[0] = temp >> 8;
  dataBuffer[1] = temp & 0xFF;
  
  // Humidity: 8-bit unsigned (0.5% resolution)
  dataBuffer[2] = (uint8_t)(sensorData.humidity * 2);
  
  // Smoke PPM: 16-bit unsigned
  uint16_t smoke = (uint16_t)min(sensorData.smokePPM, 65535.0f);
  dataBuffer[3] = smoke >> 8;
  dataBuffer[4] = smoke & 0xFF;
  
  // CO PPM: 16-bit unsigned
  uint16_t co = (uint16_t)min(sensorData.coPPM, 65535.0f);
  dataBuffer[5] = co >> 8;
  dataBuffer[6] = co & 0xFF;
  
  // Flame detected: 1 bit
  // Battery voltage: 7 bits (0.05V resolution, range: 0-6.35V)
  dataBuffer[7] = (sensorData.flameDetected ? 0x80 : 0x00) | 
                  (uint8_t)min((int)(sensorData.batteryVoltage * 20), 127);
  
  // Fire risk score: 8-bit unsigned fixed-point (0-100 with 0.5 resolution)
  dataBuffer[8] = (uint8_t)min((int)(fireRiskScore * 2), 255);
  
  // GPS coordinates (if valid)
  if (sensorData.locationValid) {
    // Latitude: 24-bit signed fixed-point
    int32_t latInt = (int32_t)(sensorData.latitude * 16777215.0 / 180.0);
    dataBuffer[9] = (latInt >> 16) & 0xFF;
    dataBuffer[10] = (latInt >> 8) & 0xFF;
    dataBuffer[11] = latInt & 0xFF;
    
    // Longitude: 24-bit signed fixed-point
    int32_t lonInt = (int32_t)(sensorData.longitude * 16777215.0 / 180.0);
    dataBuffer[12] = (lonInt >> 16) & 0xFF;
    dataBuffer[13] = (lonInt >> 8) & 0xFF;
    dataBuffer[14] = lonInt & 0xFF;
  }
}

void sendData() {
  // Check if there is a pending TX/RX job running
  if (LMIC.opmode & OP_TXRXPEND) {
    Serial.println(F(\"OP_TXRXPEND, not sending\"));
  } else {
    // Prepare upstream data transmission at the next possible time
    LMIC_setTxData2(1, dataBuffer, sizeof(dataBuffer), 0);
    Serial.println(F(\"Packet queued\"));
  }
}

// LMIC event handler
void onEvent(ev_t ev) {
  switch(ev) {
    case EV_JOINING:
      Serial.println(F(\"EV_JOINING\"));
      break;
    case EV_JOINED:
      Serial.println(F(\"EV_JOINED\"));
      // Disable link check validation (automatically enabled
      // during join, but unnecessary for periodic data)
      LMIC_setLinkCheckMode(0);
      break;
    case EV_TXCOMPLETE:
      Serial.println(F(\"EV_TXCOMPLETE (includes waiting for RX windows)\"));
      if (LMIC.txrxFlags & TXRX_ACK)
        Serial.println(F(\"Received ack\"));
      if (LMIC.dataLen) {
        Serial.print(F(\"Received \"));
        Serial.print(LMIC.dataLen);
        Serial.println(F(\" bytes of payload\"));
        // Process downlink commands if needed
        processDownlink(LMIC.frame+LMIC.dataBeg, LMIC.dataLen);
      }
      // Schedule next transmission
      os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
      break;
    default:
      Serial.print(F(\"Unknown event: \"));
      Serial.println((unsigned) ev);
      break;
  }
}
```

The implementation incorporates dynamic parameter selection (spreading factor, transmit power) based on link quality and energy availability to maximize reliability while minimizing power consumption.

### 4.1.6 Edge-Level Fusion Algorithm

The firmware implements the weighted multi-sensor fusion algorithm described in Chapter 5, converting raw sensor readings into a calibrated fire risk score:

```cpp
float calculateFireRiskScore(SensorData data) {
  float score = 0.0f;
  
  // Temperature component (0-25 points)
  // Non-linear mapping with higher weight for elevated temperatures
  float tempScore = 0.0f;
  if (data.temperature > 35.0f) {
    tempScore = 25.0f; // Maximum score above 35°C
  } else if (data.temperature > 25.0f) {
    tempScore = 10.0f + (data.temperature - 25.0f) * 1.5f;
  } else {
    tempScore = max(0.0f, (data.temperature - 15.0f) * 1.0f);
  }
  
  // Humidity component (0-20 points)
  // Inverse relationship: lower humidity = higher fire risk
  float humidityScore = max(0.0f, 20.0f - (data.humidity * 0.3f));
  
  // Smoke component (0-25 points)
  float smokeScore = min(25.0f, data.smokePPM / 20.0f);
  
  // CO component (0-20 points)
  float coScore = min(20.0f, data.coPPM / 5.0f);
  
  // Flame detection (0 or 10 points)
  float flameScore = data.flameDetected ? 10.0f : 0.0f;
  
  // Combined score calculation
  score = tempScore + humidityScore + smokeScore + coScore + flameScore;
  
  // Normalization to 0-100 scale
  score = min(100.0f, score);
  
  return score;
}
```

The algorithm applies different weights to various parameters based on their reliability as fire indicators, with dynamic calibration based on environmental contexts (e.g., seasonal adjustments for average temperature).

### 4.1.7 Complete Operation Flow

The firmware brings together all components into a coordinated operational sequence:

```cpp
void setup() {
  Serial.begin(115200);
  
  // Check wake-up reason
  handleWakeUp();
  
  // Initialize hardware
  initializeGPIO();
  initializeSensors();
  initializeLoRaWAN();
  
  // Display startup information
  displayNodeInfo();
}

void loop() {
  // Sensor reading cycle
  if (timeToMeasure()) {
    // Power up and stabilize sensors
    manageSensorPower(true);
    
    // Collect sensor readings
    SensorData data = collectSensorData();
    
    // Calculate fire risk score
    float riskScore = calculateFireRiskScore(data);
    
    // Prepare data packet
    prepareDataPacket(data, riskScore);
    
    // Transmit via LoRaWAN
    sendData();
    
    // Power down sensors
    manageSensorPower(false);
  }
  
  // Process any pending LoRaWAN events
  os_runloop_once();
  
  // Update duty cycle based on battery voltage
  if (timeToUpdateDutyCycle()) {
    updateDutyCycle();
  }
  
  // Check if time to sleep
  if (timeToSleep()) {
    enterDeepSleep();
  }
}
```

This coordinated operation ensures efficient data collection, processing, and transmission while maximizing power efficiency through careful component management and sleep scheduling.

## 4.2 Gateway & Fog Software Stack (Raspberry Pi 4; Docker: EMQX, Node-RED, InfluxDB, Grafana)

The fog layer implementation leverages containerization for modular deployment and simplified management of the various software components required for intermediate data processing and local decision-making.

### 4.2.1 Base System Configuration

The Raspberry Pi 4 (4GB RAM) serving as the fog computing platform runs a minimal, security-hardened operating system:

**Operating System:** Raspberry Pi OS Lite (64-bit, Debian Bullseye-based) provides a minimal footprint while supporting all required functionality.

**System Optimizations:**
- Read-only root filesystem with specific write-enabled directories to prevent SD card corruption during power loss
- Unnecessary services disabled (e.g., bluetooth, wireless if using ethernet)
- Swap configuration tuned for performance (swappiness=10)
- Journald configuration optimized for embedded use (storage=volatile, compress=yes)
- Watchdog timer enabled for automatic recovery from system hangs

**Security Hardening:**
- SSH access restricted to public key authentication only
- Unnecessary network services disabled
- Unattended-upgrades package configured for automatic security updates
- AppArmor profiles enforced for all critical services
- Firewall (ufw) configured to allow only required ports

The following script excerpt demonstrates the base system setup process:

```bash
#!/bin/bash
# Base system configuration script for fog node

# Update system packages
apt update && apt upgrade -y

# Install required system packages
apt install -y docker.io docker-compose ufw watchdog chrony apparmor \\
               unattended-upgrades apt-listchanges

# Configure read-only root filesystem
apt install -y busybox-syslogd
systemctl mask systemd-journald.service rsyslog.service

# Create mount points for writable directories
mkdir -p /var/lib/docker-persist
echo \"tmpfs /var/log tmpfs defaults,noatime,size=30m 0 0\" >> /etc/fstab
echo \"/dev/mmcblk0p3 /var/lib/docker-persist ext4 defaults,noatime 0 2\" >> /etc/fstab

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 1883/tcp  # MQTT
ufw allow 8080/tcp  # Node-RED
ufw allow 8086/tcp  # InfluxDB
ufw enable

# Enable and configure watchdog
echo \"watchdog-device = /dev/watchdog\" >> /etc/watchdog.conf
echo \"watchdog-timeout = 15\" >> /etc/watchdog.conf
echo \"max-load-1 = 24\" >> /etc/watchdog.conf
systemctl enable watchdog

# Configure NTP for accurate time
systemctl enable chrony

# Configure unattended upgrades
echo 'APT::Periodic::Update-Package-Lists \"1\";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade \"1\";' >> /etc/apt/apt.conf.d/20auto-upgrades
```

This foundation provides a robust, maintainable platform for the containerized application stack.

### 4.2.2 Docker Deployment Architecture

The fog software stack is deployed using Docker containers, providing isolation, simplified updates, and consistent environment configuration. Figure 4.2 illustrates the container architecture and interconnections.

**Docker Compose Configuration:**

```yaml
version: '3'

services:
  # ChirpStack LoRaWAN Network Server
  chirpstack-network-server:
    image: chirpstack/chirpstack-network-server:3
    volumes:
      - ./configuration/chirpstack:/etc/chirpstack-network-server
      - ./data/chirpstack:/var/lib/chirpstack-network-server
    ports:
      - \"8000:8000\"
    environment:
      - POSTGRESQL__DSN=postgres://chirpstack_ns:chirpstack_ns@chirpstack-postgresql/chirpstack_ns?sslmode=disable
    depends_on:
      - chirpstack-postgresql
    restart: unless-stopped
  
  # ChirpStack Application Server
  chirpstack-application-server:
    image: chirpstack/chirpstack-application-server:3
    volumes:
      - ./configuration/chirpstack-app:/etc/chirpstack-application-server
    ports:
      - \"8001:8001\"
    environment:
      - POSTGRESQL__DSN=postgres://chirpstack_as:chirpstack_as@chirpstack-postgresql/chirpstack_as?sslmode=disable
    depends_on:
      - chirpstack-postgresql
    restart: unless-stopped
  
  # PostgreSQL database for ChirpStack
  chirpstack-postgresql:
    image: postgres:13-alpine
    volumes:
      - ./data/postgresql:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=postgres
    restart: unless-stopped
  
  # MQTT broker
  mosquitto:
    image: eclipse-mosquitto:2
    volumes:
      - ./configuration/mosquitto:/mosquitto/config
      - ./data/mosquitto:/mosquitto/data
    ports:
      - \"1883:1883\"
      - \"8883:8883\"
    restart: unless-stopped
  
  # Node-RED for flow programming
  nodered:
    image: nodered/node-red:2.2.2
    volumes:
      - ./data/nodered:/data
    ports:
      - \"1880:1880\"
    depends_on:
      - mosquitto
      - influxdb
    restart: unless-stopped
  
  # InfluxDB time-series database
  influxdb:
    image: influxdb:2.2
    volumes:
      - ./data/influxdb:/var/lib/influxdb2
    ports:
      - \"8086:8086\"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=ffdetect2022
      - DOCKER_INFLUXDB_INIT_ORG=forestfire
      - DOCKER_INFLUXDB_INIT_BUCKET=sensordata
    restart: unless-stopped
  
  # Grafana for data visualization
  grafana:
    image: grafana/grafana:8.5.0
    volumes:
      - ./data/grafana:/var/lib/grafana
    ports:
      - \"3000:3000\"
    depends_on:
      - influxdb
    restart: unless-stopped
  
  # Redis for message queue and caching
  redis:
    image: redis:6-alpine
    volumes:
      - ./data/redis:/data
    restart: unless-stopped
  
  # Alert manager service (custom container)
  alertmanager:
    build: ./alertmanager
    volumes:
      - ./configuration/alertmanager:/config
    depends_on:
      - mosquitto
      - redis
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

This configuration ensures proper isolation between services while enabling necessary inter-container communication through the internal Docker network.

### 4.2.3 ChirpStack LoRaWAN Server Configuration

The ChirpStack open-source LoRaWAN Network Server handles communication with LoRa gateways and sensor nodes:

**Network Server Configuration:**

```toml
# ChirpStack Network Server configuration

[general]
log_level=4

[postgresql]
dsn=\"postgres://chirpstack_ns:chirpstack_ns@chirpstack-postgresql/chirpstack_ns?sslmode=disable\"

[redis]
url=\"redis://redis:6379\"

[network_server]
net_id=\"000000\"
device_session_ttl=\"744h0m0s\"

[network_server.band]
name=\"EU_863_870\"

[network_server.network_settings]
rx1_delay=1
rx2_frequency=869525000
rx2_dr=0

[network_server.scheduler]
scheduler_interval=\"1s\"

[join_server]
default.server=\"http://chirpstack-application-server:8003\"

[gateway.backend]
type=\"mqtt\"
```

**Gateway Bridge Configuration:**

```toml
# Gateway Bridge configuration for RAK7258

[general]
log_level=4

[integration.mqtt]
server=\"tcp://mosquitto:1883\"
topic_prefix=\"gateway\"

[gateway]
# Specific MAC address for each gateway
mac=\"b827ebfffe889812\"

[backend]
type=\"concentratord\"

[backend.concentratord]
crc_check=true
event_url=\"ipc:///tmp/concentratord_event\"
command_url=\"ipc:///tmp/concentratord_command\"
```

These configurations enable seamless packet forwarding from LoRa gateways to the network server and subsequent routing to the application server.

### 4.2.4 Node-RED Flow Implementation

Node-RED provides visual flow-based programming for data processing, analysis, and alert generation:

**Flow Organization:**

The Node-RED implementation is structured into several interconnected flows:

1. **Data Acquisition Flow:** Receives data from the ChirpStack Application Server via MQTT
2. **Data Processing Flow:** Performs validation, normalization, and enrichment
3. **Alert Logic Flow:** Implements threshold-based rules and spatial correlation
4. **Storage Flow:** Persists processed data to InfluxDB
5. **Visualization Flow:** Creates real-time dashboards for local display
6. **Alert Notification Flow:** Manages tiered alert distribution
7. **Administration Flow:** Handles system configuration and monitoring

**Data Processing Flow Implementation:**

```json
[
  {
    \"id\": \"f6f2187d.f17ca8\",
    \"type\": \"mqtt in\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Raw Sensor Data\",
    \"topic\": \"application/1/device/+/rx\",
    \"qos\": \"2\",
    \"datatype\": \"json\",
    \"broker\": \"5b17c049.a3f1\",
    \"x\": 180,
    \"y\": 120,
    \"wires\": [
      [\"c2a908e1.45cb58\"]
    ]
  },
  {
    \"id\": \"c2a908e1.45cb58\",
    \"type\": \"function\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Decode Payload\",
    \"func\": \"// Extract device information\
var deviceEUI = msg.topic.split('/')[3];\
\
// Get base64 payload\
var payload = msg.payload.data;\
\
// Decode from base64\
var bytes = Buffer.from(payload, 'base64');\
\
// Parse binary format according to protocol\
var data = {\
    deviceEUI: deviceEUI,\
    timestamp: new Date().toISOString(),\
    temperature: ((bytes[0] << 8) | bytes[1]) / 100.0,\
    humidity: bytes[2] / 2.0,\
    smokePPM: (bytes[3] << 8) | bytes[4],\
    coPPM: (bytes[5] << 8) | bytes[6],\
    flameDetected: (bytes[7] & 0x80) !== 0,\
    batteryVoltage: (bytes[7] & 0x7F) / 20.0,\
    fireRiskScore: bytes[8] / 2.0\
};\
\
// Add GPS coordinates if available\
if (bytes.length >= 15) {\
    var lat = ((bytes[9] << 16) | (bytes[10] << 8) | bytes[11]);\
    // Convert from 24-bit signed to 32-bit signed\
    if (lat > 0x7FFFFF) lat = lat - 0x1000000;\
    \
    var lon = ((bytes[12] << 16) | (bytes[13] << 8) | bytes[14]);\
    // Convert from 24-bit signed to 32-bit signed\
    if (lon > 0x7FFFFF) lon = lon - 0x1000000;\
    \
    data.latitude = lat * 180.0 / 16777215.0;\
    data.longitude = lon * 180.0 / 16777215.0;\
    data.hasLocation = true;\
} else {\
    data.hasLocation = false;\
}\
\
// Add metadata\
data.rssi = msg.payload.rxInfo[0].rssi;\
data.snr = msg.payload.rxInfo[0].loRaSNR;\
data.spreadingFactor = msg.payload.txInfo.loRaModulationInfo.spreadingFactor;\
\
msg.payload = data;\
return msg;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 390,
    \"y\": 120,
    \"wires\": [
      [\"853cb0d8.29849\"]
    ]
  },
  {
    \"id\": \"853cb0d8.29849\",
    \"type\": \"function\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Data Validation\",
    \"func\": \"// Validate sensor readings\
var valid = true;\
var reasons = [];\
\
if (msg.payload.temperature < -40 || msg.payload.temperature > 85) {\
    valid = false;\
    reasons.push('Temperature out of range');\
}\
\
if (msg.payload.humidity < 0 || msg.payload.humidity > 100) {\
    valid = false;\
    reasons.push('Humidity out of range');\
}\
\
if (msg.payload.smokePPM < 0) {\
    valid = false;\
    reasons.push('Invalid smoke reading');\
}\
\
if (msg.payload.coPPM < 0) {\
    valid = false;\
    reasons.push('Invalid CO reading');\
}\
\
if (msg.payload.batteryVoltage < 2.0 || msg.payload.batteryVoltage > 4.5) {\
    valid = false;\
    reasons.push('Battery voltage out of range');\
}\
\
if (msg.payload.hasLocation) {\
    if (msg.payload.latitude < -90 || msg.payload.latitude > 90 ||\
        msg.payload.longitude < -180 || msg.payload.longitude > 180) {\
        valid = false;\
        reasons.push('Invalid GPS coordinates');\
    }\
}\
\
// Add validation result to payload\
msg.payload.valid = valid;\
msg.payload.validationErrors = reasons;\
\
return msg;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 620,
    \"y\": 120,
    \"wires\": [
      [\"4f621a7d.47fa04\"]
    ]
  },
  {
    \"id\": \"4f621a7d.47fa04\",
    \"type\": \"switch\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Valid Data?\",
    \"property\": \"payload.valid\",
    \"propertyType\": \"msg\",
    \"rules\": [
      {
        \"t\": \"true\"
      },
      {
        \"t\": \"false\"
      }
    ],
    \"checkall\": \"true\",
    \"repair\": false,
    \"outputs\": 2,
    \"x\": 810,
    \"y\": 120,
    \"wires\": [
      [\"77a95787.63c228\"],
      [\"9b873236.58ab7\"]
    ]
  },
  {
    \"id\": \"77a95787.63c228\",
    \"type\": \"function\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Enrich Data\",
    \"func\": \"// Add node metadata from context\
var nodeInfo = global.get('nodes.' + msg.payload.deviceEUI) || {};\
\
// Add location info if missing from payload but known in context\
if (!msg.payload.hasLocation && nodeInfo.latitude && nodeInfo.longitude) {\
    msg.payload.latitude = nodeInfo.latitude;\
    msg.payload.longitude = nodeInfo.longitude;\
    msg.payload.hasLocation = true;\
}\
\
// Add node name and zone\
msg.payload.nodeName = nodeInfo.name || msg.payload.deviceEUI;\
msg.payload.zone = nodeInfo.zone || 'default';\
\
// Add weather data if available\
var weather = global.get('weather') || {};\
msg.payload.ambientTemperature = weather.temperature;\
msg.payload.ambientHumidity = weather.humidity;\
msg.payload.windSpeed = weather.windSpeed;\
msg.payload.windDirection = weather.windDirection;\
\
// Add timestamp for processing\
msg.payload.processedAt = new Date().toISOString();\
\
return msg;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 980,
    \"y\": 80,
    \"wires\": [
      [\"db95b422.4d1be8\", \"e87f4d3.fd767\"]
    ]
  },
  {
    \"id\": \"9b873236.58ab7\",
    \"type\": \"debug\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Invalid Data Log\",
    \"active\": true,
    \"tosidebar\": true,
    \"console\": false,
    \"tostatus\": false,
    \"complete\": \"payload\",
    \"targetType\": \"msg\",
    \"x\": 990,
    \"y\": 160,
    \"wires\": []
  },
  {
    \"id\": \"db95b422.4d1be8\",
    \"type\": \"mqtt out\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"Processed Data\",
    \"topic\": \"sensors/processed\",
    \"qos\": \"1\",
    \"retain\": \"false\",
    \"broker\": \"5b17c049.a3f1\",
    \"x\": 1190,
    \"y\": 40,
    \"wires\": []
  },
  {
    \"id\": \"e87f4d3.fd767\",
    \"type\": \"link out\",
    \"z\": \"2f36ab1a.d0c954\",
    \"name\": \"To Alert Logic\",
    \"links\": [\"a45124e.f526ca8\"],
    \"x\": 1195,
    \"y\": 120,
    \"wires\": []
  }
]
```

**Alert Logic Flow Implementation:**

```json
[
  {
    \"id\": \"a45124e.f526ca8\",
    \"type\": \"link in\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"From Data Processing\",
    \"links\": [\"e87f4d3.fd767\"],
    \"x\": 175,
    \"y\": 120,
    \"wires\": [
      [\"58d8707f.89db7\"]
    ]
  },
  {
    \"id\": \"58d8707f.89db7\",
    \"type\": \"function\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Alert Threshold Check\",
    \"func\": \"// Get alert configuration from global context\
var config = global.get('alertConfig') || {\
    thresholds: {\
        low: 40,\
        medium: 60,\
        high: 80\
    },\
    hysteresis: 5  // Prevents alert flapping\
};\
\
// Determine alert level based on fire risk score\
var score = msg.payload.fireRiskScore;\
var alertLevel = 'none';\
\
if (score >= config.thresholds.high) {\
    alertLevel = 'high';\
} else if (score >= config.thresholds.medium) {\
    alertLevel = 'medium';\
} else if (score >= config.thresholds.low) {\
    alertLevel = 'low';\
}\
\
// Get previous state for this node\
var nodeContext = context.get(msg.payload.deviceEUI) || {\
    lastAlertLevel: 'none',\
    lastAlertTime: null\
};\
\
// Apply hysteresis to prevent flapping\
if (alertLevel !== 'none' && nodeContext.lastAlertLevel !== 'none') {\
    if (alertLevel === 'low' && nodeContext.lastAlertLevel === 'medium') {\
        // Only downgrade if score is below threshold minus hysteresis\
        if (score > config.thresholds.medium - config.hysteresis) {\
            alertLevel = 'medium';\
        }\
    } else if (alertLevel === 'medium' && nodeContext.lastAlertLevel === 'high') {\
        if (score > config.thresholds.high - config.hysteresis) {\
            alertLevel = 'high';\
        }\
    }\
}\
\
// Add alert information to the message\
msg.payload.alertLevel = alertLevel;\
msg.payload.previousAlertLevel = nodeContext.lastAlertLevel;\
msg.payload.alertChanged = (alertLevel !== nodeContext.lastAlertLevel);\
\
// Update context\
nodeContext.lastAlertLevel = alertLevel;\
nodeContext.lastAlertTime = new Date().toISOString();\
context.set(msg.payload.deviceEUI, nodeContext);\
\
return msg;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 410,
    \"y\": 120,
    \"wires\": [
      [\"8f4fd56d.e1caf8\"]
    ]
  },
  {
    \"id\": \"8f4fd56d.e1caf8\",
    \"type\": \"switch\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Alert Level Router\",
    \"property\": \"payload.alertLevel\",
    \"propertyType\": \"msg\",
    \"rules\": [
      {
        \"t\": \"eq\",
        \"v\": \"none\",
        \"vt\": \"str\"
      },
      {
        \"t\": \"eq\",
        \"v\": \"low\",
        \"vt\": \"str\"
      },
      {
        \"t\": \"eq\",
        \"v\": \"medium\",
        \"vt\": \"str\"
      },
      {
        \"t\": \"eq\",
        \"v\": \"high\",
        \"vt\": \"str\"
      }
    ],
    \"checkall\": \"true\",
    \"repair\": false,
    \"outputs\": 4,
    \"x\": 650,
    \"y\": 120,
    \"wires\": [
      [\"6e97f3df.1c42bc\"],
      [\"6e97f3df.1c42bc\", \"b7cbb1a7.a649e\"],
      [\"6e97f3df.1c42bc\", \"b7cbb1a7.a649e\", \"d987ad9e.c9a\"],
      [\"6e97f3df.1c42bc\", \"b7cbb1a7.a649e\", \"d987ad9e.c9a\", \"f1c1f367.68809\"]
    ]
  },
  {
    \"id\": \"6e97f3df.1c42bc\",
    \"type\": \"influxdb out\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Store Alert\",
    \"influxdb\": \"87654e52.54cb\",
    \"measurement\": \"alerts\",
    \"precision\": \"\",
    \"retentionPolicy\": \"\",
    \"database\": \"database\",
    \"precisionV18FluxV20\": \"ms\",
    \"retentionPolicyV18Flux\": \"\",
    \"org\": \"forestfire\",
    \"bucket\": \"sensordata\",
    \"x\": 900,
    \"y\": 60,
    \"wires\": []
  },
  {
    \"id\": \"b7cbb1a7.a649e\",
    \"type\": \"function\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Low Alert Logic\",
    \"func\": \"// Only process if alert level changed or if it's a periodic reminder\
if (msg.payload.alertChanged || global.get('sendPeriodicAlerts')) {\
    // Create alert message\
    var alert = {\
        level: 'low',\
        node: msg.payload.nodeName,\
        location: msg.payload.hasLocation ? \
                 `${msg.payload.latitude.toFixed(6)}, ${msg.payload.longitude.toFixed(6)}` : \
                 'Unknown',\
        zone: msg.payload.zone,\
        fireRiskScore: msg.payload.fireRiskScore,\
        timestamp: msg.payload.timestamp,\
        message: `Low fire risk detected at ${msg.payload.nodeName} (Score: ${msg.payload.fireRiskScore.toFixed(1)})`\
    };\
    \
    // Add sensor readings\
    alert.readings = {\
        temperature: msg.payload.temperature,\
        humidity: msg.payload.humidity,\
        smoke: msg.payload.smokePPM,\
        co: msg.payload.coPPM,\
        flameDetected: msg.payload.flameDetected\
    };\
    \
    return { payload: alert };\
}\
return null;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 900,
    \"y\": 120,
    \"wires\": [
      [\"a5c17b27.061eb8\"]
    ]
  },
  {
    \"id\": \"d987ad9e.c9a\",
    \"type\": \"function\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Medium Alert Logic\",
    \"func\": \"// Process medium alerts\
if (msg.payload.alertChanged || global.get('sendPeriodicAlerts')) {\
    // Create alert message with higher priority\
    var alert = {\
        level: 'medium',\
        node: msg.payload.nodeName,\
        location: msg.payload.hasLocation ? \
                 `${msg.payload.latitude.toFixed(6)}, ${msg.payload.longitude.toFixed(6)}` : \
                 'Unknown',\
        zone: msg.payload.zone,\
        fireRiskScore: msg.payload.fireRiskScore,\
        timestamp: msg.payload.timestamp,\
        message: `Medium fire risk detected at ${msg.payload.nodeName} (Score: ${msg.payload.fireRiskScore.toFixed(1)})`,\
        priority: 'high'\
    };\
    \
    // Add sensor readings\
    alert.readings = {\
        temperature: msg.payload.temperature,\
        humidity: msg.payload.humidity,\
        smoke: msg.payload.smokePPM,\
        co: msg.payload.coPPM,\
        flameDetected: msg.payload.flameDetected\
    };\
    \
    return { payload: alert };\
}\
return null;\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 910,
    \"y\": 180,
    \"wires\": [
      [\"a5c17b27.061eb8\"]
    ]
  },
  {
    \"id\": \"f1c1f367.68809\",
    \"type\": \"function\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"High Alert Logic\",
    \"func\": \"// Always process high alerts\
var alert = {\
    level: 'high',\
    node: msg.payload.nodeName,\
    location: msg.payload.hasLocation ? \
             `${msg.payload.latitude.toFixed(6)}, ${msg.payload.longitude.toFixed(6)}` : \
             'Unknown',\
    zone: msg.payload.zone,\
    fireRiskScore: msg.payload.fireRiskScore,\
    timestamp: msg.payload.timestamp,\
    message: `CRITICAL: High fire risk detected at ${msg.payload.nodeName} (Score: ${msg.payload.fireRiskScore.toFixed(1)})`,\
    priority: 'critical'\
};\
\
// Add sensor readings\
alert.readings = {\
    temperature: msg.payload.temperature,\
    humidity: msg.payload.humidity,\
    smoke: msg.payload.smokePPM,\
    co: msg.payload.coPPM,\
    flameDetected: msg.payload.flameDetected\
};\
\
return { payload: alert };\",
    \"outputs\": 1,
    \"noerr\": 0,
    \"x\": 900,
    \"y\": 240,
    \"wires\": [
      [\"a5c17b27.061eb8\", \"cc7dcfe6.08f2c\"]
    ]
  },
  {
    \"id\": \"a5c17b27.061eb8\",
    \"type\": \"mqtt out\",
    \"z\": \"7d4c6f26.afc26\",
    \"name\": \"Alert Notifications\",
    \"topic\": \"alerts/notifications\",
    \"qos\": \"2\",
    \"retain\": \"false\",
    \"broker\": \"5b17c049.a3f1\",
    \"x\": 1130,
    \"y\": 180,
    \"wires\": []
  },
  {
    \"id\": \"cc7dcfe6.08f2c\",
    \"type\": \"exec\",
    \"z\": \"7d4c6f26.afc26\",
    \"command\": \"/usr/local/bin/trigger_alarm.sh\",
    \"addpay\": \"true\",
    \"append\": \"\",
    \"useSpawn\": \"false\",
    \"timer\": \"\",
    \"oldrc\": false,
    \"name\": \"Trigger Local Alarm\",
    \"x\": 1130,
    \"y\": 240,
    \"wires\": [
      [],
      [],
      []
    ]
  }
]
```

These flows implement the core data processing and alert logic required for the fog layer, with similar flows handling data storage, visualization, and system management.

### 4.2.5 Time-Series Database Configuration

InfluxDB serves as the primary time-series database for storing sensor readings, derived metrics, and system events:

**InfluxDB Configuration:**

```yaml
# InfluxDB configuration file

[storage]
  engine = \"tsm1\"
  # Directory where the TSM storage engine stores TSM files.
  path = \"/var/lib/influxdb2/engine\"
  
  # Duration at which the WAL should be flushed.
  wal-flush-interval = \"10m\"
  
  # Maximum size of concurrent writes to the WAL.
  max-concurrent-compactions = 4
  
  # Maximum series limit per database.
  max-series-per-database = 1000000
  
  # Maximum index log file size before compaction.
  max-index-log-file-size = \"16m\"

[logging]
  level = \"info\"
  
  # Whether to enable HTTP access logging.
  http-access = true
  
  # Whether to compress output.
  file-compression = true

[http]
  bind-address = \":8086\"
  
  # Whether HTTP writes should be compressed.
  write-compression = true
  
  # Maximum request body size in bytes.
  max-body-size = 25000000
  
  # Maximum concurrent requests.
  max-concurrent-write-limit = 10000
  
  # Maximum number of points in a write batch.
  max-enqueued-write-limit = 1000000
  
  # Maximum time a write request can wait to be processed.
  enqueued-write-timeout = \"30s\"
```

**Data Structure:**

The time-series database employs a structured schema with the following measurements:

1. **sensor_readings:** Raw and processed sensor data
   - Fields: temperature, humidity, smokePPM, coPPM, flameDetected, batteryVoltage, fireRiskScore
   - Tags: deviceEUI, nodeName, zone, alertLevel

2. **alerts:** Alert events and status changes
   - Fields: fireRiskScore, message, acknowledged
   - Tags: deviceEUI, nodeName, zone, alertLevel

3. **system_metrics:** Gateway and server performance metrics
   - Fields: cpuLoad, memoryUsage, diskSpace, temperature
   - Tags: deviceType, deviceID

4. **network_metrics:** Communication statistics
   - Fields: rssi, snr, spreadingFactor, packetLoss
   - Tags: deviceEUI, gatewayID

Retention policies are configured to manage data lifecycle:
- Raw sensor data: 30 days
- Downsampled hourly aggregates: 1 year
- Downsampled daily aggregates: 5 years
- Alert events: 2 years
- System metrics: 30 days

### 4.2.6 Alert Notification System

The fog layer implements a comprehensive alert notification system capable of operating autonomously when cloud connectivity is unavailable:

**SMS Gateway Integration:**

```javascript
// Node-RED function for SMS alert dispatch
module.exports = function(RED) {
    function SMSAlertNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Load configuration
        this.phoneNumbers = config.phoneNumbers || \"\";
        this.modemDevice = config.modemDevice || \"/dev/ttyUSB0\";
        this.messagePrefix = config.messagePrefix || \"FIRE ALERT: \";
        
        // Initialize modem on startup
        const SerialPort = require('serialport');
        this.serialPort = new SerialPort(this.modemDevice, {
            baudRate: 115200,
            autoOpen: true
        });
        
        // Handle incoming messages
        node.on('input', function(msg) {
            if (!msg.payload || !msg.payload.level || !msg.payload.message) {
                node.warn(\"Invalid alert format received\");
                return;
            }
            
            // Only send SMS for medium and high alerts
            if (msg.payload.level === 'low') {
                return;
            }
            
            const recipients = node.phoneNumbers.split(',').map(num => num.trim());
            const message = node.messagePrefix + msg.payload.message;
            
            // Queue messages for each recipient
            recipients.forEach(phone => {
                node.sendSMS(phone, message, function(err, result) {
                    if (err) {
                        node.error(`SMS send error to ${phone}: ${err}`);
                    } else {
                        node.log(`SMS sent to ${phone}: ${result}`);
                    }
                });
            });
        });
        
        // SMS sending function using AT commands
        this.sendSMS = function(phoneNumber, message, callback) {
            const commands = [
                { cmd: 'AT\\r', expect: 'OK' },
                { cmd: 'AT+CMGF=1\\r', expect: 'OK' },
                { cmd: `AT+CMGS=\"${phoneNumber}\"\\r`, expect: '>' },
                { cmd: message + '\\x1A', expect: 'OK' }
            ];
            
            let cmdIndex = 0;
            let responseData = '';
            
            // Set up response handler
            const dataHandler = (data) => {
                responseData += data.toString();
                
                if (responseData.includes(commands[cmdIndex].expect)) {
                    // Current command successful
                    cmdIndex++;
                    responseData = '';
                    
                    if (cmdIndex < commands.length) {
                        // Send next command
                        setTimeout(() => {
                            node.serialPort.write(commands[cmdIndex].cmd);
                        }, 500);
                    } else {
                        // All commands completed
                        node.serialPort.removeListener('data', dataHandler);
                        if (callback) callback(null, 'Message sent');
                    }
                } else if (responseData.includes('ERROR')) {
                    // Command failed
                    node.serialPort.removeListener('data', dataHandler);
                    if (callback) callback(responseData, null);
                }
            };
            
            // Start command sequence
            node.serialPort.on('data', dataHandler);
            node.serialPort.write(commands[0].cmd);
        };
        
        // Clean up on close
        this.on('close', function() {
            if (node.serialPort && node.serialPort.isOpen) {
                node.serialPort.close();
            }
        });
    }
    
    RED.nodes.registerType(\"sms-alert\", SMSAlertNode);
}
```

**Email Alert Configuration:**

```json
{
    \"id\": \"email-alert-config\",
    \"type\": \"e-mail\",
    \"server\": \"smtp.gmail.com\",
    \"port\": \"587\",
    \"secure\": false,
    \"tls\": true,
    \"name\": \"Forest Fire Alert\",
    \"dname\": \"Fire Alert System\",
    \"credentials\": {
        \"userid\": \"alerts@forestfire-project.org\",
        \"password\": \"{{SMTP_PASSWORD}}\"
    }
}
```

**Local Alarm Activation Script:**

```bash
#!/bin/bash
# Script to activate local visual and audible alarms

# Read alert information from stdin
read alert_json

# Extract alert level using jq
LEVEL=$(echo $alert_json | jq -r '.level')

# Set GPIO pins for alarms
LED_PIN=17
SIREN_PIN=27

# Configure GPIO if not already done
if [ ! -d /sys/class/gpio/gpio$LED_PIN ]; then
    echo $LED_PIN > /sys/class/gpio/export
    echo \"out\" > /sys/class/gpio/gpio$LED_PIN/direction
fi

if [ ! -d /sys/class/gpio/gpio$SIREN_PIN ]; then
    echo $SIREN_PIN > /sys/class/gpio/export
    echo \"out\" > /sys/class/gpio/gpio$SIREN_PIN/direction
fi

# Activate alarms based on alert level
case \"$LEVEL\" in
    \"high\")
        # Continuous alarm for high alert
        echo 1 > /sys/class/gpio/gpio$LED_PIN/value
        echo 1 > /sys/class/gpio/gpio$SIREN_PIN/value
        
        # Log activation
        logger -t alarm \"Activated HIGH ALERT alarm\"
        
        # Schedule deactivation after 30 seconds
        (sleep 30 && echo 0 > /sys/class/gpio/gpio$SIREN_PIN/value) &
        ;;
        
    \"medium\")
        # Intermittent alarm for medium alert
        echo 1 > /sys/class/gpio/gpio$LED_PIN/value
        
        # 5 short beeps
        for i in {1..5}; do
            echo 1 > /sys/class/gpio/gpio$SIREN_PIN/value
            sleep 0.5
            echo 0 > /sys/class/gpio/gpio$SIREN_PIN/value
            sleep 0.5
        done
        
        logger -t alarm \"Activated MEDIUM ALERT alarm\"
        ;;
        
    *)
        # No alarm for low alerts
        echo 0 > /sys/class/gpio/gpio$SIREN_PIN/value
        
        # Blink LED briefly to indicate processing
        echo 1 > /sys/class/gpio/gpio$LED_PIN/value
        sleep 1
        echo 0 > /sys/class/gpio/gpio$LED_PIN/value
        ;;
esac

exit 0
```

This multi-channel alert system ensures that notifications reach relevant stakeholders through appropriate means based on alert severity and available communication channels.

## 4.3 Cloud Deployment (AWS EC2; Managed MQTT & Time-Series DB)

The cloud layer extends the system's capabilities with enhanced storage, processing, and visualization facilities while providing a centralized management interface for the entire fire detection network.

### 4.3.1 Cloud Infrastructure Deployment

The AWS cloud infrastructure is deployed using Infrastructure as Code (IaC) principles through AWS CloudFormation:

**CloudFormation Template Excerpt:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Forest Fire Detection System Cloud Infrastructure'

Parameters:
  EnvironmentName:
    Type: String
    Default: 'production'
    AllowedValues:
      - 'development'
      - 'staging'
      - 'production'
  
  InstanceType:
    Type: String
    Default: 't3.medium'
    AllowedValues:
      - 't3.small'
      - 't3.medium'
      - 't3.large'
  
  VolumeSize:
    Type: Number
    Default: 200
    MinValue: 100
    MaxValue: 1000

Resources:
  # VPC and networking resources
  FireDetectionVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-fire-detection-vpc'
  
  # ... Other networking resources omitted for brevity ...
  
  # EC2 Instance
  FireDetectionServer:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: 'ami-0c55b159cbfafe1f0'  # Amazon Linux 2
      KeyName: 'fire-detection-keypair'
      NetworkInterfaces:
        - AssociatePublicIpAddress: true
          DeviceIndex: 0
          SubnetId: !Ref PublicSubnet1
          GroupSet:
            - !Ref ServerSecurityGroup
      BlockDeviceMappings:
        - DeviceName: /dev/xvda
          Ebs:
            VolumeSize: !Ref VolumeSize
            VolumeType: gp3
            DeleteOnTermination: true
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          # Bootstrap script
          yum update -y
          amazon-linux-extras install docker -y
          systemctl start docker
          systemctl enable docker
          usermod -a -G docker ec2-user
          curl -L \"https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
          mkdir -p /opt/fire-detection
          
          # Download configuration files from S3
          aws s3 cp s3://fire-detection-configs/${EnvironmentName}/docker-compose.yml /opt/fire-detection/
          aws s3 cp s3://fire-detection-configs/${EnvironmentName}/environment.env /opt/fire-detection/
          
          # Start services
          cd /opt/fire-detection
          docker-compose up -d
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-fire-detection-server'
  
  # S3 bucket for data storage
  FireDetectionBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'fire-detection-data-${EnvironmentName}'
      VersioningConfiguration:
        Status: Enabled
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveRule
            Status: Enabled
            Transitions:
              - TransitionInDays: 90
                StorageClass: STANDARD_IA
              - TransitionInDays: 365
                StorageClass: GLACIER
  
  # ... Additional resources omitted for brevity ...

Outputs:
  ServerPublicIP:
    Description: 'Public IP address of the EC2 instance'
    Value: !GetAtt FireDetectionServer.PublicIp
  
  S3BucketName:
    Description: 'Name of the S3 bucket for data storage'
    Value: !Ref FireDetectionBucket
```

This infrastructure deployment creates the necessary computing resources, networking, storage, and security configurations for the cloud layer.

### 4.3.2 Docker Compose Configuration

Similar to the fog layer, the cloud services are deployed as Docker containers for consistent management and scalability:

```yaml
version: '3'

services:
  # MQTT bridge for fog layer communication
  mqtt-bridge:
    image: eclipse-mosquitto:2.0
    volumes:
      - ./configuration/mqtt-bridge:/mosquitto/config
      - ./data/mqtt-bridge:/mosquitto/data
    ports:
      - \"8883:8883\"
      - \"9001:9001\"
    restart: unless-stopped
  
  # InfluxDB for time-series data storage
  influxdb:
    image: influxdb:2.2
    volumes:
      - ./data/influxdb:/var/lib/influxdb2
    ports:
      - \"8086:8086\"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=${INFLUXDB_PASSWORD}
      - DOCKER_INFLUXDB_INIT_ORG=forestfire
      - DOCKER_INFLUXDB_INIT_BUCKET=sensordata
      - DOCKER_INFLUXDB_INIT_RETENTION=1825d
    restart: unless-stopped
  
  # Grafana for data visualization
  grafana:
    image: grafana/grafana:8.5.0
    volumes:
      - ./data/grafana:/var/lib/grafana
      - ./configuration/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - \"3000:3000\"
    depends_on:
      - influxdb
    restart: unless-stopped
  
  # Node-RED for data processing and integration
  nodered:
    image: nodered/node-red:2.2.2
    volumes:
      - ./data/nodered:/data
    ports:
      - \"1880:1880\"
    depends_on:
      - mqtt-bridge
      - influxdb
    restart: unless-stopped
  
  # Nginx for web serving and reverse proxy
  nginx:
    image: nginx:1.21-alpine
    volumes:
      - ./configuration/nginx:/etc/nginx/conf.d
      - ./www:/usr/share/nginx/html
      - ./data/certbot/conf:/etc/letsencrypt
      - ./data/certbot/www:/var/www/certbot
    ports:
      - \"80:80\"
      - \"443:443\"
    restart: unless-stopped
  
  # Certbot for SSL certificate management
  certbot:
    image: certbot/certbot
    volumes:
      - ./data/certbot/conf:/etc/letsencrypt
      - ./data/certbot/www:/var/www/certbot
    entrypoint: \"/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'\"
  
  # Data synchronization service
  sync-service:
    build: ./sync-service
    volumes:
      - ./data/sync:/data
    depends_on:
      - influxdb
    environment:
      - INFLUXDB_URL=http://influxdb:8086
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_ORG=forestfire
      - INFLUXDB_BUCKET=sensordata
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET=${S3_BUCKET}
    restart: unless-stopped
  
  # Alert management service
  alert-service:
    build: ./alert-service
    volumes:
      - ./configuration/alert-service:/config
    depends_on:
      - mqtt-bridge
      - influxdb
    ports:
      - \"3001:3001\"
    environment:
      - INFLUXDB_URL=http://influxdb:8086
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_ORG=forestfire
      - INFLUXDB_BUCKET=sensordata
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

This configuration deploys the core services required for the cloud layer, with security credentials and other sensitive information provided through environment variables.

### 4.3.3 Data Synchronization Service

To enable efficient data transfer between fog and cloud layers while handling intermittent connectivity, a custom synchronization service is implemented:

```javascript
// data-sync.js - Core logic for fog-cloud data synchronization

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mqtt = require('mqtt');
const cron = require('node-cron');

// Configuration from environment variables
const config = {
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://localhost:8086',
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG || 'forestfire',
    bucket: process.env.INFLUXDB_BUCKET || 'sensordata'
  },
  s3: {
    bucket: process.env.S3_BUCKET || 'fire-detection-data-production',
    region: process.env.AWS_REGION || 'us-east-1'
  },
  mqtt: {
    url: process.env.MQTT_URL || 'mqtt://localhost:1883',
    clientId: process.env.MQTT_CLIENT_ID || `sync-service-${Math.random().toString(16).slice(2, 8)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
  },
  sync: {
    interval: process.env.SYNC_INTERVAL || '0 */2 * * *',  // Every 2 hours by default
    dataDir: process.env.DATA_DIR || '/data'
  }
};

// Initialize clients
const influxClient = new InfluxDB({ url: config.influxdb.url, token: config.influxdb.token });
const s3Client = new S3Client({ region: config.s3.region });
const mqttClient = mqtt.connect(config.mqtt.url, {
  clientId: config.mqtt.clientId,
  username: config.mqtt.username,
  password: config.mqtt.password
});

// Create data directory if it doesn't exist
if (!fs.existsSync(config.sync.dataDir)) {
  fs.mkdirSync(config.sync.dataDir, { recursive: true });
}

// Function to fetch data from InfluxDB
async function fetchDataFromInfluxDB(startTime, endTime) {
  console.log(`Fetching data from InfluxDB (${startTime} to ${endTime})`);
  
  const queryApi = influxClient.getQueryApi(config.influxdb.org);
  const query = `
    from(bucket: \"${config.influxdb.bucket}\")
      |> range(start: ${startTime}, stop: ${endTime})
      |> filter(fn: (r) => r[\"_measurement\"] == \"sensor_readings\" or r[\"_measurement\"] == \"alerts\")
  `;
  
  let result = [];
  try {
    for await (const {values, tableMeta} of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      result.push(o);
    }
    console.log(`Retrieved ${result.length} records from InfluxDB`);
    return result;
  } catch (error) {
    console.error('Error querying InfluxDB:', error);
    throw error;
  }
}

// Function to upload data to S3
async function uploadToS3(data, timestamp) {
  const fileName = `sync-${timestamp}.json.gz`;
  const filePath = path.join(config.sync.dataDir, fileName);
  
  // Compress data
  const jsonData = JSON.stringify(data);
  const compressed = zlib.gzipSync(jsonData);
  
  // Write to local file
  fs.writeFileSync(filePath, compressed);
  
  // Upload to S3
  const key = `data/${fileName}`;
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: compressed,
      ContentType: 'application/json',
      ContentEncoding: 'gzip'
    }));
    
    console.log(`Successfully uploaded data to s3://${config.s3.bucket}/${key}`);
    
    // Clean up local file after successful upload
    fs.unlinkSync(filePath);
    
    return { bucket: config.s3.bucket, key };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    console.log(`Keeping local backup at ${filePath}`);
    throw error;
  }
}

// Function to process local backup files
async function processLocalBackups() {
  // Find all .json.gz files in the data directory
  const files = fs.readdirSync(config.sync.dataDir)
    .filter(file => file.startsWith('sync-') && file.endsWith('.json.gz'))
    .sort();
  
  if (files.length === 0) {
    console.log('No local backup files to process');
    return;
  }
  
  console.log(`Found ${files.length} local backup files to process`);
  
  for (const file of files) {
    const filePath = path.join(config.sync.dataDir, file);
    try {
      // Read and decompress file
      const compressed = fs.readFileSync(filePath);
      const jsonData = zlib.gunzipSync(compressed).toString();
      const data = JSON.parse(jsonData);
      
      // Upload to S3
      const key = `data/${file}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: compressed,
        ContentType: 'application/json',
        ContentEncoding: 'gzip'
      }));
      
      console.log(`Successfully uploaded backup file to s3://${config.s3.bucket}/${key}`);
      
      // Clean up local file after successful upload
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Error processing backup file ${file}:`, error);
      // Continue with next file
    }
  }
}

// Main sync function
async function performSync() {
  console.log('Starting data synchronization...');
  
  // Process any local backups first
  await processLocalBackups().catch(err => {
    console.error('Error processing local backups:', err);
  });
  
  // Calculate time range for this sync
  // Start from 24 hours ago to ensure overlap with previous sync
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  try {
    // Fetch data
    const data = await fetchDataFromInfluxDB(startTime, endTime);
    
    if (data.length === 0) {
      console.log('No data to sync');
      return;
    }
    
    // Upload to S3
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\\..+/, '');
    await uploadToS3(data, timestamp);
    
    // Publish success message
    mqttClient.publish('system/sync/status', JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      recordCount: data.length,
      timeRange: { start: startTime, end: endTime }
    }));
    
    console.log('Synchronization completed successfully');
  } catch (error) {
    console.error('Synchronization failed:', error);
    
    // Publish failure message
    mqttClient.publish('system/sync/status', JSON.stringify({
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: error.message
    }));
  }
}

// Set up scheduled sync
cron.schedule(config.sync.interval, () => {
  performSync().catch(err => {
    console.error('Scheduled sync failed:', err);
  });
});

// Set up MQTT listeners
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('system/sync/trigger');
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'system/sync/trigger') {
    console.log('Received sync trigger via MQTT');
    performSync().catch(err => {
      console.error('Triggered sync failed:', err);
    });
  }
});

// Perform initial sync on startup
setTimeout(() => {
  performSync().catch(err => {
    console.error('Initial sync failed:', err);
  });
}, 10000);  // 10 second delay to ensure all services are ready

console.log(`Data synchronization service started with sync interval: ${config.sync.interval}`);
```

This service ensures that data collected at the fog layer is reliably transferred to the cloud, even in environments with inconsistent connectivity. It implements compression, local buffering, and scheduled synchronization to optimize bandwidth usage and ensure data integrity.

### 4.3.4 Frontend Implementation

The cloud layer provides a web-based user interface for system monitoring, management, and data visualization. The frontend is implemented using React.js with a responsive design for both desktop and mobile access:

**Dashboard Component:**

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { fireIcon, warningIcon, okIcon } from '../utils/mapIcons';
import { fetchLatestReadings, fetchFireRiskHistory } from '../api/sensorData';
import { formatDateTime, formatTemperature } from '../utils/formatters';
import NodeSummary from '../components/NodeSummary';
import AlertsList from '../components/AlertsList';

const Dashboard = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [fireRiskHistory, setFireRiskHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const latestData = await fetchLatestReadings();
        setNodes(latestData);
        
        // Load fire risk history for first node if available
        if (latestData.length > 0) {
          const nodeId = latestData[0].deviceEUI;
          setSelectedNodeId(nodeId);
          const history = await fetchFireRiskHistory(nodeId, '24h');
          setFireRiskHistory(history);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);
  
  const handleNodeSelect = async (nodeId) => {
    setSelectedNodeId(nodeId);
    try {
      const history = await fetchFireRiskHistory(nodeId, '24h');
      setFireRiskHistory(history);
    } catch (err) {
      console.error('Failed to load node history:', err);
    }
  };
  
  const getNodeIcon = (node) => {
    const riskScore = node.fireRiskScore || 0;
    if (riskScore >= 80) return fireIcon;
    if (riskScore >= 40) return warningIcon;
    return okIcon;
  };
  
  if (loading) return <div className=\"loading\">Loading dashboard data...</div>;
  if (error) return <div className=\"error\">{error}</div>;
  
  return (
    <div className=\"dashboard\">
      <h1>Forest Fire Detection Dashboard</h1>
      
      <div className=\"dashboard-grid\">
        {/* Map display */}
        <div className=\"map-container\">
          <MapContainer center={[8.9806, -79.5182]} zoom={11} style={{ height: '400px', width: '100%' }}>
            <TileLayer
              url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"
              attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'
            />
            {nodes.map(node => (
              node.hasLocation && (
                <Marker 
                  key={node.deviceEUI}
                  position={[node.latitude, node.longitude]}
                  icon={getNodeIcon(node)}
                  eventHandlers={{
                    click: () => handleNodeSelect(node.deviceEUI)
                  }}
                >
                  <Popup>
                    <strong>{node.nodeName}</strong><br />
                    Risk score: {node.fireRiskScore.toFixed(1)}<br />
                    Last update: {formatDateTime(node.timestamp)}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
        
        {/* Fire risk history chart */}
        <div className=\"chart-container\">
          <h2>Fire Risk History</h2>
          {fireRiskHistory.length > 0 ? (
            <ResponsiveContainer width=\"100%\" height={300}>
              <LineChart data={fireRiskHistory}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis dataKey=\"time\" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(1)}`, 'Fire Risk']}
                  labelFormatter={(time) => new Date(time).toLocaleString()}
                />
                <Line 
                  type=\"monotone\" 
                  dataKey=\"score\" 
                  stroke=\"#ff7300\" 
                  activeDot={{ r: 8 }} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className=\"no-data\">No history data available</div>
          )}
        </div>
        
        {/* Node summary */}
        <div className=\"node-summary\">
          <h2>Sensor Nodes</h2>
          <div className=\"node-list\">
            {nodes.map(node => (
              <NodeSummary 
                key={node.deviceEUI}
                node={node}
                isSelected={node.deviceEUI === selectedNodeId}
                onSelect={() => handleNodeSelect(node.deviceEUI)}
              />
            ))}
          </div>
        </div>
        
        {/* Recent alerts */}
        <div className=\"alerts-panel\">
          <h2>Recent Alerts</h2>
          <AlertsList limit={5} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

**Node Management Interface:**

```jsx
import React, { useState, useEffect } from 'react';
import { fetchNodes, updateNode, deleteNode, createNode } from '../api/nodeManagement';
import NodeForm from '../components/NodeForm';
import { confirmDialog } from '../utils/dialogs';

const NodeManagement = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadNodes();
  }, []);
  
  const loadNodes = async () => {
    try {
      setLoading(true);
      const nodesData = await fetchNodes();
      setNodes(nodesData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load nodes');
      setLoading(false);
      console.error(err);
    }
  };
  
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setIsEditing(false);
    setIsCreating(false);
  };
  
  const handleEdit = () => {
    if (selectedNode) {
      setIsEditing(true);
      setIsCreating(false);
    }
  };
  
  const handleCreate = () => {
    setSelectedNode(null);
    setIsEditing(false);
    setIsCreating(true);
  };
  
  const handleDelete = async () => {
    if (!selectedNode) return;
    
    const confirmed = await confirmDialog(
      'Delete Node',
      `Are you sure you want to delete the node \"${selectedNode.name}\"? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        await deleteNode(selectedNode.deviceEUI);
        await loadNodes();
        setSelectedNode(null);
      } catch (err) {
        setError(`Failed to delete node: ${err.message}`);
      }
    }
  };
  
  const handleSave = async (nodeData) => {
    try {
      if (isCreating) {
        await createNode(nodeData);
      } else {
        await updateNode(selectedNode.deviceEUI, nodeData);
      }
      
      await loadNodes();
      setIsEditing(false);
      setIsCreating(false);
    } catch (err) {
      setError(`Failed to save node: ${err.message}`);
    }
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };
  
  if (loading) return <div className=\"loading\">Loading nodes...</div>;
  
  return (
    <div className=\"node-management\">
      <h1>Node Management</h1>
      
      {error && <div className=\"error\">{error}</div>}
      
      <div className=\"node-management-grid\">
        <div className=\"node-list-panel\">
          <div className=\"panel-header\">
            <h2>Sensor Nodes</h2>
            <button onClick={handleCreate} className=\"create-button\">Add Node</button>
          </div>
          
          <div className=\"node-list\">
            {nodes.length > 0 ? (
              nodes.map(node => (
                <div 
                  key={node.deviceEUI}
                  className={`node-item ${selectedNode && selectedNode.deviceEUI === node.deviceEUI ? 'selected' : ''}`}
                  onClick={() => handleNodeSelect(node)}
                >
                  <div className=\"node-name\">{node.name || 'Unnamed Node'}</div>
                  <div className=\"node-eui\">{node.deviceEUI}</div>
                  <div className=\"node-zone\">{node.zone || 'Default Zone'}</div>
                </div>
              ))
            ) : (
              <div className=\"no-nodes\">No nodes available</div>
            )}
          </div>
        </div>
        
        <div className=\"node-details-panel\">
          {isCreating ? (
            <>
              <h2>Create New Node</h2>
              <NodeForm onSave={handleSave} onCancel={handleCancel} />
            </>
          ) : isEditing && selectedNode ? (
            <>
              <h2>Edit Node</h2>
              <NodeForm node={selectedNode} onSave={handleSave} onCancel={handleCancel} />
            </>
          ) : selectedNode ? (
            <>
              <div className=\"panel-header\">
                <h2>Node Details</h2>
                <div className=\"action-buttons\">
                  <button onClick={handleEdit} className=\"edit-button\">Edit</button>
                  <button onClick={handleDelete} className=\"delete-button\">Delete</button>
                </div>
              </div>
              
              <div className=\"node-details\">
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Name</div>
                  <div className=\"detail-value\">{selectedNode.name || 'Unnamed Node'}</div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Device EUI</div>
                  <div className=\"detail-value\">{selectedNode.deviceEUI}</div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Zone</div>
                  <div className=\"detail-value\">{selectedNode.zone || 'Default Zone'}</div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Location</div>
                  <div className=\"detail-value\">
                    {selectedNode.latitude && selectedNode.longitude ? 
                      `${selectedNode.latitude.toFixed(6)}, ${selectedNode.longitude.toFixed(6)}` : 
                      'Not specified'}
                  </div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Description</div>
                  <div className=\"detail-value\">{selectedNode.description || 'No description'}</div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Last Seen</div>
                  <div className=\"detail-value\">
                    {selectedNode.lastSeen ? 
                      new Date(selectedNode.lastSeen).toLocaleString() : 
                      'Never connected'}
                  </div>
                </div>
                <div className=\"detail-row\">
                  <div className=\"detail-label\">Battery</div>
                  <div className=\"detail-value\">
                    {selectedNode.batteryVoltage ? 
                      `${selectedNode.batteryVoltage.toFixe`
}
