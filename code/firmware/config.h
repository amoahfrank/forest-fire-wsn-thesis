// Forest Fire Detection System - Hardware Configuration Header
// Sensor Node Firmware Configuration Constants
// 
// MSc Thesis Implementation - July 2022
// Author: Frank Amoah

#ifndef CONFIG_H
#define CONFIG_H

// Firmware Version Information
#define FIRMWARE_VERSION "2.1.3"
#define BUILD_DATE __DATE__ " " __TIME__
#define HARDWARE_VERSION "v2.1"

// System Configuration
#define NODE_ID_LENGTH 8
#define MAX_RETRY_ATTEMPTS 3
#define WATCHDOG_TIMEOUT 30000  // 30 seconds
#define SYSTEM_CHECK_INTERVAL 60000  // 1 minute

// LoRa Communication Configuration
#define LORA_FREQUENCY 868E6
#define LORA_BANDWIDTH 125E3
#define LORA_SPREADING_FACTOR 9
#define LORA_CODING_RATE 6
#define LORA_TX_POWER 17
#define LORA_PREAMBLE_LENGTH 8
#define LORA_SYNC_WORD 0x34
#define LORA_MAX_PAYLOAD_LENGTH 255

// Sensor Sampling Configuration
#define SENSOR_READ_INTERVAL 30000    // 30 seconds
#define LORA_TX_INTERVAL 60000        // 1 minute
#define STATUS_TX_INTERVAL 300000     // 5 minutes
#define HEARTBEAT_INTERVAL 600000     // 10 minutes

// Power Management Configuration
#define BATTERY_LOW_THRESHOLD 3.3     // Volts
#define BATTERY_CRITICAL_THRESHOLD 3.0 // Volts
#define SOLAR_CHARGE_THRESHOLD 4.5    // Volts
#define LOW_POWER_SLEEP_DURATION 300  // 5 minutes
#define DEEP_SLEEP_THRESHOLD 2.8      // Volts

// Sensor Calibration Constants
#define DHT22_TEMP_OFFSET -0.35       // Temperature calibration offset
#define DHT22_HUMID_SCALE 0.9891      // Humidity calibration scale
#define DHT22_HUMID_OFFSET 0.42       // Humidity calibration offset
#define MQ2_R0 10000                  // MQ-2 sensor resistance in clean air
#define MQ7_R0 10000                  // MQ-7 sensor resistance in clean air

// Alert Configuration
#define BUZZER_ALERT_DURATION 200     // milliseconds
#define BUZZER_ALERT_INTERVAL 200     // milliseconds
#define LED_BLINK_FAST 100            // milliseconds
#define LED_BLINK_SLOW 500            // milliseconds
#define ALERT_REPEAT_INTERVAL 30000   // 30 seconds

// Fire Detection Thresholds (Default values - configurable via MQTT)
#define TEMP_THRESHOLD_LOW 35.0       // Celsius
#define TEMP_THRESHOLD_MODERATE 45.0  // Celsius
#define TEMP_THRESHOLD_HIGH 55.0      // Celsius
#define TEMP_THRESHOLD_CRITICAL 65.0  // Celsius

#define HUMIDITY_THRESHOLD_HIGH 60.0  // Percent (below this is dry)
#define HUMIDITY_THRESHOLD_MODERATE 40.0
#define HUMIDITY_THRESHOLD_LOW 20.0
#define HUMIDITY_THRESHOLD_CRITICAL 10.0

#define SMOKE_THRESHOLD_LOW 50        // PPM
#define SMOKE_THRESHOLD_MODERATE 100  // PPM
#define SMOKE_THRESHOLD_HIGH 200      // PPM
#define SMOKE_THRESHOLD_CRITICAL 400  // PPM

#define CO_THRESHOLD_LOW 10           // PPM
#define CO_THRESHOLD_MODERATE 35      // PPM
#define CO_THRESHOLD_HIGH 70          // PPM
#define CO_THRESHOLD_CRITICAL 150     // PPM

// Risk Assessment Weights
#define WEIGHT_TEMPERATURE 0.25
#define WEIGHT_HUMIDITY 0.15
#define WEIGHT_SMOKE 0.35
#define WEIGHT_CO 0.15
#define WEIGHT_FLAME 0.10

// Risk Level Thresholds
#define RISK_THRESHOLD_LOW 0.1
#define RISK_THRESHOLD_MODERATE 0.3
#define RISK_THRESHOLD_HIGH 0.5
#define RISK_THRESHOLD_CRITICAL 0.7
#define RISK_THRESHOLD_EXTREME 0.9

// Storage Configuration
#define MAX_STORED_READINGS 100
#define EEPROM_CONFIG_ADDRESS 0
#define EEPROM_CALIB_ADDRESS 100
#define CONFIG_MAGIC_NUMBER 0xABCD

// Network Configuration
#define MQTT_KEEPALIVE 60
#define MQTT_QOS_LEVEL 1
#define MQTT_RETAIN_STATUS true
#define WIFI_CONNECT_TIMEOUT 30000    // 30 seconds
#define WIFI_RECONNECT_INTERVAL 60000 // 1 minute

// Debug Configuration
#ifdef DEBUG_MODE
#define DEBUG_PRINT(x) Serial.print(x)
#define DEBUG_PRINTLN(x) Serial.println(x)
#define DEBUG_PRINTF(f, ...) Serial.printf(f, __VA_ARGS__)
#else
#define DEBUG_PRINT(x)
#define DEBUG_PRINTLN(x)
#define DEBUG_PRINTF(f, ...)
#endif

// Status LED States
enum LedState {
    LED_OFF = 0,
    LED_ON = 1,
    LED_BLINK_FAST = 2,
    LED_BLINK_SLOW = 3,
    LED_HEARTBEAT = 4
};

// System States
enum SystemState {
    SYSTEM_INIT = 0,
    SYSTEM_NORMAL = 1,
    SYSTEM_LOW_POWER = 2,
    SYSTEM_CRITICAL_POWER = 3,
    SYSTEM_MAINTENANCE = 4,
    SYSTEM_ERROR = 5
};

// Risk Levels
enum RiskLevel {
    RISK_NORMAL = 0,
    RISK_LOW = 1,
    RISK_MODERATE = 2,
    RISK_HIGH = 3,
    RISK_CRITICAL = 4,
    RISK_EXTREME = 5
};

// Communication States
enum CommState {
    COMM_DISCONNECTED = 0,
    COMM_CONNECTING = 1,
    COMM_CONNECTED = 2,
    COMM_TRANSMITTING = 3,
    COMM_ERROR = 4
};

#endif // CONFIG_H