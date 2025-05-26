// Solar-Assisted WSN-LoRa IoT Framework for Forest Fire Detection
// Sensor Node Firmware for ESP32 with LoRa Module
// 
// MSc Thesis Implementation - July 2022
// Author: Frank Amoah

#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <LoRa.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Preferences.h>
#include <esp_sleep.h>
#include <esp_wifi.h>
#include <esp_bt.h>

// Hardware Configuration
#define NODE_ID_LENGTH 8
#define FIRMWARE_VERSION "2.1.3"
#define BUILD_DATE __DATE__ " " __TIME__

// Pin Definitions
#define DHT_PIN 4
#define LORA_CS_PIN 5
#define LORA_RESET_PIN 16
#define LORA_DIO0_PIN 12
#define LORA_DIO1_PIN 13
#define LORA_DIO2_PIN 14
#define LORA_SCK_PIN 18
#define LORA_MISO_PIN 19
#define LORA_MOSI_PIN 23
#define SMOKE_SENSOR_PIN 32
#define CO_SENSOR_PIN 33
#define FLAME_SENSOR_PIN 34
#define BATTERY_VOLTAGE_PIN 26
#define SOLAR_VOLTAGE_PIN 27
#define BUZZER_PIN 25
#define LED_SYSTEM_PIN 2
#define LED_COMM_PIN 0
#define LED_ALERT_PIN 4
#define SENSOR_POWER_PIN 15

// LoRa Configuration
#define LORA_FREQUENCY 868E6
#define LORA_BANDWIDTH 125E3
#define LORA_SPREADING_FACTOR 9
#define LORA_CODING_RATE 6
#define LORA_TX_POWER 17
#define LORA_PREAMBLE_LENGTH 8
#define LORA_SYNC_WORD 0x34

// System Configuration
#define SENSOR_READ_INTERVAL 30000    // 30 seconds
#define LORA_TX_INTERVAL 60000        // 1 minute
#define MAX_RETRY_ATTEMPTS 3
#define WATCHDOG_TIMEOUT 30000        // 30 seconds

// Sensor Objects
DHT dht(DHT_PIN, DHT22);
Preferences preferences;

// System State Structure
typedef struct {
    char nodeId[NODE_ID_LENGTH + 1];
    bool systemInitialized;
    bool alertActive;
    float batteryVoltage;
    float solarVoltage;
    uint32_t uptimeSeconds;
    uint32_t lastResetReason;
    uint8_t currentRiskLevel;
} SystemState_t;

SystemState_t systemState;

// Sensor Reading Structure
typedef struct {
    float temperature;
    float humidity;
    uint16_t smokePPM;
    uint16_t coPPM;
    bool flameDetected;
    float lightLevel;
    uint32_t timestamp;
    bool validReading;
} SensorReading_t;

SensorReading_t currentReading;

// Fire Detection Configuration
typedef struct {
    float temperatureWeight;
    float humidityWeight;
    float smokeWeight;
    float coWeight;
    float flameWeight;
    float threshold[5];
} FireDetectionConfig_t;

FireDetectionConfig_t fireConfig = {
    .temperatureWeight = 0.25,
    .humidityWeight = 0.15,
    .smokeWeight = 0.35,
    .coWeight = 0.15,
    .flameWeight = 0.10,
    .threshold = {0.1, 0.3, 0.5, 0.7, 0.9}
};

// Function Prototypes
void setup();
void loop();
bool initializeSystem();
void generateNodeId(char* nodeId);
void initializeGPIO();
bool initializeSensors();
bool initializeLoRa();
bool initializePowerManagement();
void loadConfiguration();
void saveConfiguration();
bool readAllSensors(SensorReading_t* reading);
uint16_t convertSmokeToPPM(uint16_t rawValue);
uint16_t convertCOToPPM(uint16_t rawValue);
bool validateSensorData(SensorReading_t* reading);
void applySensorCalibration(SensorReading_t* reading);
void storeSensorReading(SensorReading_t* reading);
void updateSystemState(SensorReading_t* reading);
float calculateFireRisk(SensorReading_t* reading);
uint8_t determineRiskLevel(float riskScore);
void handleRiskLevelChange(uint8_t newLevel, float riskScore);
void updateStatusLEDs(uint8_t riskLevel);
void updateBuzzer(uint8_t riskLevel);
bool sendLoRaMessage(String message);
void queueLoRaMessage(String message, bool highPriority);
void updatePowerStatus();
uint8_t determinePowerMode();
void transitionPowerMode(uint8_t newMode);
void handleSystemError(const char* errorMsg, bool restart);
uint32_t getUnixTimestamp();

void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.printf("Forest Fire Detection Node v%s\n", FIRMWARE_VERSION);
    Serial.printf("Build Date: %s\n", BUILD_DATE);
    Serial.println("========================================");
    
    // Initialize hardware subsystems
    if (!initializeSystem()) {
        Serial.println("CRITICAL: System initialization failed!");
        ESP.restart();
    }
    
    Serial.println("System initialization complete");
    Serial.printf("Node ID: %s\n", systemState.nodeId);
    Serial.println("System ready for operation");
}

void loop() {
    static uint32_t lastSensorRead = 0;
    static uint32_t lastLoRaTransmit = 0;
    
    uint32_t currentTime = millis();
    
    // Read sensors at configured interval
    if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
        if (readAllSensors(&currentReading)) {
            applySensorCalibration(&currentReading);
            
            if (validateSensorData(&currentReading)) {
                storeSensorReading(&currentReading);
                updateSystemState(&currentReading);
                
                // Calculate fire risk and handle alerts
                float riskScore = calculateFireRisk(&currentReading);
                uint8_t newRiskLevel = determineRiskLevel(riskScore);
                
                if (newRiskLevel != systemState.currentRiskLevel) {
                    handleRiskLevelChange(newRiskLevel, riskScore);
                    systemState.currentRiskLevel = newRiskLevel;
                }
                
                Serial.printf("Sensor Reading - T:%.1f°C H:%.1f%% S:%d CO:%d F:%d Risk:%.3f\n",
                    currentReading.temperature,
                    currentReading.humidity,
                    currentReading.smokePPM,
                    currentReading.coPPM,
                    currentReading.flameDetected,
                    riskScore);
            } else {
                Serial.println("WARNING: Invalid sensor data detected");
            }
        } else {
            Serial.println("ERROR: Failed to read sensors");
        }
        
        lastSensorRead = currentTime;
    }
    
    // Transmit data at configured interval
    if (currentTime - lastLoRaTransmit >= LORA_TX_INTERVAL) {
        // Prepare sensor data message
        StaticJsonDocument<512> jsonDoc;
        jsonDoc["nodeId"] = systemState.nodeId;
        jsonDoc["timestamp"] = getUnixTimestamp();
        jsonDoc["temperature"] = currentReading.temperature;
        jsonDoc["humidity"] = currentReading.humidity;
        jsonDoc["smoke"] = currentReading.smokePPM;
        jsonDoc["co"] = currentReading.coPPM;
        jsonDoc["flame"] = currentReading.flameDetected;
        jsonDoc["battery"] = systemState.batteryVoltage;
        jsonDoc["solar"] = systemState.solarVoltage;
        jsonDoc["riskLevel"] = systemState.currentRiskLevel;
        
        String message;
        serializeJson(jsonDoc, message);
        
        if (sendLoRaMessage(message)) {
            Serial.println("LoRa transmission successful");
        } else {
            Serial.println("LoRa transmission failed");
        }
        
        lastLoRaTransmit = currentTime;
    }
    
    // Update system uptime
    systemState.uptimeSeconds = millis() / 1000;
    
    // Small delay to prevent CPU hogging
    delay(100);
}

bool initializeSystem() {
    bool initSuccess = true;
    
    // Generate unique node ID from MAC address
    generateNodeId(systemState.nodeId);
    
    // Initialize preferences (non-volatile storage)
    preferences.begin("fire-node", false);
    
    // Disable WiFi and Bluetooth to save power
    WiFi.mode(WIFI_OFF);
    esp_wifi_deinit();
    esp_bt_controller_disable();
    
    // Initialize GPIO pins
    initializeGPIO();
    
    // Initialize sensors
    initSuccess &= initializeSensors();
    
    // Initialize LoRa communication
    initSuccess &= initializeLoRa();
    
    // Initialize power management
    initSuccess &= initializePowerManagement();
    
    // Load configuration from NVS
    loadConfiguration();
    
    systemState.systemInitialized = initSuccess;
    systemState.lastResetReason = esp_reset_reason();
    
    return initSuccess;
}

void generateNodeId(char* nodeId) {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    snprintf(nodeId, NODE_ID_LENGTH + 1, "%02X%02X%02X%02X", 
             mac[2], mac[3], mac[4], mac[5]);
}

void initializeGPIO() {
    // Status LEDs
    pinMode(LED_SYSTEM_PIN, OUTPUT);
    pinMode(LED_COMM_PIN, OUTPUT);
    pinMode(LED_ALERT_PIN, OUTPUT);
    
    // Buzzer
    pinMode(BUZZER_PIN, OUTPUT);
    
    // Sensor power control
    pinMode(SENSOR_POWER_PIN, OUTPUT);
    digitalWrite(SENSOR_POWER_PIN, HIGH);
    
    // Analog inputs
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
}

bool initializeSensors() {
    // Initialize DHT22 sensor
    dht.begin();
    
    // Test DHT22 sensor
    float testTemp = dht.readTemperature();
    float testHum = dht.readHumidity();
    
    if (isnan(testTemp) || isnan(testHum)) {
        Serial.println("ERROR: DHT22 sensor initialization failed");
        return false;
    }
    
    Serial.println("DHT22 sensor initialized successfully");
    return true;
}

bool initializeLoRa() {
    LoRa.setPins(LORA_CS_PIN, LORA_RESET_PIN, LORA_DIO0_PIN);
    
    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("ERROR: LoRa initialization failed");
        return false;
    }
    
    // Configure LoRa parameters
    LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setCodingRate4(LORA_CODING_RATE);
    LoRa.setTxPower(LORA_TX_POWER);
    LoRa.setPreambleLength(LORA_PREAMBLE_LENGTH);
    LoRa.setSyncWord(LORA_SYNC_WORD);
    LoRa.enableCrc();
    
    Serial.println("LoRa initialized successfully");
    Serial.printf("Frequency: %.1f MHz\n", LORA_FREQUENCY / 1E6);
    Serial.printf("Spreading Factor: %d\n", LORA_SPREADING_FACTOR);
    Serial.printf("Bandwidth: %.1f kHz\n", LORA_BANDWIDTH / 1E3);
    
    return true;
}

bool initializePowerManagement() {
    // Read initial power status
    updatePowerStatus();
    
    Serial.printf("Battery Voltage: %.2fV\n", systemState.batteryVoltage);
    Serial.printf("Solar Voltage: %.2fV\n", systemState.solarVoltage);
    
    return true;
}

void loadConfiguration() {
    // Load fire detection thresholds
    fireConfig.temperatureWeight = preferences.getFloat("tempWeight", 0.25);
    fireConfig.humidityWeight = preferences.getFloat("humWeight", 0.15);
    fireConfig.smokeWeight = preferences.getFloat("smokeWeight", 0.35);
    fireConfig.coWeight = preferences.getFloat("coWeight", 0.15);
    fireConfig.flameWeight = preferences.getFloat("flameWeight", 0.10);
    
    // Load thresholds
    for (int i = 0; i < 5; i++) {
        char key[16];
        snprintf(key, sizeof(key), "threshold%d", i);
        fireConfig.threshold[i] = preferences.getFloat(key, fireConfig.threshold[i]);
    }
    
    Serial.println("Configuration loaded from NVS");
}

bool readAllSensors(SensorReading_t* reading) {
    bool success = true;
    
    // Read DHT22 temperature and humidity
    reading->temperature = dht.readTemperature();
    reading->humidity = dht.readHumidity();
    
    if (isnan(reading->temperature) || isnan(reading->humidity)) {
        Serial.println("DHT22 read failed");
        success = false;
    }
    
    // Read MQ-2 smoke sensor
    uint16_t smokeRaw = analogRead(SMOKE_SENSOR_PIN);
    reading->smokePPM = convertSmokeToPPM(smokeRaw);
    
    // Read MQ-7 CO sensor
    uint16_t coRaw = analogRead(CO_SENSOR_PIN);
    reading->coPPM = convertCOToPPM(coRaw);
    
    // Read IR flame sensor
    reading->flameDetected = !digitalRead(FLAME_SENSOR_PIN);
    
    // Read light sensor
    uint16_t lightRaw = analogRead(35);
    reading->lightLevel = (lightRaw / 4095.0) * 100.0;
    
    // Set timestamp
    reading->timestamp = getUnixTimestamp();
    reading->validReading = success;
    
    return success;
}

uint16_t convertSmokeToPPM(uint16_t rawValue) {
    float voltage = (rawValue / 4095.0) * 3.3;
    float resistance = ((3.3 - voltage) / voltage) * 10000;
    float ppm = pow(10, ((log10(resistance) - 4.0) / -0.6));
    
    return (uint16_t)constrain(ppm, 0, 10000);
}

uint16_t convertCOToPPM(uint16_t rawValue) {
    float voltage = (rawValue / 4095.0) * 3.3;
    float resistance = ((3.3 - voltage) / voltage) * 10000;
    float ppm = pow(10, ((log10(resistance) - 3.7) / -0.5));
    
    return (uint16_t)constrain(ppm, 0, 1000);
}

bool validateSensorData(SensorReading_t* reading) {
    return (reading->temperature >= -40 && reading->temperature <= 125) &&
           (reading->humidity >= 0 && reading->humidity <= 100) &&
           (reading->smokePPM < 10000) &&
           (reading->coPPM < 1000);
}

void applySensorCalibration(SensorReading_t* reading) {
    // Apply calibration corrections
    // These would be loaded from NVS in a real implementation
    reading->temperature = reading->temperature - 0.35; // Offset correction
    reading->humidity = reading->humidity * 0.9891 + 0.42; // Scale and offset
}

void storeSensorReading(SensorReading_t* reading) {
    // Store reading in circular buffer or send to processing
    // Implementation depends on system requirements
}

void updateSystemState(SensorReading_t* reading) {
    // Update power status
    updatePowerStatus();
}

float calculateFireRisk(SensorReading_t* reading) {
    float tempScore = 0.0;
    float humidityScore = 0.0;
    float smokeScore = 0.0;
    float coScore = 0.0;
    float flameScore = 0.0;
    
    // Temperature scoring (normalized to 0-1)
    if (reading->temperature > 30.0) {
        tempScore = min((reading->temperature - 30.0) / 50.0, 1.0);
    }
    
    // Humidity scoring (inverse relationship)
    if (reading->humidity < 60.0) {
        humidityScore = (60.0 - reading->humidity) / 60.0;
    }
    
    // Smoke scoring (logarithmic scale)
    if (reading->smokePPM > 100) {
        smokeScore = min(log10(reading->smokePPM / 100.0) / 2.0, 1.0);
    }
    
    // CO scoring
    if (reading->coPPM > 10) {
        coScore = min((reading->coPPM - 10.0) / 200.0, 1.0);
    }
    
    // Flame detection (binary)
    flameScore = reading->flameDetected ? 1.0 : 0.0;
    
    // Weighted combination
    float totalScore = (tempScore * fireConfig.temperatureWeight) +
                      (humidityScore * fireConfig.humidityWeight) +
                      (smokeScore * fireConfig.smokeWeight) +
                      (coScore * fireConfig.coWeight) +
                      (flameScore * fireConfig.flameWeight);
    
    return constrain(totalScore, 0.0, 1.0);
}

uint8_t determineRiskLevel(float riskScore) {
    for (int i = 4; i >= 0; i--) {
        if (riskScore >= fireConfig.threshold[i]) {
            return i + 1;
        }
    }
    return 0;
}

void handleRiskLevelChange(uint8_t newLevel, float riskScore) {
    updateStatusLEDs(newLevel);
    updateBuzzer(newLevel);
    
    // Prepare alert message if risk level is elevated
    if (newLevel >= 2) {
        StaticJsonDocument<512> alertDoc;
        alertDoc["nodeId"] = systemState.nodeId;
        alertDoc["timestamp"] = getUnixTimestamp();
        alertDoc["riskLevel"] = newLevel;
        alertDoc["riskScore"] = riskScore;
        alertDoc["temperature"] = currentReading.temperature;
        alertDoc["humidity"] = currentReading.humidity;
        alertDoc["smoke"] = currentReading.smokePPM;
        alertDoc["co"] = currentReading.coPPM;
        alertDoc["flame"] = currentReading.flameDetected;
        alertDoc["battery"] = systemState.batteryVoltage;
        
        String alertMessage;
        serializeJson(alertDoc, alertMessage);
        
        // Send high priority message
        queueLoRaMessage(alertMessage, true);
        Serial.printf("ALERT: Risk level changed to %d\n", newLevel);
    }
}

void updateStatusLEDs(uint8_t riskLevel) {
    // Turn off all LEDs first
    digitalWrite(LED_SYSTEM_PIN, LOW);
    digitalWrite(LED_COMM_PIN, LOW);
    digitalWrite(LED_ALERT_PIN, LOW);
    
    switch (riskLevel) {
        case 0:
        case 1:
            digitalWrite(LED_SYSTEM_PIN, HIGH);
            break;
        case 2:
        case 3:
            digitalWrite(LED_COMM_PIN, HIGH);
            break;
        case 4:
        case 5:
            digitalWrite(LED_ALERT_PIN, HIGH);
            break;
    }
}

void updateBuzzer(uint8_t riskLevel) {
    if (riskLevel >= 4) {
        // Activate buzzer with pattern based on risk level
        int beepCount = (riskLevel == 5) ? 5 : 3;
        for (int i = 0; i < beepCount; i++) {
            digitalWrite(BUZZER_PIN, HIGH);
            delay(200);
            digitalWrite(BUZZER_PIN, LOW);
            delay(200);
        }
    }
}

bool sendLoRaMessage(String message) {
    LoRa.beginPacket();
    LoRa.write(0xFF); // Broadcast address
    LoRa.write(strlen(systemState.nodeId));
    LoRa.print(systemState.nodeId);
    LoRa.print(message);
    
    return LoRa.endPacket();
}

void queueLoRaMessage(String message, bool highPriority) {
    // In a full implementation, this would queue messages
    // For now, send immediately
    sendLoRaMessage(message);
}

void updatePowerStatus() {
    // Read battery voltage (voltage divider: 2:1 ratio)
    uint16_t batteryRaw = analogRead(BATTERY_VOLTAGE_PIN);
    systemState.batteryVoltage = (batteryRaw / 4095.0) * 3.3 * 2.0;
    
    // Read solar voltage (voltage divider: 4:1 ratio)
    uint16_t solarRaw = analogRead(SOLAR_VOLTAGE_PIN);
    systemState.solarVoltage = (solarRaw / 4095.0) * 3.3 * 4.0;
}

uint32_t getUnixTimestamp() {
    // Return milliseconds since boot as timestamp
    // In a full implementation, this would be proper UTC time
    return millis() / 1000;
}
