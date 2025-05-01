// code/firmware/SensorNodeFirmware.ino
/**
 * Solar-Assisted WSN-LoRa IoT Framework for Forest Fire Detection
 * Sensor Node Firmware for Heltec LoRa ESP32 v2.1
 * 
 * MSc Thesis Implementation
 * July 2022
 */

#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <LoRaWan_APP.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>
#include <ESP32Time.h>
#include "HardwareSerial.h"
#include "driver/adc.h"
#include <esp_sleep.h>
#include <EEPROM.h>

// Node configuration
#define NODE_ID "WSN-01"
#define FIRMWARE_VERSION "1.0.0"

// Hardware pin definitions
#define FLAME_SENSOR_PIN 13      // YG1006 flame sensor
#define SMOKE_SENSOR_PIN 36      // MQ-2 analog output
#define BATTERY_VOLTAGE_PIN 37   // Battery voltage monitoring
#define SOLAR_VOLTAGE_PIN 38     // Solar panel voltage monitoring
#define BUZZER_PIN 25            // Alarm buzzer
#define LED_PIN 12               // Indicator LED

// GPS UART configuration
#define GPS_BAUD 9600
#define GPS_RX 22
#define GPS_TX 23
HardwareSerial GPSSerial(1);

// LoRa parameters
#define LORAWAN_APP_PORT 2
uint8_t devEui[] = { 0x70, 0xB3, 0xD5, 0x7E, 0xD0, 0x04, 0x03, 0x01 };
uint8_t appEui[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
uint8_t appKey[] = { 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88 };

// Sensor objects
Adafruit_BME680 bme;
TinyGPSPlus gps;
ESP32Time rtc;

// Configuration variables (stored in EEPROM)
struct NodeConfig {
  uint16_t sampleInterval;       // Time between sensor readings (seconds)
  uint16_t transmitInterval;     // Time between LoRa transmissions (seconds)
  float tempThreshold;           // Temperature threshold for fire alert (°C)
  float humidityThreshold;       // Humidity threshold for fire alert (%)
  uint16_t smokeThreshold;       // Smoke threshold for fire alert (ppm)
  uint16_t coThreshold;          // CO threshold for fire alert (ppm)
  bool lowPowerMode;             // Low power mode enable/disable
  bool alertEnabled;             // Local alert (buzzer/LED) enable/disable
  uint8_t checksum;              // Configuration checksum for validation
};

NodeConfig config;
const int configAddr = 0;

// Sensor readings
struct SensorData {
  float temperature;
  float humidity;
  float pressure;
  float gasResistance;
  uint16_t smoke;
  uint16_t co;
  bool flameDetected;
  float latitude;
  float longitude;
  bool locationValid;
  uint8_t battery;               // Battery level in percentage
  float solarVoltage;            // Solar panel voltage
  float batteryVoltage;          // Battery voltage
  int8_t rssi;                   // LoRa RSSI
  time_t timestamp;              // UNIX timestamp
};

SensorData sensorData;

// Timing variables
uint32_t lastSampleTime = 0;
uint32_t lastTransmitTime = 0;
uint32_t gpsUpdateTime = 0;
int loraJoinAttempts = 0;

// Function prototypes
void loadDefaultConfig();
void saveConfig();
void loadConfig();
bool validateConfig();
void readSensors();
void processData();
void transmitData();
void handleLoRaEvent(EVENT_MSG *msg);
float calculateFireRisk();
void activateAlert(bool isActive);
void enterLowPowerMode();
void handleSerialCommands();
void printStatus();
void setupLoRa();

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println("\n\nForest Fire Detection Sensor Node Starting...");
  Serial.print("Node ID: ");
  Serial.println(NODE_ID);
  Serial.print("Firmware: ");
  Serial.println(FIRMWARE_VERSION);
  
  // Initialize EEPROM
  EEPROM.begin(512);
  
  // Load configuration
  loadConfig();
  if (!validateConfig()) {
    Serial.println("Invalid configuration, loading defaults");
    loadDefaultConfig();
    saveConfig();
  }
  
  // Initialize pins
  pinMode(FLAME_SENSOR_PIN, INPUT);
  pinMode(SMOKE_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize BME680 environmental sensor
  if (!bme.begin(0x76)) {
    Serial.println("Could not find BME680 sensor!");
    digitalWrite(LED_PIN, HIGH);  // Error indication
  }
  
  // Set up BME680 parameters
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150); // 320°C for 150 ms
  
  // Initialize GPS
  GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("GPS initialized");
  
  // Initialize LoRa
  setupLoRa();
  
  // Set RTC to a default time (will be updated when GPS gets a fix)
  rtc.setTime(0, 0, 0, 1, 1, 2022);
  
  Serial.println("Initialization complete");
  
  // Flash LED to indicate successful startup
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void loop() {
  // Handle any serial commands
  handleSerialCommands();
  
  // Process GPS data
  while (GPSSerial.available() > 0) {
    gps.encode(GPSSerial.read());
  }
  
  // Update RTC if we have a valid GPS time and it's been more than an hour
  if (gps.time.isValid() && gps.date.isValid() && 
      (gpsUpdateTime == 0 || millis() - gpsUpdateTime > 3600000)) {
    rtc.setTime(gps.time.second(), gps.time.minute(), gps.time.hour(),
                gps.date.day(), gps.date.month(), gps.date.year());
    gpsUpdateTime = millis();
    Serial.println("RTC updated from GPS");
  }
  
  // Check if it's time to read sensors
  if (millis() - lastSampleTime >= config.sampleInterval * 1000) {
    readSensors();
    processData();
    lastSampleTime = millis();
    
    // Print status to serial
    printStatus();
  }
  
  // Check if it's time to transmit data
  if (millis() - lastTransmitTime >= config.transmitInterval * 1000) {
    transmitData();
    lastTransmitTime = millis();
  }
  
  // Enter low power mode if enabled and no alert is active
  if (config.lowPowerMode && calculateFireRisk() < 0.7) {
    enterLowPowerMode();
  }
  
  // Small delay to prevent CPU hogging
  delay(10);
}

void setupLoRa() {
  Serial.println("Initializing LoRa...");
  
  // Initialize LoRaWAN stack
  lora_hardware_init(WIFI_LoRa_32_V2);
  
  // Setup LoRaWAN parameters
  lora_param_init();
  
  // Set device EUI, application EUI, and application key
  lora_dev_eui_set(devEui);
  lora_app_eui_set(appEui);
  lora_app_key_set(appKey);
  
  // Set LoRaWAN Class
  lora_class_set(CLASS_A);
  
  // Set data rate
  lora_dr_set(DR_3);
  
  // Set LoRaWAN region (depends on your location)
  lora_region_set(LORAMAC_REGION_EU868);
  
  // Register callback for LoRa events
  lora_event_callback_register(handleLoRaEvent);
  
  // Start join procedure
  lora_join();
  
  Serial.println("LoRa initialized, joining network...");
}

void loadDefaultConfig() {
  config.sampleInterval = 300;     // 5 minutes
  config.transmitInterval = 900;   // 15 minutes
  config.tempThreshold = 50.0;     // 50°C
  config.humidityThreshold = 30.0; // 30%
  config.smokeThreshold = 100;     // 100 ppm
  config.coThreshold = 70;         // 70 ppm
  config.lowPowerMode = true;
  config.alertEnabled = true;
  config.checksum = calculateChecksum();
}

uint8_t calculateChecksum() {
  uint8_t* configBytes = (uint8_t*)&config;
  uint8_t checksum = 0;
  
  // Calculate checksum (XOR all bytes except the checksum itself)
  for (int i = 0; i < sizeof(config) - 1; i++) {
    checksum ^= configBytes[i];
  }
  
  return checksum;
}

void saveConfig() {
  config.checksum = calculateChecksum();
  EEPROM.put(configAddr, config);
  EEPROM.commit();
  Serial.println("Configuration saved to EEPROM");
}

void loadConfig() {
  EEPROM.get(configAddr, config);
  Serial.println("Configuration loaded from EEPROM");
}

bool validateConfig() {
  uint8_t calculatedChecksum = calculateChecksum();
  bool valid = (calculatedChecksum == config.checksum);
  
  // Additional validation
  valid = valid && (config.sampleInterval >= 10 && config.sampleInterval <= 3600);
  valid = valid && (config.transmitInterval >= 60 && config.transmitInterval <= 86400);
  
  return valid;
}

void readSensors() {
  Serial.println("Reading sensors...");
  
  // Read BME680 sensor
  if (bme.performReading()) {
    sensorData.temperature = bme.temperature;
    sensorData.humidity = bme.humidity;
    sensorData.pressure = bme.pressure / 100.0; // Convert to hPa
    sensorData.gasResistance = bme.gas_resistance / 1000.0; // Convert to kOhms
  } else {
    Serial.println("Failed to read BME680");
  }
  
  // Read flame sensor (digital)
  sensorData.flameDetected = !digitalRead(FLAME_SENSOR_PIN); // LOW means flame detected
  
  // Read smoke sensor (analog)
  int smokeRaw = analogRead(SMOKE_SENSOR_PIN);
  sensorData.smoke = map(smokeRaw, 0, 4095, 0, 1000); // Map to 0-1000 ppm range
  
  // Calculate CO level from gas resistance (simplified)
  // In a real implementation, this would use a proper calibration curve
  sensorData.co = 1000000.0 / sensorData.gasResistance;
  
  // Read GPS coordinates if available
  if (gps.location.isValid()) {
    sensorData.latitude = gps.location.lat();
    sensorData.longitude = gps.location.lng();
    sensorData.locationValid = true;
  } else {
    sensorData.locationValid = false;
  }
  
  // Read battery voltage
  int batteryRaw = analogRead(BATTERY_VOLTAGE_PIN);
  sensorData.batteryVoltage = batteryRaw * (3.3 / 4095.0) * 2; // Voltage divider (1:1)
  
  // Calculate battery percentage (approximate for Li-ion)
  // 3.0V = 0%, 4.2V = 100%
  sensorData.battery = constrain(map(sensorData.batteryVoltage * 100, 300, 420, 0, 100), 0, 100);
  
  // Read solar panel voltage
  int solarRaw = analogRead(SOLAR_VOLTAGE_PIN);
  sensorData.solarVoltage = solarRaw * (3.3 / 4095.0) * 3; // Voltage divider (2:1)
  
  // Get current timestamp
  sensorData.timestamp = rtc.getEpoch();
  
  // Get RSSI from last LoRa transmission
  sensorData.rssi = lora_rssi_get();
}

void processData() {
  // Calculate fire risk
  float fireRisk = calculateFireRisk();
  
  // Check if any threshold is exceeded
  bool tempAlert = sensorData.temperature > config.tempThreshold;
  bool humidityAlert = sensorData.humidity < config.humidityThreshold;
  bool smokeAlert = sensorData.smoke > config.smokeThreshold;
  bool coAlert = sensorData.co > config.coThreshold;
  bool flameAlert = sensorData.flameDetected;
  
  // Log alerts to serial
  if (tempAlert) Serial.println("ALERT: High temperature detected!");
  if (humidityAlert) Serial.println("ALERT: Low humidity detected!");
  if (smokeAlert) Serial.println("ALERT: Smoke detected!");
  if (coAlert) Serial.println("ALERT: High CO level detected!");
  if (flameAlert) Serial.println("ALERT: Flame detected!");
  
  // Activate local alert if any threshold is exceeded and alerts are enabled
  bool alertCondition = (tempAlert || humidityAlert || smokeAlert || coAlert || flameAlert);
  activateAlert(alertCondition && config.alertEnabled);
  
  // Force immediate transmission if fire risk is high
  if (fireRisk > 0.7 && millis() - lastTransmitTime > 60000) { // At least 1 minute since last transmission
    Serial.println("HIGH FIRE RISK! Forcing immediate transmission.");
    transmitData();
    lastTransmitTime = millis();
  }
}

float calculateFireRisk() {
  // Simple weighted algorithm for fire risk calculation
  // Returns value from 0.0 (no risk) to 1.0 (maximum risk)
  
  float tempRisk = constrain(map(sensorData.temperature * 10, config.tempThreshold * 10 * 0.8, config.tempThreshold * 10 * 1.2, 0, 100), 0, 100) / 100.0;
  
  float humidityRisk = constrain(map(sensorData.humidity * 10, config.humidityThreshold * 10 * 1.2, config.humidityThreshold * 10 * 0.8, 0, 100), 0, 100) / 100.0;
  
  float smokeRisk = constrain(map(sensorData.smoke, config.smokeThreshold * 0.5, config.smokeThreshold * 1.5, 0, 100), 0, 100) / 100.0;
  
  float coRisk = constrain(map(sensorData.co, config.coThreshold * 0.5, config.coThreshold * 1.5, 0, 100), 0, 100) / 100.0;
  
  float flameRisk = sensorData.flameDetected ? 1.0 : 0.0;
  
  // Weighted average (adjust weights based on sensor reliability)
  float weightedRisk = (tempRisk * 0.2) + 
                       (humidityRisk * 0.1) + 
                       (smokeRisk * 0.3) + 
                       (coRisk * 0.2) + 
                       (flameRisk * 0.2);
  
  return weightedRisk;
}

void activateAlert(bool isActive) {
  if (isActive) {
    digitalWrite(LED_PIN, HIGH);
    // Intermittent buzzer for alarm
    digitalWrite(BUZZER_PIN, (millis() / 500) % 2 == 0 ? HIGH : LOW);
  } else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }
}

void transmitData() {
  Serial.println("Preparing LoRa transmission...");
  
  // Check if we're connected to the LoRaWAN network
  if (!lora_joined()) {
    Serial.println("Not connected to LoRaWAN network, attempting to join...");
    lora_join();
    return;
  }
  
  // Create JSON document
  StaticJsonDocument<256> jsonDoc;
  
  // Add node identification
  jsonDoc["id"] = NODE_ID;
  jsonDoc["fw"] = FIRMWARE_VERSION;
  
  // Add sensor readings
  jsonDoc["temp"] = round(sensorData.temperature * 10) / 10.0;
  jsonDoc["hum"] = round(sensorData.humidity);
  jsonDoc["smoke"] = sensorData.smoke;
  jsonDoc["co"] = sensorData.co;
  jsonDoc["flame"] = sensorData.flameDetected ? 1 : 0;
  
  // Add battery and solar info
  jsonDoc["bat"] = sensorData.battery;
  jsonDoc["sol"] = round(sensorData.solarVoltage * 10) / 10.0;
  
  // Add location if valid
  if (sensorData.locationValid) {
    jsonDoc["lat"] = sensorData.latitude;
    jsonDoc["lon"] = sensorData.longitude;
  }
  
  // Add timestamp
  jsonDoc["ts"] = sensorData.timestamp;
  
  // Add fire risk score
  jsonDoc["risk"] = round(calculateFireRisk() * 100) / 100.0;
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  Serial.print("Sending: ");
  Serial.println(jsonString);
  
  // Convert string to byte array
  uint8_t buffer[256];
  size_t length = jsonString.length();
  memcpy(buffer, jsonString.c_str(), length);
  
  // Send data
  lora_data_send(LORAWAN_APP_PORT, buffer, length, APP_UNCONFIRMED);
  
  Serial.println("LoRa transmission initiated");
}

void handleLoRaEvent(EVENT_MSG *msg) {
  switch (msg->event) {
    case LORA_EVENT_JOIN_SUCCESSED:
      Serial.println("LoRaWAN network joined successfully!");
      loraJoinAttempts = 0;
      break;
      
    case LORA_EVENT_JOIN_FAILED:
      Serial.println("LoRaWAN join failed, retrying...");
      loraJoinAttempts++;
      if (loraJoinAttempts < 5) {
        delay(5000 * loraJoinAttempts);  // Increasing backoff
        lora_join();
      } else {
        Serial.println("Multiple join attempts failed. Will retry in 30 minutes.");
        loraJoinAttempts = 0;
      }
      break;
      
    case LORA_EVENT_SEND_DONE:
      Serial.println("LoRa transmission completed");
      break;
      
    case LORA_EVENT_SEND_CONFIRMED:
      Serial.println("LoRa transmission confirmed by gateway");
      break;
      
    case LORA_EVENT_RECV_DATA:
      Serial.println("Received downlink from gateway");
      // Process downlink data (e.g., configuration updates)
      processDownlink(msg->buf, msg->size);
      break;
      
    default:
      Serial.print("LoRa event: ");
      Serial.println(msg->event);
      break;
  }
}

void processDownlink(uint8_t* data, uint8_t size) {
  // Check if we have enough data for a valid message
  if (size < 2) return;
  
  // Command format: [COMMAND_ID][PAYLOAD...]
  uint8_t command = data[0];
  
  switch (command) {
    case 0x01:  // Update configuration
      if (size >= sizeof(NodeConfig)) {
        memcpy(&config, data + 1, sizeof(NodeConfig));
        if (validateConfig()) {
          saveConfig();
          Serial.println("Configuration updated via downlink");
        } else {
          Serial.println("Invalid configuration received, ignoring");
        }
      }
      break;
      
    case 0x02:  // Request immediate sensor reading
      readSensors();
      processData();
      transmitData();
      break;
      
    case 0x03:  // Restart device
      Serial.println("Restart command received");
      delay(1000);
      ESP.restart();
      break;
      
    default:
      Serial.print("Unknown command: 0x");
      Serial.println(command, HEX);
      break;
  }
}

void enterLowPowerMode() {
  // Only enter sleep if no alert is active
  if (calculateFireRisk() < 0.7) {
    Serial.println("Entering low power mode...");
    
    // Turn off LED and buzzer
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    
    // Calculate sleep duration (half of sample interval)
    uint64_t sleepDuration = config.sampleInterval * 500000; // microseconds
    
    // Allow wake up on flame sensor (external wake)
    esp_sleep_enable_ext0_wakeup((gpio_num_t)FLAME_SENSOR_PIN, 0); // Wake on LOW level
    
    // Set timer wakeup
    esp_sleep_enable_timer_wakeup(sleepDuration);
    
    Serial.print("Sleeping for ");
    Serial.print(sleepDuration / 1000000.0);
    Serial.println(" seconds...");
    Serial.flush();
    
    // Enter light sleep (maintains RTC and RAM)
    esp_light_sleep_start();
    
    Serial.println("Woke up from sleep");
  }
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "status") {
      printStatus();
    } 
    else if (command == "config") {
      Serial.println("Current Configuration:");
      Serial.print("Sample Interval: ");
      Serial.print(config.sampleInterval);
      Serial.println(" seconds");
      Serial.print("Transmit Interval: ");
      Serial.print(config.transmitInterval);
      Serial.println(" seconds");
      Serial.print("Temperature Threshold: ");
      Serial.print(config.tempThreshold);
      Serial.println(" °C");
      Serial.print("Humidity Threshold: ");
      Serial.print(config.humidityThreshold);
      Serial.println(" %");
      Serial.print("Smoke Threshold: ");
      Serial.print(config.smokeThreshold);
      Serial.println(" ppm");
      Serial.print("CO Threshold: ");
      Serial.print(config.coThreshold);
      Serial.println(" ppm");
      Serial.print("Low Power Mode: ");
      Serial.println(config.lowPowerMode ? "Enabled" : "Disabled");
      Serial.print("Alerts: ");
      Serial.println(config.alertEnabled ? "Enabled" : "Disabled");
    }
    else if (command == "send") {
      transmitData();
    }
    else if (command == "read") {
      readSensors();
      processData();
      printStatus();
    }
    else if (command == "reset") {
      loadDefaultConfig();
      saveConfig();
      Serial.println("Configuration reset to defaults");
    }
    else if (command == "restart") {
      Serial.println("Restarting device...");
      delay(1000);
      ESP.restart();
    }
    else if (command.startsWith("set ")) {
      // Set configuration parameter
      // Format: set parameter value
      int firstSpace = command.indexOf(' ');
      int secondSpace = command.indexOf(' ', firstSpace + 1);
      
      if (secondSpace > 0) {
        String param = command.substring(firstSpace + 1, secondSpace);
        String valueStr = command.substring(secondSpace + 1);
        int value = valueStr.toInt();
        float valueFloat = valueStr.toFloat();
        
        if (param == "sampleInterval" && value >= 10 && value <= 3600) {
          config.sampleInterval = value;
          saveConfig();
          Serial.println("Sample interval updated");
        }
        else if (param == "transmitInterval" && value >= 60 && value <= 86400) {
          config.transmitInterval = value;
          saveConfig();
          Serial.println("Transmit interval updated");
        }
        else if (param == "tempThreshold") {
          config.tempThreshold = valueFloat;
          saveConfig();
          Serial.println("Temperature threshold updated");
        }
        else if (param == "humidityThreshold") {
          config.humidityThreshold = valueFloat;
          saveConfig();
          Serial.println("Humidity threshold updated");
        }
        else if (param == "smokeThreshold") {
          config.smokeThreshold = value;
          saveConfig();
          Serial.println("Smoke threshold updated");
        }
        else if (param == "coThreshold") {
          config.coThreshold = value;
          saveConfig();
          Serial.println("CO threshold updated");
        }
        else if (param == "lowPowerMode" && (value == 0 || value == 1)) {
          config.lowPowerMode = (value == 1);
          saveConfig();
          Serial.println("Low power mode updated");
        }
        else if (param == "alertEnabled" && (value == 0 || value == 1)) {
          config.alertEnabled = (value == 1);
          saveConfig();
          Serial.println("Alert setting updated");
        }
        else {
          Serial.println("Invalid parameter or value");
        }
      }
    }
    else {
      Serial.println("Unknown command. Available commands:");
      Serial.println("  status - Show current sensor readings");
      Serial.println("  config - Show current configuration");
      Serial.println("  send - Send data immediately");
      Serial.println("  read - Read sensors immediately");
      Serial.println("  reset - Reset configuration to defaults");
      Serial.println("  restart - Restart the device");
      Serial.println("  set [parameter] [value] - Update configuration");
    }
  }
}

void printStatus() {
  Serial.println("--- Current Status ---");
  Serial.print("Node ID: ");
  Serial.println(NODE_ID);
  
  Serial.print("Temperature: ");
  Serial.print(sensorData.temperature);
  Serial.println(" °C");
  
  Serial.print("Humidity: ");
  Serial.print(sensorData.humidity);
  Serial.println(" %");
  
  Serial.print("Pressure: ");
  Serial.print(sensorData.pressure);
  Serial.println(" hPa");
  
  Serial.print("Gas Resistance: ");
  Serial.print(sensorData.gasResistance);
  Serial.println(" kOhms");
  
  Serial.print("Smoke: ");
  Serial.print(sensorData.smoke);
  Serial.println(" ppm");
  
  Serial.print("CO: ");
  Serial.print(sensorData.co);
  Serial.println(" ppm");
  
  Serial.print("Flame Detected: ");
  Serial.println(sensorData.flameDetected ? "YES" : "No");
  
  if (sensorData.locationValid) {
    Serial.print("Location: ");
    Serial.print(sensorData.latitude, 6);
    Serial.print(", ");
    Serial.println(sensorData.longitude, 6);
  } else {
    Serial.println("Location: Invalid");
  }
  
  Serial.print("Battery: ");
  Serial.print(sensorData.battery);
  Serial.print("% (");
  Serial.print(sensorData.batteryVoltage);
  Serial.println("V)");
  
  Serial.print("Solar: ");
  Serial.print(sensorData.solarVoltage);
  Serial.println("V");
  
  Serial.print("RSSI: ");
  Serial.print(sensorData.rssi);
  Serial.println(" dBm");
  
  Serial.print("Time: ");
  Serial.println(rtc.getDateTime());
  
  Serial.print("Fire Risk: ");
  Serial.print(calculateFireRisk() * 100);
  Serial.println("%");
  
  Serial.print("LoRa Status: ");
  Serial.println(lora_joined() ? "Connected" : "Disconnected");
  
  Serial.println("---------------------");
}
