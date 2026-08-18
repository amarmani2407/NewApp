package com.robotics.deliverycontroller.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

object BluetoothManager {
    private const val TAG = "RobotBTManager"
    
    // Standard SPP (Serial Port Profile) RFCOMM UUID
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    var isConnected: Boolean = false
        private set

    @SuppressLint("MissingPermission")
    suspend fun connectToHC05(deviceAddress: String): Result<Boolean> = withContext(Dispatchers.IO) {
        return@withContext try {
            bluetoothAdapter?.cancelDiscovery()
            val device: BluetoothDevice = bluetoothAdapter?.getRemoteDevice(deviceAddress)
                ?: return@withContext Result.failure(Exception("Bluetooth adapter not available or device not found"))

            Log.d(TAG, "Creating RFCOMM socket to: ${device.name} ($deviceAddress)")
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket?.connect()

            outputStream = socket?.outputStream
            isConnected = true
            Log.d(TAG, "Connected to HC-05 SPP successfully")
            Result.success(true)
        } catch (e: IOException) {
            Log.e(TAG, "Failed to connect to HC-05: ${e.message}")
            closeConnection()
            Result.failure(e)
        }
    }

    fun sendCommand(commandChar: Char, reason: String = ""): Boolean {
        if (!isConnected || outputStream == null) {
            Log.w(TAG, "Cannot send command '$commandChar': Socket disconnected")
            return false
        }

        return try {
            outputStream?.write(commandChar.code)
            outputStream?.flush()
            Log.d(TAG, "TX -> '$commandChar' (ASCII: ${commandChar.code}) | Reason: $reason")
            true
        } catch (e: IOException) {
            Log.e(TAG, "Transmission failed: ${e.message}")
            isConnected = false
            false
        }
    }

    fun closeConnection() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (ignored: IOException) {}
        finally {
            outputStream = null
            socket = null
            isConnected = false
            Log.d(TAG, "Bluetooth RFCOMM socket closed")
        }
    }
}
