package com.robotics.deliverycontroller.services

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.robotics.deliverycontroller.bluetooth.BluetoothManager
import com.robotics.deliverycontroller.utils.GeoMath

class NavigationForegroundService : Service() {

    companion object {
        private const val TAG = "NavForegroundService"
        private const val CHANNEL_ID = "ROBOT_NAV_CHANNEL_01"
        private const val NOTIFICATION_ID = 2026
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Robot::NavigationWakeLock").apply {
            acquire(10 * 60 * 1000L /* 10 minutes */)
        }

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Robot Navigation Service Active"))
        startLocationUpdates()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 500)
            .setMinUpdateIntervalMillis(200)
            .setMinUpdateDistanceMeters(0.2f)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (loc in locationResult.locations) {
                    processLocationUpdate(loc)
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
    }

    private fun processLocationUpdate(location: Location) {
        Log.d(TAG, "GPS Fix: Lat ${location.latitude}, Lng ${location.longitude}, Acc: ${location.accuracy}m, Bearing: ${location.bearing}")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Robot Navigation Telemetry",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps GPS and Bluetooth alive in background"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Automatic Delivery Robot")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        BluetoothManager.sendCommand('S', "SERVICE_STOPPED")
    }
}
