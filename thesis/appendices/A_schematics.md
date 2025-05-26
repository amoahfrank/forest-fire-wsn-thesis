# Appendix A: Circuit Schematics and Hardware Design

## A.1 System Architecture Overview

This appendix provides comprehensive circuit schematics, PCB layouts, and hardware design documentation for the solar-assisted WSN-LoRa IoT forest fire detection system. All designs are optimized for outdoor deployment in harsh forest environments while maintaining cost-effectiveness and manufacturing simplicity.

## A.2 Main Sensor Node Schematic

### A.2.1 ESP32 Development Board Integration

```
ESP32-WROOM-32 Development Board Connections:
┌─────────────────────────────────────────┐
│              ESP32-WROOM-32             │
│  ┌───────────────────────────────────┐  │
│  │           GPIO Pin Assignments    │  │
│  │  GPIO 2  -> Status LED (Blue)    │  │
│  │  GPIO 4  -> DHT22 Data           │  │
│  │  GPIO 5  -> LoRa CS              │  │
│  │  GPIO 12 -> LoRa DIO0            │  │
│  │  GPIO 13 -> LoRa DIO1            │  │
│  │  GPIO 14 -> LoRa DIO2            │  │
│  │  GPIO 16 -> LoRa Reset           │  │
│  │  GPIO 18 -> LoRa SCK             │  │
│  │  GPIO 19 -> LoRa MISO            │  │
│  │  GPIO 21 -> I2C SDA              │  │
│  │  GPIO 22 -> I2C SCL              │  │
│  │  GPIO 23 -> LoRa MOSI            │  │
│  │  GPIO 25 -> Buzzer PWM           │  │
│  │  GPIO 26 -> Battery Monitor      │  │
│  │  GPIO 27 -> Solar Panel Monitor  │  │
│  │  GPIO 32 -> MQ-2 Analog          │  │
│  │  GPIO 33 -> MQ-7 Analog          │  │
│  │  GPIO 34 -> IR Flame Sensor      │  │
│  │  GPIO 35 -> Light Sensor         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### A.2.2 Power Management Circuit

**Solar Charging Circuit with MPPT Controller:**

```
Solar Panel (+) ----[D1]----+----[L1]----+---- Battery (+)
    12V 10W         1N5819  |    47µH    |     3.7V Li-ion
                            |            |
Solar Panel (-) ------------+            +---- Battery (-)
                            |            |
                         [C1][C2]     [C3][C4]
                         100µF 10µF   220µF 10µF
                            |            |
                            GND          GND

MPPT Controller: CN3791
┌─────────────────────────────────┐
│  CN3791 MPPT Controller         │
│  VIN  -> Solar Panel (+)        │
│  GND  -> Solar Panel (-)/System │
│  VBAT -> Battery (+)            │
│  VBAT -> Battery (-)            │
│  PROG -> 2kΩ to GND (500mA)     │
│  MPPT -> 10kΩ/3.3kΩ divider     │
└─────────────────────────────────┘

Components:
D1: 1N5819 Schottky Diode (Solar reverse protection)
L1: 47µH Power Inductor (MPPT switching)
C1: 100µF Electrolytic Capacitor (Input filtering)
C2: 10µF Ceramic Capacitor (High frequency filtering)
C3: 220µF Electrolytic Capacitor (Output filtering)
C4: 10µF Ceramic Capacitor (Output ripple reduction)
```

### A.2.3 Sensor Interface Circuits

**DHT22 Temperature/Humidity Sensor:**

```
ESP32 GPIO4 ----[R1]---- DHT22 Data Pin
                 4.7kΩ
                   |
                 +3.3V

DHT22 Connections:
Pin 1: VCC (+3.3V)
Pin 2: Data (to GPIO4 via 4.7kΩ pullup)
Pin 3: Not connected
Pin 4: GND
```

**MQ-2 Smoke Sensor Circuit:**

```
+5V ---- MQ-2 VCC
         MQ-2 GND ---- GND
         MQ-2 AOUT ---[R2]--- ESP32 GPIO32
                      1kΩ
         MQ-2 DOUT --- Not connected

Heater Control Circuit:
+5V ----[Q1]---- MQ-2 Heater (+)
         |
      [R3]|
      2.2kΩ
         |
ESP32 GPIO15 (Heater Control)

Q1: 2N2222 NPN Transistor
```

**IR Flame Sensor Interface:**

```
+3.3V ---- IR Sensor VCC
           IR Sensor GND ---- GND
           IR Sensor OUT ---- ESP32 GPIO34

Signal Conditioning:
IR Sensor OUT ---[R4]---[C5]--- ESP32 GPIO34
                 10kΩ   100nF
                  |      |
                 GND    GND
```

## A.3 LoRa Communication Module

### A.3.1 SX1276 LoRa Module Schematic

```
ESP32 SPI Interface to SX1276:
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│           ESP32                 │    │         SX1276 LoRa             │
│                                 │    │                                 │
│  GPIO18 (SCK)  ────────────────────── SCK                             │
│  GPIO19 (MISO) ────────────────────── MISO                            │
│  GPIO23 (MOSI) ────────────────────── MOSI                            │
│  GPIO5  (CS)   ────────────────────── NSS                             │
│  GPIO16 (RST)  ────────────────────── RESET                           │
│  GPIO12 (DIO0) ────────────────────── DIO0                            │
│  GPIO13 (DIO1) ────────────────────── DIO1                            │
│  GPIO14 (DIO2) ────────────────────── DIO2                            │
│                                 │    │                                 │
│  +3.3V ────────────────────────────── VCC                             │
│  GND   ────────────────────────────── GND                             │
└─────────────────────────────────┘    └─────────────────────────────────┘

Antenna Matching Network:
SX1276 RFO_LF ----[L2]----[C6]---- SMA Connector
                   15nH   1pF
                    |      |
                   [C7]   [C8]
                   15pF   10pF
                    |      |
                   GND    GND
```

### A.3.2 Antenna Configuration

**868 MHz / 915 MHz Omnidirectional Antenna:**

```
Antenna Specifications:
- Frequency: 868MHz (EU) / 915MHz (US)
- Gain: 2.15 dBi
- VSWR: < 1.5:1
- Impedance: 50Ω
- Connector: SMA Male
- Length: 195mm (868MHz) / 164mm (915MHz)

PCB Antenna (Alternative):
Quarter-wave monopole on PCB:
Length = λ/4 = (3×10⁸) / (4×868×10⁶) = 86.4mm

Trace Width: 2.4mm (50Ω impedance on FR4)
Ground Plane: Minimum 50mm × 50mm
```

## A.4 GPS Module Integration

### A.4.1 NEO-8M GPS Module Connection

```
ESP32 UART2 to NEO-8M GPS:
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│           ESP32                 │    │         NEO-8M GPS              │
│                                 │    │                                 │
│  GPIO17 (TX2)  ────────────────────── RX                              │
│  GPIO16 (RX2)  ────────────────────── TX                              │
│                                 │    │                                 │
│  +3.3V ────────────────────────────── VCC                             │
│  GND   ────────────────────────────── GND                             │
└─────────────────────────────────┘    └─────────────────────────────────┘

GPS Antenna:
- Active GPS antenna with 28dB gain
- 1575.42 MHz center frequency
- SMA connector
- 3-5V supply voltage
- Cable length: 3 meters maximum
```

## A.5 Status Indicators and User Interface

### A.5.1 LED Status Indicators

```
Status LED Array:
+3.3V ----[R5]----[LED1]---- ESP32 GPIO2  (System Status - Blue)
          330Ω     Blue
          
+3.3V ----[R6]----[LED2]---- ESP32 GPIO0  (Communication - Green)
          330Ω     Green
          
+3.3V ----[R7]----[LED3]---- ESP32 GPIO4  (Alert Status - Red)
          330Ω     Red

LED Specifications:
- Forward Voltage: 2.0-3.3V
- Forward Current: 10mA
- Package: 3mm through-hole
- Viewing Angle: 120°
```

### A.5.2 Buzzer Alert System

```
Active Buzzer Circuit:
ESP32 GPIO25 ----[R8]----[Q2]---- +3.3V
                 1kΩ      |
                         [Buzzer]
                          |
                         GND

Q2: 2N2222 NPN Transistor
Buzzer: 3.3V Active Buzzer, 85dB @ 10cm
Frequency: 2.3kHz ± 300Hz
Current: 30mA maximum
```

## A.6 Enclosure and Mounting Hardware

### A.6.1 Weatherproof Enclosure Design

**Enclosure Specifications:**
- Material: UV-resistant ABS plastic
- IP Rating: IP67 (dust-tight, waterproof)
- Dimensions: 150mm × 100mm × 75mm
- Operating Temperature: -40°C to +85°C
- Wall Thickness: 3mm minimum
- Mounting: 4 × M6 stainless steel bolts

**Gland Specifications:**
- Cable glands: M12 IP68 rated
- Antenna feedthrough: N-type or SMA bulkhead
- Solar panel cable: MC4 weatherproof connectors

### A.6.2 Solar Panel Mounting System

```
Solar Panel Mount Assembly:
┌─────────────────────────────────────┐
│        Solar Panel 12V 10W         │
│         175mm × 115mm × 18mm        │
└─┬─────────────────────────────────┬─┘
  │                                 │
┌─┴─┐                             ┌─┴─┐
│   │  Adjustable Tilt Mechanism  │   │
│   │     (30° to 60° range)      │   │
└─┬─┘                             └─┬─┘
  │                                 │
┌─┴─────────────────────────────────┴─┐
│          Mounting Pole              │
│    Diameter: 50mm, Length: 2m      │
│      Material: Galvanized Steel     │
└─────────────────────────────────────┘

Mounting Hardware:
- Panel brackets: Anodized aluminum
- Tilt adjustment: Stainless steel hardware
- Pole clamps: Galvanized steel with rubber gaskets
- Foundation: Concrete pad 500mm × 500mm × 300mm
```

## A.7 PCB Layout Considerations

### A.7.1 Main Board Layout Guidelines

**Layer Stack-up (4-layer PCB):**
- Layer 1: Component placement and routing
- Layer 2: Ground plane (continuous)
- Layer 3: Power plane (+3.3V, +5V)
- Layer 4: Signal routing and component placement

**Design Rules:**
- Minimum trace width: 0.1mm (4 mil)
- Minimum via size: 0.2mm (8 mil)
- Minimum spacing: 0.1mm (4 mil)
- Copper thickness: 35µm (1 oz)
- Board thickness: 1.6mm standard FR4

### A.7.2 RF Layout Considerations

**LoRa Module Placement:**
- Keep LoRa module away from switching circuits
- Maintain 5mm clearance from crystal oscillators
- Use ground plane isolation around RF circuits
- 50Ω controlled impedance for RF traces

**Antenna Routing:**
- Use coplanar waveguide for antenna feed
- Maintain 3× trace width clearance on sides
- Minimize via usage in RF path
- Include test points for impedance verification

## A.8 Component Specifications

### A.8.1 Critical Component List

| Component | Part Number | Specifications | Manufacturer | Qty |
|-----------|-------------|----------------|--------------|-----|
| ESP32 | ESP32-WROOM-32 | 240MHz, WiFi+BT, 4MB Flash | Espressif | 1 |
| LoRa Module | SX1276 | 868/915MHz, +20dBm output | Semtech | 1 |
| Temp/Humidity | DHT22 | ±0.5°C, ±2% RH | Aosong | 1 |
| Smoke Sensor | MQ-2 | 300-10000ppm sensitivity | Hanwei | 1 |
| CO Sensor | MQ-7 | 20-2000ppm range | Hanwei | 1 |
| GPS Module | NEO-8M | 72-channel, 2.5m accuracy | u-blox | 1 |
| MPPT Controller | CN3791 | 500mA charging current | Consonance | 1 |
| Battery | 18650 Li-ion | 2600mAh, 3.7V nominal | Samsung | 2 |
| Solar Panel | Mono-Si | 12V, 10W, 23% efficiency | Generic | 1 |

### A.8.2 Passive Component Values

**Resistors (1% tolerance, 0603 package):**
- R1: 4.7kΩ (DHT22 pullup)
- R2: 1kΩ (MQ-2 interface)
- R3: 2.2kΩ (Heater control)
- R4: 10kΩ (IR sensor pullup)
- R5-R7: 330Ω (LED current limiting)
- R8: 1kΩ (Buzzer drive)

**Capacitors:**
- C1: 100µF, 25V electrolytic (Power filtering)
- C2: 10µF, 16V ceramic (Power filtering)
- C3: 220µF, 16V electrolytic (Output filtering)
- C4: 10µF, 16V ceramic (Output filtering)
- C5: 100nF, 50V ceramic (Signal filtering)
- C6: 1pF, NP0 ceramic (Antenna matching)
- C7: 15pF, NP0 ceramic (Antenna matching)
- C8: 10pF, NP0 ceramic (Antenna matching)

**Inductors:**
- L1: 47µH, 1A power inductor (MPPT)
- L2: 15nH, RF choke (Antenna matching)

## A.9 Manufacturing and Assembly Notes

### A.9.1 PCB Manufacturing Requirements

**PCB Specifications:**
- Material: FR4, Tg = 170°C minimum
- Copper weight: 1 oz (35µm) standard
- Surface finish: HASL or ENIG
- Solder mask: Green, matte finish
- Silkscreen: White, both sides
- Testing: Flying probe electrical test

### A.9.2 Assembly Considerations

**Component Placement:**
- Orient heat-sensitive components away from power circuits
- Maintain accessibility for programming connections
- Consider thermal expansion in critical circuits
- Provide test points for debugging and calibration

**Soldering Guidelines:**
- Use lead-free solder (SAC305 alloy)
- Reflow profile: Peak temperature 245°C
- Hand soldering: 350°C iron, rosin-core solder
- Inspect all joints with 10× magnification

## A.10 Quality Control and Testing

### A.10.1 Pre-Assembly Testing

**Bare Board Testing:**
- Continuity testing of all nets
- Impedance verification of RF traces
- Insulation resistance testing
- Visual inspection for defects

### A.10.2 Post-Assembly Validation

**Functional Testing Checklist:**
- [ ] Power supply voltages within specification
- [ ] Current consumption within limits
- [ ] All sensors responding correctly
- [ ] LoRa communication functional
- [ ] GPS acquisition successful
- [ ] Solar charging operational
- [ ] Alert systems functional

**Calibration Procedures:**
1. Temperature sensor calibration against reference
2. Humidity sensor calibration using salt solutions
3. Gas sensor baseline establishment
4. Battery voltage monitor calibration
5. Solar panel voltage monitor calibration

---

## A.11 Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2022-03-15 | Initial schematic design | F. Amoah |
| 1.1 | 2022-04-20 | Added MPPT controller circuit | F. Amoah |
| 1.2 | 2022-05-10 | Refined antenna matching network | F. Amoah |
| 2.0 | 2022-06-15 | Final production version | F. Amoah |

**Contact Information:**
For technical questions regarding these schematics, contact the thesis author or refer to the main thesis document for detailed system operation principles.
