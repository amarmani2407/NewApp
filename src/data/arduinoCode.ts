export const ARDUINO_UNO_FIRMWARE_SKETCH = `/*
 * =========================================================================
 * AUTOMATIC DELIVERY ROBOT CONTROLLER - ARDUINO UNO FIRMWARE
 * Target Hardware: Arduino UNO R3 + HC-05 Bluetooth + L298N Motor Shield
 * Baud Rate: 9600 bps
 * =========================================================================
 * 
 * Command Protocol (Single-byte ASCII):
 *   'F' -> Move Forward
 *   'B' -> Move Backward
 *   'L' -> Pivot Turn Left
 *   'R' -> Pivot Turn Right
 *   'S' -> Stop Motors (Safe Halt)
 *   '1'-'9' -> Set Motor PWM Speed (100 - 255)
 */

#include <SoftwareSerial.h>

// --- BLUETOOTH HC-05 PIN DEFINITIONS ---
// Arduino RX (Pin 10) connects to HC-05 TX
// Arduino TX (Pin 11) connects to HC-05 RX (via voltage divider: 1k / 2k)
SoftwareSerial btSerial(10, 11); // RX, TX

// --- L298N DUAL H-BRIDGE MOTOR DRIVER PINS ---
const int ENA = 5;  // Left Motors PWM Speed
const int IN1 = 7;  // Left Motors Direction 1
const int IN2 = 6;  // Left Motors Direction 2
const int IN3 = 4;  // Right Motors Direction 1
const int IN4 = 3;  // Right Motors Direction 2
const int ENB = 9;  // Right Motors PWM Speed

// --- HC-SR04 ULTRASONIC SENSOR (OBSTACLE AVOIDANCE) ---
const int TRIG_PIN = 12;
const int ECHO_PIN = 13;
const int MIN_SAFE_DISTANCE_CM = 15;

// --- SAFETY & SPEED CONFIGURATION ---
int currentPwmSpeed = 200; // Default speed (0 - 255)
unsigned long lastCommandTime = 0;
const unsigned long WATCHDOG_TIMEOUT_MS = 2000; // Auto-stop if signal lost
char currentMotionState = 'S';

void setup() {
  // Initialize hardware serial for USB debugging
  Serial.begin(9600);
  // Initialize SoftwareSerial for HC-05 Bluetooth module
  btSerial.begin(9600);

  // Configure Motor Control Pins
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);

  // Configure Ultrasonic Sensor Pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Initial Safe Stop
  stopRobot();

  Serial.println(F("[ROBOT] System Initialized. Waiting for Bluetooth Commands..."));
  btSerial.println(F("[ARDUINO_READY]"));
}

void loop() {
  // 1. Check for incoming Bluetooth commands from Android Navigation Brain
  if (btSerial.available() > 0) {
    char cmd = btSerial.read();
    handleIncomingCommand(cmd);
    lastCommandTime = millis();
  }

  // Also accept commands from Serial Monitor (USB debugging)
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    handleIncomingCommand(cmd);
    lastCommandTime = millis();
  }

  // 2. Ultrasonic Safety Check (Auto-halt if obstacle closer than safe distance)
  if (currentMotionState == 'F') {
    int distanceCm = measureDistanceCm();
    if (distanceCm > 0 && distanceCm < MIN_SAFE_DISTANCE_CM) {
      stopRobot();
      currentMotionState = 'S';
      Serial.print(F("[SAFETY_TRIGGER] Obstacle detected at: "));
      Serial.print(distanceCm);
      Serial.println(F(" cm. Robot halted."));
      btSerial.println(F("[OBSTACLE_HALT]"));
    }
  }

  // 3. Hardware Watchdog: Auto-halt if no command received for > 2.0s during motion
  if (currentMotionState != 'S' && (millis() - lastCommandTime > WATCHDOG_TIMEOUT_MS)) {
    stopRobot();
    currentMotionState = 'S';
    Serial.println(F("[WATCHDOG] Bluetooth timeout. Emergency safety stop executed."));
  }

  delay(20);
}

void handleIncomingCommand(char cmd) {
  switch (cmd) {
    case 'F':
      moveForward();
      currentMotionState = 'F';
      Serial.println(F("[ACTION] FORWARD"));
      break;

    case 'B':
      moveBackward();
      currentMotionState = 'B';
      Serial.println(F("[ACTION] BACKWARD"));
      break;

    case 'L':
      pivotLeft();
      currentMotionState = 'L';
      Serial.println(F("[ACTION] PIVOT LEFT"));
      break;

    case 'R':
      pivotRight();
      currentMotionState = 'R';
      Serial.println(F("[ACTION] PIVOT RIGHT"));
      break;

    case 'S':
      stopRobot();
      currentMotionState = 'S';
      Serial.println(F("[ACTION] STOP (Safe Brake)"));
      break;

    // Speed presets
    case '1' ... '9':
      currentPwmSpeed = map(cmd - '0', 1, 9, 100, 255);
      analogWrite(ENA, currentPwmSpeed);
      analogWrite(ENB, currentPwmSpeed);
      Serial.print(F("[PWM] Speed set to: "));
      Serial.println(currentPwmSpeed);
      break;

    default:
      // Unknown command ignored
      break;
  }
}

void moveForward() {
  analogWrite(ENA, currentPwmSpeed);
  analogWrite(ENB, currentPwmSpeed);
  // Left Motor Forward
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  // Right Motor Forward
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void moveBackward() {
  analogWrite(ENA, currentPwmSpeed);
  analogWrite(ENB, currentPwmSpeed);
  // Left Motor Backward
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  // Right Motor Backward
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void pivotLeft() {
  analogWrite(ENA, currentPwmSpeed);
  analogWrite(ENB, currentPwmSpeed);
  // Left Motor Backward, Right Motor Forward
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void pivotRight() {
  analogWrite(ENA, currentPwmSpeed);
  analogWrite(ENB, currentPwmSpeed);
  // Left Motor Forward, Right Motor Backward
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void stopRobot() {
  // Coast to stop & disable PWM
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}

int measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 25000); // 25ms timeout
  if (duration == 0) return 999;
  return (int)(duration * 0.034 / 2);
}
`;
