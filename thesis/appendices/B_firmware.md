# Appendix B: Firmware Architecture and Implementation

## B.1 Introduction

This appendix provides comprehensive documentation of the ESP32 firmware implementation for the forest fire detection sensor nodes. The firmware is designed using a modular, event-driven architecture that optimizes power consumption while maintaining real-time responsiveness and system reliability.

## B.2 Firmware Architecture Overview

### B.2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP32 Firmware Architecture              │
├─────────────────────────────────────────────────────────────┤
│  Application Layer                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │  Fire Detection │ │ Alert Manager   │ │ System Status │ │
│  │     Engine      │ │                 │ │   Monitor     │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ Sensor Manager  │ │ Communication   │ │ Power Manager │ │
│  │                 │ │    Service      │ │               │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Hardware Abstraction Layer                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │   Sensor HAL    │ │   LoRa HAL      │ │  System HAL   │ │
│  │                 │ │                 │ │               │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Real-Time Operating System (FreeRTOS)                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ Task Scheduler  │ │ Event Manager   │ │ Memory Manager│ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### B.2.2 Task Structure and Priorities

```cpp
// Task Priority Definitions
#define PRIORITY_CRITICAL    (configMAX_PRIORITIES - 1)  // 24
#define PRIORITY_HIGH        (configMAX_PRIORITIES - 2)  // 23
#define PRIORITY_NORMAL      (configMAX_PRIORITIES - 3)  // 22
#define PRIORITY_LOW         (configMAX_PRIORITIES - 4)  // 21
#define PRIORITY_IDLE        (configMAX_PRIORITIES - 5)  // 20

// Task Handle Declarations
TaskHandle_t xSensorTask;
TaskHandle_t xLoRaTask;
TaskHandle_t xFireDetectionTask;
TaskHandle_t xPowerManagementTask;
TaskHandle_t xSystemMonitorTask;
TaskHandle_t xWatchdogTask;

// Task Configuration
typedef struct {
    const char* name;
    TaskFunction_t function;
    uint32_t stackSize;
    UBaseType_t priority;
    TaskHandle_t* handle;
    uint32_t interval;
} TaskConfig_t;

const TaskConfig_t taskConfigs[] = {
    {"WatchdogTask",      watchdogTask,      2048, PRIORITY_CRITICAL, &xWatchdogTask,      1000},
    {"FireDetection",     fireDetectionTask, 4096, PRIORITY_HIGH,     &xFireDetectionTask, 5000},
    {"SensorTask",        sensorTask,        3072, PRIORITY_NORMAL,   &xSensorTask,        30000},
    {"LoRaTask",          loraTask,          3072, PRIORITY_NORMAL,   &xLoRaTask,          60000},
    {"PowerManagement",   powerTask,         2048, PRIORITY_LOW,      &xPowerManagementTask, 120000},
    {"SystemMonitor",     systemMonitorTask, 2048, PRIORITY_LOW,      &xSystemMonitorTask,  300000}
};
```

## B.3 Core System Components

### B.3.1 Main Application Entry Point

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <SPI.h>
#include <LoRa.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_sleep.h>
#include <esp_wifi.h>
#include <esp_bt.h>

// System Configuration
#define FIRMWARE_VERSION    "2.1.3"
#define BUILD_DATE          __DATE__ " " __TIME__
#define NODE_ID_LENGTH      8
#define MAX_RETRY_ATTEMPTS  3
#define WATCHDOG_TIMEOUT    30000  // 30 seconds

// Global System State
typedef struct {
    char nodeId[NODE_ID_LENGTH + 1];
    bool systemInitialized;
    bool alertActive;
    float batteryVoltage;
    float solarVoltage;
    uint32_t uptimeSeconds;
    uint32_t lastResetReason;
    FireRiskLevel currentRiskLevel;
} SystemState_t;

SystemState_t systemState;

// Application Entry Point
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
    
    // Create FreeRTOS tasks
    createSystemTasks();
    
    // Start task scheduler (never returns)
    Serial.println("Starting task scheduler...");
    vTaskStartScheduler();
}

void loop() {
    // Empty - all processing handled by FreeRTOS tasks
    vTaskDelay(portMAX_DELAY);
}
```

### B.3.2 System Initialization

```cpp
bool initializeSystem() {
    bool initSuccess = true;
    
    // Generate unique node ID from MAC address
    generateNodeId(systemState.nodeId);
    Serial.printf("Node ID: %s\n", systemState.nodeId);
    
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
    
    // Initialize watchdog timer
    esp_task_wdt_init(WATCHDOG_TIMEOUT / 1000, true);
    
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
    analogReadResolution(12);  // 12-bit ADC resolution
    analogSetAttenuation(ADC_11db);  // 0-3.3V range
}
```

## B.4 Sensor Management System

### B.4.1 Sensor Data Structures

```cpp
// Sensor Reading Structure
typedef struct {
    float temperature;      // Celsius
    float humidity;         // % RH
    uint16_t smokePPM;      // Parts per million
    uint16_t coPPM;         // Carbon monoxide PPM
    bool flameDetected;     // IR flame sensor
    float lightLevel;       // Ambient light (0-100%)
    uint32_t timestamp;     // Unix timestamp
    bool validReading;      // Data validity flag
} SensorReading_t;

// Sensor Calibration Data
typedef struct {
    float tempOffset;       // Temperature calibration offset
    float tempScale;        // Temperature calibration scale
    float humOffset;        // Humidity calibration offset
    float humScale;         // Humidity calibration scale
    uint16_t smokeBaseline; // Smoke sensor baseline
    uint16_t coBaseline;    // CO sensor baseline
    bool calibrationValid;  // Calibration status
} SensorCalibration_t;

// Global sensor variables
SensorReading_t currentReading;
SensorCalibration_t sensorCalibration;
DHT dht(DHT_PIN, DHT22);
```

### B.4.2 Sensor Task Implementation

```cpp
void sensorTask(void* parameter) {
    const TickType_t xFrequency = pdMS_TO_TICKS(SENSOR_READ_INTERVAL);
    TickType_t xLastWakeTime = xTaskGetTickCount();
    
    // Add task to watchdog
    esp_task_wdt_add(NULL);
    
    while (1) {
        // Reset watchdog
        esp_task_wdt_reset();
        
        // Read all sensors
        if (readAllSensors(&currentReading)) {
            // Apply calibration
            applySensorCalibration(&currentReading);
            
            // Validate sensor data
            if (validateSensorData(&currentReading)) {
                // Store reading in circular buffer
                storeSensorReading(&currentReading);
                
                // Update system state
                updateSystemState(&currentReading);
                
                // Trigger fire detection analysis
                xTaskNotify(xFireDetectionTask, 0, eNoAction);
                
                Serial.printf("Sensor Reading - T:%.1f°C H:%.1f%% S:%d CO:%d F:%d\n",
                    currentReading.temperature,
                    currentReading.humidity,
                    currentReading.smokePPM,
                    currentReading.coPPM,
                    currentReading.flameDetected);
            } else {
                Serial.println("WARNING: Invalid sensor data detected");
            }
        } else {
            Serial.println("ERROR: Failed to read sensors");
        }
        
        // Wait for next reading interval
        vTaskDelayUntil(&xLastWakeTime, xFrequency);
    }
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
    reading->flameDetected = !digitalRead(FLAME_SENSOR_PIN);  // Active low
    
    // Read light sensor
    uint16_t lightRaw = analogRead(LIGHT_SENSOR_PIN);
    reading->lightLevel = (lightRaw / 4095.0) * 100.0;
    
    // Set timestamp
    reading->timestamp = getUnixTimestamp();
    reading->validReading = success;
    
    return success;
}

uint16_t convertSmokeToPPM(uint16_t rawValue) {
    // MQ-2 sensor conversion formula
    // Derived from sensor datasheet and calibration
    float voltage = (rawValue / 4095.0) * 3.3;
    float resistance = ((3.3 - voltage) / voltage) * 10000;  // 10k load resistor
    float ppm = pow(10, ((log10(resistance) - 4.0) / -0.6));
    
    return (uint16_t)constrain(ppm, 0, 10000);
}

uint16_t convertCOToPPM(uint16_t rawValue) {
    // MQ-7 sensor conversion formula
    float voltage = (rawValue / 4095.0) * 3.3;
    float resistance = ((3.3 - voltage) / voltage) * 10000;
    float ppm = pow(10, ((log10(resistance) - 3.7) / -0.5));
    
    return (uint16_t)constrain(ppm, 0, 1000);
}
```

## B.5 Fire Detection Algorithm

### B.5.1 Fire Risk Assessment Engine

```cpp
typedef enum {
    RISK_LEVEL_NORMAL = 0,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MODERATE,
    RISK_LEVEL_HIGH,
    RISK_LEVEL_CRITICAL
} FireRiskLevel;

typedef struct {
    float temperatureWeight;
    float humidityWeight;
    float smokeWeight;
    float coWeight;
    float flameWeight;
    float threshold[5];  // Thresholds for each risk level
} FireDetectionConfig_t;

FireDetectionConfig_t fireConfig = {
    .temperatureWeight = 0.25,
    .humidityWeight = 0.15,
    .smokeWeight = 0.35,
    .coWeight = 0.15,
    .flameWeight = 0.10,
    .threshold = {0.1, 0.3, 0.5, 0.7, 0.9}
};

void fireDetectionTask(void* parameter) {
    const TickType_t xMaxBlockTime = pdMS_TO_TICKS(1000);
    uint32_t ulNotificationValue;
    
    while (1) {
        // Wait for notification from sensor task
        if (xTaskNotifyWait(0, 0, &ulNotificationValue, xMaxBlockTime) == pdTRUE) {
            // Calculate fire risk score
            float riskScore = calculateFireRisk(&currentReading);
            
            // Determine risk level
            FireRiskLevel newRiskLevel = determineRiskLevel(riskScore);
            
            // Check if risk level changed
            if (newRiskLevel != systemState.currentRiskLevel) {
                handleRiskLevelChange(newRiskLevel, riskScore);
                systemState.currentRiskLevel = newRiskLevel;
            }
            
            // Log risk assessment
            Serial.printf("Fire Risk Assessment - Score: %.3f Level: %d\n", 
                         riskScore, newRiskLevel);
        }
    }
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

FireRiskLevel determineRiskLevel(float riskScore) {
    for (int i = 4; i >= 0; i--) {
        if (riskScore >= fireConfig.threshold[i]) {
            return (FireRiskLevel)i;
        }
    }
    return RISK_LEVEL_NORMAL;
}
```

### B.5.2 Alert Management System

```cpp
void handleRiskLevelChange(FireRiskLevel newLevel, float riskScore) {
    // Update local indicators
    updateStatusLEDs(newLevel);
    updateBuzzer(newLevel);
    
    // Prepare alert message
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
    
    // Add GPS coordinates if available
    if (gpsAvailable) {
        alertDoc["latitude"] = gpsLatitude;
        alertDoc["longitude"] = gpsLongitude;
    }
    
    String alertMessage;
    serializeJson(alertDoc, alertMessage);
    
    // Queue message for LoRa transmission
    if (newLevel >= RISK_LEVEL_MODERATE) {
        queueLoRaMessage(alertMessage, true);  // High priority
        Serial.printf("ALERT: Risk level changed to %d\n", newLevel);
    }
    
    // Store alert in local memory
    storeAlertRecord(newLevel, riskScore);
}

void updateStatusLEDs(FireRiskLevel riskLevel) {
    // Turn off all LEDs first
    digitalWrite(LED_SYSTEM_PIN, LOW);
    digitalWrite(LED_COMM_PIN, LOW);
    digitalWrite(LED_ALERT_PIN, LOW);
    
    switch (riskLevel) {
        case RISK_LEVEL_NORMAL:
            digitalWrite(LED_SYSTEM_PIN, HIGH);  // Green - normal operation
            break;
        case RISK_LEVEL_LOW:
        case RISK_LEVEL_MODERATE:
            digitalWrite(LED_COMM_PIN, HIGH);    // Yellow - elevated risk
            break;
        case RISK_LEVEL_HIGH:
        case RISK_LEVEL_CRITICAL:
            digitalWrite(LED_ALERT_PIN, HIGH);   // Red - high risk
            break;
    }
}

void updateBuzzer(FireRiskLevel riskLevel) {
    if (riskLevel >= RISK_LEVEL_HIGH) {
        // Activate buzzer with pattern based on risk level
        int beepCount = (riskLevel == RISK_LEVEL_CRITICAL) ? 5 : 3;
        for (int i = 0; i < beepCount; i++) {
            digitalWrite(BUZZER_PIN, HIGH);
            vTaskDelay(pdMS_TO_TICKS(200));
            digitalWrite(BUZZER_PIN, LOW);
            vTaskDelay(pdMS_TO_TICKS(200));
        }
    }
}
```

## B.6 LoRa Communication Implementation

### B.6.1 LoRa Configuration and Setup

```cpp
// LoRa Configuration Parameters
#define LORA_FREQUENCY      868E6  // 868 MHz (EU) / 915E6 for US
#define LORA_BANDWIDTH      125E3  // 125 kHz
#define LORA_SPREADING_FACTOR   9  // SF9 (optimal range/power balance)
#define LORA_CODING_RATE        6  // 4/6 coding rate
#define LORA_TX_POWER          17  // 17 dBm transmission power
#define LORA_PREAMBLE_LENGTH    8  // 8 symbol preamble
#define LORA_SYNC_WORD       0x34  // Private network sync word

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
    
    // Enable CRC
    LoRa.enableCrc();
    
    Serial.println("LoRa initialized successfully");
    Serial.printf("Frequency: %.1f MHz\n", LORA_FREQUENCY / 1E6);
    Serial.printf("Spreading Factor: %d\n", LORA_SPREADING_FACTOR);
    Serial.printf("Bandwidth: %.1f kHz\n", LORA_BANDWIDTH / 1E3);
    
    return true;
}
```

### B.6.2 Message Queue and Transmission

```cpp
#define MAX_QUEUE_SIZE      10
#define MAX_MESSAGE_LENGTH  255

typedef struct {
    char message[MAX_MESSAGE_LENGTH];
    bool highPriority;
    uint32_t timestamp;
    uint8_t retryCount;
} LoRaMessage_t;

QueueHandle_t xLoRaQueue;

void loraTask(void* parameter) {
    LoRaMessage_t message;
    const TickType_t xTicksToWait = pdMS_TO_TICKS(5000);
    
    // Create message queue
    xLoRaQueue = xQueueCreate(MAX_QUEUE_SIZE, sizeof(LoRaMessage_t));
    
    while (1) {
        // Wait for message in queue
        if (xQueueReceive(xLoRaQueue, &message, xTicksToWait) == pdTRUE) {
            // Attempt to send message
            if (sendLoRaMessage(&message)) {
                Serial.println("LoRa message sent successfully");
                digitalWrite(LED_COMM_PIN, HIGH);
                vTaskDelay(pdMS_TO_TICKS(100));
                digitalWrite(LED_COMM_PIN, LOW);
            } else {
                // Retry logic for failed transmissions
                handleTransmissionFailure(&message);
            }
        }
        
        // Send periodic status updates
        sendStatusUpdate();
        
        // Enter low-power mode between transmissions
        LoRa.sleep();
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

bool sendLoRaMessage(LoRaMessage_t* msg) {
    // Wake up LoRa module
    LoRa.idle();
    vTaskDelay(pdMS_TO_TICKS(10));
    
    // Begin packet transmission
    LoRa.beginPacket();
    
    // Add packet header
    LoRa.write(0xFF);  // Broadcast address
    LoRa.write(strlen(systemState.nodeId));
    LoRa.print(systemState.nodeId);
    
    // Add message payload
    LoRa.print(msg->message);
    
    // End packet and transmit
    bool success = LoRa.endPacket(false);  // Non-blocking
    
    if (success) {
        // Wait for transmission completion
        while (LoRa.transmitting()) {
            vTaskDelay(pdMS_TO_TICKS(10));
        }
    }
    
    return success;
}

void queueLoRaMessage(String message, bool highPriority) {
    LoRaMessage_t loraMsg;
    
    // Prepare message structure
    strncpy(loraMsg.message, message.c_str(), MAX_MESSAGE_LENGTH - 1);
    loraMsg.message[MAX_MESSAGE_LENGTH - 1] = '\0';
    loraMsg.highPriority = highPriority;
    loraMsg.timestamp = getUnixTimestamp();
    loraMsg.retryCount = 0;
    
    // Add to queue
    if (highPriority) {
        // High priority messages go to front of queue
        xQueueSendToFront(xLoRaQueue, &loraMsg, 0);
    } else {
        // Normal priority messages go to back
        xQueueSendToBack(xLoRaQueue, &loraMsg, 0);
    }
}
```

## B.7 Power Management System

### B.7.1 Power Monitoring and Control

```cpp
#define BATTERY_VOLTAGE_PIN     26
#define SOLAR_VOLTAGE_PIN       27
#define LOW_BATTERY_THRESHOLD   3.2   // Volts
#define CRITICAL_BATTERY_THRESHOLD  2.8   // Volts

typedef enum {
    POWER_MODE_NORMAL = 0,
    POWER_MODE_ECO,
    POWER_MODE_CRITICAL,
    POWER_MODE_EMERGENCY
} PowerMode_t;

PowerMode_t currentPowerMode = POWER_MODE_NORMAL;

void powerTask(void* parameter) {
    const TickType_t xFrequency = pdMS_TO_TICKS(60000);  // 1 minute
    TickType_t xLastWakeTime = xTaskGetTickCount();
    
    while (1) {
        // Read battery and solar voltages
        updatePowerStatus();
        
        // Determine appropriate power mode
        PowerMode_t newPowerMode = determinePowerMode();
        
        if (newPowerMode != currentPowerMode) {
            transitionPowerMode(newPowerMode);
            currentPowerMode = newPowerMode;
        }
        
        // Log power status
        Serial.printf("Power Status - Battery: %.2fV Solar: %.2fV Mode: %d\n",
                     systemState.batteryVoltage,
                     systemState.solarVoltage,
                     currentPowerMode);
        
        vTaskDelayUntil(&xLastWakeTime, xFrequency);
    }
}

void updatePowerStatus() {
    // Read battery voltage (voltage divider: 2:1 ratio)
    uint16_t batteryRaw = analogRead(BATTERY_VOLTAGE_PIN);
    systemState.batteryVoltage = (batteryRaw / 4095.0) * 3.3 * 2.0;
    
    // Read solar voltage (voltage divider: 4:1 ratio)
    uint16_t solarRaw = analogRead(SOLAR_VOLTAGE_PIN);
    systemState.solarVoltage = (solarRaw / 4095.0) * 3.3 * 4.0;
}

PowerMode_t determinePowerMode() {
    if (systemState.batteryVoltage < CRITICAL_BATTERY_THRESHOLD) {
        return POWER_MODE_EMERGENCY;
    } else if (systemState.batteryVoltage < LOW_BATTERY_THRESHOLD) {
        return POWER_MODE_CRITICAL;
    } else if (systemState.solarVoltage < 5.0 && systemState.batteryVoltage < 3.6) {
        return POWER_MODE_ECO;
    } else {
        return POWER_MODE_NORMAL;
    }
}

void transitionPowerMode(PowerMode_t newMode) {
    Serial.printf("Power mode transition: %d -> %d\n", currentPowerMode, newMode);
    
    switch (newMode) {
        case POWER_MODE_NORMAL:
            // Full functionality
            SENSOR_READ_INTERVAL = 30000;    // 30 seconds
            LORA_TX_INTERVAL = 60000;        // 1 minute
            setCpuFrequencyMhz(240);         // Full speed
            break;
            
        case POWER_MODE_ECO:
            // Reduced functionality
            SENSOR_READ_INTERVAL = 60000;    // 1 minute
            LORA_TX_INTERVAL = 300000;       // 5 minutes
            setCpuFrequencyMhz(160);         // Reduced speed
            break;
            
        case POWER_MODE_CRITICAL:
            // Minimal functionality
            SENSOR_READ_INTERVAL = 300000;   // 5 minutes
            LORA_TX_INTERVAL = 900000;       // 15 minutes
            setCpuFrequencyMhz(80);          // Low speed
            break;
            
        case POWER_MODE_EMERGENCY:
            // Emergency mode - alerts only
            SENSOR_READ_INTERVAL = 600000;   // 10 minutes
            LORA_TX_INTERVAL = 1800000;      // 30 minutes
            setCpuFrequencyMhz(80);          // Low speed
            // Disable non-essential peripherals
            disableNonEssentialPeripherals();
            break;
    }
}
```

## B.8 System Monitoring and Diagnostics

### B.8.1 Watchdog and System Health

```cpp
void watchdogTask(void* parameter) {
    const TickType_t xFrequency = pdMS_TO_TICKS(5000);  // 5 seconds
    TickType_t xLastWakeTime = xTaskGetTickCount();
    uint32_t taskStates = 0;
    
    while (1) {
        // Check if all critical tasks are running
        taskStates = 0;
        
        if (eTaskGetState(xSensorTask) == eRunning) taskStates |= (1 << 0);
        if (eTaskGetState(xLoRaTask) == eRunning) taskStates |= (1 << 1);
        if (eTaskGetState(xFireDetectionTask) == eRunning) taskStates |= (1 << 2);
        
        // Check for task failures
        if (taskStates != 0x07) {  // All 3 critical tasks should be running
            Serial.printf("WARNING: Task state error: 0x%02X\n", taskStates);
            // Attempt task recovery
            recoverFailedTasks(taskStates);
        }
        
        // Update system uptime
        systemState.uptimeSeconds = millis() / 1000;
        
        // Check memory usage
        checkMemoryUsage();
        
        vTaskDelayUntil(&xLastWakeTime, xFrequency);
    }
}

void checkMemoryUsage() {
    size_t freeHeap = esp_get_free_heap_size();
    size_t minFreeHeap = esp_get_minimum_free_heap_size();
    
    if (freeHeap < 10000) {  // Less than 10KB free
        Serial.printf("WARNING: Low memory - Free: %d bytes, Min: %d bytes\n", 
                     freeHeap, minFreeHeap);
        
        if (freeHeap < 5000) {  // Critical memory situation
            Serial.println("CRITICAL: Memory exhaustion - restarting system");
            ESP.restart();
        }
    }
}
```

### B.8.2 Error Handling and Recovery

```cpp
void handleSystemError(const char* errorMsg, bool restart) {
    Serial.printf("SYSTEM ERROR: %s\n", errorMsg);
    
    // Log error to NVS
    preferences.putString("lastError", errorMsg);
    preferences.putUInt("errorTime", getUnixTimestamp());
    
    // Send error notification if possible
    StaticJsonDocument<256> errorDoc;
    errorDoc["nodeId"] = systemState.nodeId;
    errorDoc["error"] = errorMsg;
    errorDoc["timestamp"] = getUnixTimestamp();
    errorDoc["uptime"] = systemState.uptimeSeconds;
    
    String errorMessage;
    serializeJson(errorDoc, errorMessage);
    queueLoRaMessage(errorMessage, true);
    
    if (restart) {
        vTaskDelay(pdMS_TO_TICKS(5000));  // Allow time for message transmission
        ESP.restart();
    }
}

void recoverFailedTasks(uint32_t failedTasks) {
    if (!(failedTasks & (1 << 0))) {  // Sensor task failed
        Serial.println("Attempting to recover sensor task...");
        vTaskDelete(xSensorTask);
        xTaskCreate(sensorTask, "SensorTask", 3072, NULL, PRIORITY_NORMAL, &xSensorTask);
    }
    
    if (!(failedTasks & (1 << 1))) {  // LoRa task failed
        Serial.println("Attempting to recover LoRa task...");
        vTaskDelete(xLoRaTask);
        xTaskCreate(loraTask, "LoRaTask", 3072, NULL, PRIORITY_NORMAL, &xLoRaTask);
    }
    
    if (!(failedTasks & (1 << 2))) {  // Fire detection task failed
        Serial.println("Attempting to recover fire detection task...");
        vTaskDelete(xFireDetectionTask);
        xTaskCreate(fireDetectionTask, "FireDetection", 4096, NULL, PRIORITY_HIGH, &xFireDetectionTask);
    }
}
```

## B.9 Configuration Management

### B.9.1 Non-Volatile Storage (NVS) Implementation

```cpp
void loadConfiguration() {
    // Load sensor configuration
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
    
    // Load calibration data
    sensorCalibration.tempOffset = preferences.getFloat("tempOffset", 0.0);
    sensorCalibration.tempScale = preferences.getFloat("tempScale", 1.0);
    sensorCalibration.humOffset = preferences.getFloat("humOffset", 0.0);
    sensorCalibration.humScale = preferences.getFloat("humScale", 1.0);
    sensorCalibration.smokeBaseline = preferences.getUShort("smokeBase", 100);
    sensorCalibration.coBaseline = preferences.getUShort("coBase", 10);
    
    Serial.println("Configuration loaded from NVS");
}

void saveConfiguration() {
    // Save sensor configuration
    preferences.putFloat("tempWeight", fireConfig.temperatureWeight);
    preferences.putFloat("humWeight", fireConfig.humidityWeight);
    preferences.putFloat("smokeWeight", fireConfig.smokeWeight);
    preferences.putFloat("coWeight", fireConfig.coWeight);
    preferences.putFloat("flameWeight", fireConfig.flameWeight);
    
    // Save thresholds
    for (int i = 0; i < 5; i++) {
        char key[16];
        snprintf(key, sizeof(key), "threshold%d", i);
        preferences.putFloat(key, fireConfig.threshold[i]);
    }
    
    // Save calibration data
    preferences.putFloat("tempOffset", sensorCalibration.tempOffset);
    preferences.putFloat("tempScale", sensorCalibration.tempScale);
    preferences.putFloat("humOffset", sensorCalibration.humOffset);
    preferences.putFloat("humScale", sensorCalibration.humScale);
    preferences.putUShort("smokeBase", sensorCalibration.smokeBaseline);
    preferences.putUShort("coBase", sensorCalibration.coBaseline);
    
    Serial.println("Configuration saved to NVS");
}
```

## B.10 Firmware Update and Maintenance

### B.10.1 Over-The-Air (OTA) Update Support

```cpp
#include <Update.h>
#include <ArduinoOTA.h>

void setupOTA() {
    ArduinoOTA.setHostname(("fire-node-" + String(systemState.nodeId)).c_str());
    ArduinoOTA.setPassword("fire2022secure");
    
    ArduinoOTA.onStart([]() {
        Serial.println("OTA Update Starting...");
        systemState.alertActive = false;  // Disable alerts during update
    });
    
    ArduinoOTA.onEnd([]() {
        Serial.println("OTA Update Complete");
    });
    
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("OTA Progress: %u%%\r", (progress / (total / 100)));
    });
    
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("OTA Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });
    
    ArduinoOTA.begin();
    Serial.println("OTA Update service ready");
}
```

---

## B.11 Compilation and Build Instructions

### B.11.1 Required Libraries

```ini
; Platform IO configuration
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps = 
    sandeepmistry/LoRa@^0.8.0
    adafruit/DHT sensor library@^1.4.2
    bblanchon/ArduinoJson@^6.19.4
    arduino-libraries/WiFi@^1.2.7
```

### B.11.2 Compiler Flags and Optimization

```cpp
// Compiler directives for optimization
#pragma GCC optimize("O2")
#pragma GCC optimize("unroll-loops")

// Memory allocation optimization
#define CONFIG_ESP32_WIFI_STATIC_RX_BUFFER_NUM 4
#define CONFIG_ESP32_WIFI_DYNAMIC_RX_BUFFER_NUM 8
```

---

**Revision History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2022-04-01 | Initial firmware architecture | F. Amoah |
| 2.0 | 2022-05-15 | Added power management | F. Amoah |
| 2.1 | 2022-06-20 | Enhanced fire detection algorithm | F. Amoah |
| 2.1.3 | 2022-07-10 | Bug fixes and optimization | F. Amoah |
