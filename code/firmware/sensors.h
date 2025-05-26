// Forest Fire Detection System - Sensor Interface Header
// Hardware abstraction layer for sensor operations
// 
// MSc Thesis Implementation - July 2022
// Author: Frank Amoah

#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <DHT.h>
#include "config.h"

// Sensor reading structure
typedef struct {
    float temperature;      // Celsius
    float humidity;         // Percentage
    uint16_t smokePPM;      // Parts per million
    uint16_t coPPM;         // Parts per million
    bool flameDetected;     // Boolean flag
    float lightLevel;       // Percentage (0-100)
    float batteryVoltage;   // Volts
    float solarVoltage;     // Volts
    uint32_t timestamp;     // Unix timestamp
    bool validReading;      // Data validity flag
    uint8_t errorFlags;     // Sensor error indicators
} SensorReading_t;

// Sensor error flags
#define SENSOR_ERROR_DHT22    0x01
#define SENSOR_ERROR_MQ2      0x02
#define SENSOR_ERROR_MQ7      0x04
#define SENSOR_ERROR_FLAME    0x08
#define SENSOR_ERROR_POWER    0x10
#define SENSOR_ERROR_LIGHT    0x20

// Sensor calibration structure
typedef struct {
    float tempOffset;
    float humidScale;
    float humidOffset;
    uint16_t mq2R0;
    uint16_t mq7R0;
    float batteryDividerRatio;
    float solarDividerRatio;
    uint32_t magicNumber;
} SensorCalibration_t;

// Function prototypes
class SensorManager {
public:
    SensorManager();
    ~SensorManager();
    
    // Initialization methods
    bool initializeSensors();
    bool initializeDHT22();
    bool initializeMQSensors();
    bool initializePowerSensors();
    
    // Sensor reading methods
    bool readAllSensors(SensorReading_t* reading);
    bool readDHT22(float* temperature, float* humidity);
    uint16_t readMQ2Sensor();
    uint16_t readMQ7Sensor();
    bool readFlameSensor();
    float readLightSensor();
    float readBatteryVoltage();
    float readSolarVoltage();
    
    // Calibration methods
    void loadCalibration();
    void saveCalibration();
    void setCalibration(const SensorCalibration_t* calib);
    void resetCalibration();
    
    // Validation and processing
    bool validateSensorData(const SensorReading_t* reading);
    void applySensorCalibration(SensorReading_t* reading);
    void filterSensorNoise(SensorReading_t* reading);
    
    // Sensor status and diagnostics
    uint8_t getSensorStatus();
    void runSensorDiagnostics();
    bool isSensorResponding(uint8_t sensorType);
    
    // Power management
    void enableSensorPower();
    void disableSensorPower();
    void setSensorPowerMode(uint8_t mode);
    
    // Utility methods
    String getSensorStatusString();
    void printSensorReading(const SensorReading_t* reading);
    uint32_t getLastReadingTime();
    
private:
    DHT* dht;
    SensorCalibration_t calibration;
    SensorReading_t lastReading;
    uint32_t lastReadTime;
    uint8_t sensorStatus;
    bool sensorsInitialized;
    
    // Internal helper methods
    uint16_t analogReadFiltered(uint8_t pin, uint8_t samples = 5);
    float convertVoltage(uint16_t rawValue, float dividerRatio);
    uint16_t convertMQToPPM(uint16_t rawValue, uint16_t r0, float curve);
    bool checkSensorBounds(const SensorReading_t* reading);
    void updateSensorStatus(uint8_t sensorFlag, bool status);
};

// Global sensor conversion functions
uint16_t convertSmokeToPPM(uint16_t rawValue, uint16_t r0 = MQ2_R0);
uint16_t convertCOToPPM(uint16_t rawValue, uint16_t r0 = MQ7_R0);
float calculateMQResistance(uint16_t rawValue);
float calculateMQPPM(float resistance, float r0, float curve);

// Sensor validation ranges
#define TEMP_MIN_VALID -40.0
#define TEMP_MAX_VALID 125.0
#define HUMIDITY_MIN_VALID 0.0
#define HUMIDITY_MAX_VALID 100.0
#define SMOKE_MAX_VALID 10000
#define CO_MAX_VALID 1000
#define BATTERY_MIN_VALID 2.5
#define BATTERY_MAX_VALID 5.0
#define SOLAR_MAX_VALID 25.0

// Sensor timing constants
#define DHT22_READ_DELAY 2000     // 2 seconds between readings
#define MQ_WARMUP_TIME 20000      // 20 seconds warmup for MQ sensors
#define SENSOR_STABILIZE_TIME 500 // 500ms stabilization time
#define ADC_SETTLE_TIME 10        // 10ms ADC settling time

#endif // SENSORS_H