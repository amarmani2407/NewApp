export const ANDROID_KOTLIN_FILES = {
  manifest: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.robotics.deliverycontroller">

    <!-- Bluetooth Classic & SPP Permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />

    <!-- Precise GPS & Foreground Service Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Automatic Delivery Robot"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">

        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="\${MAPS_API_KEY}" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".services.NavigationForegroundService"
            android:foregroundServiceType="location"
            android:exported="false" />
    </application>
</manifest>`,

  bluetoothManager: `package com.robotics.deliverycontroller.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

enum class BtState { DISCONNECTED, CONNECTING, CONNECTED, ERROR }

object BluetoothManager {
    private const val TAG = "BluetoothManager"
    // Standard Serial Port Profile (SPP) UUID for HC-05 / HC-06
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    private val _connectionState = MutableStateFlow(BtState.DISCONNECTED)
    val connectionState: StateFlow<BtState> = _connectionState

    private val _lastCommand = MutableStateFlow("S")
    val lastCommand: StateFlow<String> = _lastCommand

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var retryCount = 0

    @SuppressLint("MissingPermission")
    fun connectToDevice(macAddress: String, onResult: (Boolean) -> Unit = {}) {
        scope.launch {
            _connectionState.value = BtState.CONNECTING
            try {
                val device: BluetoothDevice? = bluetoothAdapter?.getRemoteDevice(macAddress)
                if (device == null) {
                    _connectionState.value = BtState.ERROR
                    onResult(false)
                    return@launch
                }

                bluetoothAdapter?.cancelDiscovery()
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                socket?.connect()
                outputStream = socket?.outputStream

                _connectionState.value = BtState.CONNECTED
                retryCount = 0
                Log.d(TAG, "Connected to HC-05 at $macAddress")
                withContext(Dispatchers.Main) { onResult(true) }
            } catch (e: IOException) {
                Log.e(TAG, "Connection failed", e)
                closeConnection()
                if (retryCount < 1) {
                    retryCount++
                    delay(1500)
                    connectToDevice(macAddress, onResult)
                } else {
                    _connectionState.value = BtState.ERROR
                    withContext(Dispatchers.Main) { onResult(false) }
                }
            }
        }
    }

    /**
     * Unified single shared function for transmitting movement commands to Arduino UNO
     */
    fun sendCommand(cmd: Char, source: String = "APP"): Boolean {
        _lastCommand.value = cmd.toString()
        if (_connectionState.value != BtState.CONNECTED || outputStream == null) {
            Log.w(TAG, "Cannot send '$cmd' - Bluetooth not connected.")
            return false
        }

        scope.launch {
            try {
                outputStream?.write(cmd.code)
                outputStream?.flush()
                Log.d(TAG, "TX -> Arduino: '$cmd' from $source")
            } catch (e: IOException) {
                Log.e(TAG, "Write error for command '$cmd'", e)
                _connectionState.value = BtState.ERROR
            }
        }
        return true
    }

    fun closeConnection() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (ignored: Exception) {}
        socket = null
        outputStream = null
        _connectionState.value = BtState.DISCONNECTED
    }
}`,

  navigationService: `package com.robotics.deliverycontroller.services

import android.app.*
import android.content.Intent
import android.location.Location
import android.os.*
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.robotics.deliverycontroller.MainActivity
import com.robotics.deliverycontroller.bluetooth.BluetoothManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlin.math.*

class NavigationForegroundService : Service() {
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "RobotNavigationChannel"
        const val NOTIFICATION_ID = 1001
        val currentRobotLocation = MutableStateFlow<Location?>(null)
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        acquireWakeLock()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Robot Navigation Active", "Monitoring GPS Waypoints"))
        setupLocationUpdates()
    }

    private fun setupLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000)
            .setMinUpdateIntervalMillis(500)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    currentRobotLocation.value = loc
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {}
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Robot::NavigationWakeLock").apply {
            acquire(4 * 60 * 60 * 1000L) // 4 hours
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Robot Navigation Service", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, content: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        wakeLock?.release()
        BluetoothManager.sendCommand('S', "SERVICE_DESTROYED")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`,

  haversineCalc: `package com.robotics.deliverycontroller.utils

import kotlin.math.*

object GeoMath {
    private const val EARTH_RADIUS_METERS = 6371000.0

    /**
     * Calculates distance between 2 GPS coordinates in meters using the Haversine formula
     */
    fun haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2.0) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2).pow(2.0)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return EARTH_RADIUS_METERS * c
    }

    /**
     * Computes target bearing in degrees (0 - 360)
     */
    fun calculateBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val phi1 = Math.toRadians(lat1)
        val phi2 = Math.toRadians(lat2)
        val deltaLambda = Math.toRadians(lon2 - lon1)
        val y = sin(deltaLambda) * cos(phi2)
        val x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(deltaLambda)
        val bearing = Math.toDegrees(atan2(y, x))
        return (bearing + 360.0) % 360.0
    }
}`
};
