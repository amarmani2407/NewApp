import JSZip from 'jszip';
import { ANDROID_KOTLIN_FILES } from '../data/androidKotlinCode';
import { ARDUINO_UNO_FIRMWARE_SKETCH } from '../data/arduinoCode';

export const ANDROID_STUDIO_PROJECT_FILES = {
  rootBuildGradle: `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`,
  settingsGradle: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DeliveryRobotController"
include ':app'
`,
  gradleWrapperProperties: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`,
  gradlewBat: `@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
goto fail

:execute
@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*

:fail
exit /b 1
`,
  gradlewSh: `#!/bin/sh
APP_BASE_NAME=\`basename "$0"\`
APP_HOME=\`cd "\`dirname "$0"\`" > /dev/null && pwd -P\`
exec "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" "$@"
`,
  appBuildGradle: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.robotics.deliverycontroller'
    compileSdk 34

    defaultConfig {
        applicationId "com.robotics.deliverycontroller"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            debuggable true
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'com.google.android.gms:play-services-location:21.1.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3'
}
`,
  mainActivity: `package com.robotics.deliverycontroller

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.robotics.deliverycontroller.bluetooth.BluetoothManager
import com.robotics.deliverycontroller.services.NavigationForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val requiredPermissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    } else {
        arrayOf(
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            Toast.makeText(this, "Hardware Permissions Granted", Toast.LENGTH_SHORT).show()
            startNavigationService()
        } else {
            Toast.makeText(this, "Permissions required for GPS & Bluetooth", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        configureWebView()
        checkPermissions()
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setGeolocationEnabled(true)
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        webView.webViewClient = WebViewClient()

        // Loads the controller UI directly from bundled local assets (100% offline)
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun checkPermissions() {
        val missing = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        } else {
            startNavigationService()
        }
    }

    private fun startNavigationService() {
        val serviceIntent = Intent(this, NavigationForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        BluetoothManager.sendCommand('S', "APP_EXIT")
        BluetoothManager.closeConnection()
    }
}
`,
  activityMainLayout: `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0A0A0C">

    <WebView
        android:id="@+id/webView"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
`,
  readme: `# Automatic Delivery Robot Controller - Android Studio Project

This project generates the standalone Android APK (\`.apk\`) for mounting your smartphone on the Arduino delivery robot.

## Build APK Steps:
1. **Open in Android Studio**:
   - File -> Open -> Select this project folder.
2. **Build Debug APK**:
   - Menu: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**
   - Or from terminal:
     \`\`\`bash
     ./gradlew assembleDebug
     \`\`\`
3. **Locate APK File**:
   - File will be generated at: \`app/build/outputs/apk/debug/app-debug.apk\`
4. **Install on Phone**:
   - Transfer \`app-debug.apk\` to your Android device and tap to install!
`
};

export async function generateAndroidStudioZip(): Promise<Blob> {
  const zip = new JSZip();

  // Root build files
  zip.file('README.md', ANDROID_STUDIO_PROJECT_FILES.readme);
  zip.file('build.gradle', ANDROID_STUDIO_PROJECT_FILES.rootBuildGradle);
  zip.file('settings.gradle', ANDROID_STUDIO_PROJECT_FILES.settingsGradle);
  zip.file('gradlew.bat', ANDROID_STUDIO_PROJECT_FILES.gradlewBat);
  zip.file('gradlew', ANDROID_STUDIO_PROJECT_FILES.gradlewSh);

  // Gradle wrapper folder
  const gradleFolder = zip.folder('gradle');
  if (gradleFolder) {
    const wrapperFolder = gradleFolder.folder('wrapper');
    if (wrapperFolder) {
      wrapperFolder.file('gradle-wrapper.properties', ANDROID_STUDIO_PROJECT_FILES.gradleWrapperProperties);
    }
  }

  // App module
  const app = zip.folder('app');
  if (app) {
    app.file('build.gradle', ANDROID_STUDIO_PROJECT_FILES.appBuildGradle);
    app.file('proguard-rules.pro', '# Proguard rules\n');

    // Src Main
    const srcMain = app.folder('src/main');
    if (srcMain) {
      srcMain.file('AndroidManifest.xml', ANDROID_KOTLIN_FILES.manifest);

      // Layout
      const resLayout = srcMain.folder('res/layout');
      if (resLayout) {
        resLayout.file('activity_main.xml', ANDROID_STUDIO_PROJECT_FILES.activityMainLayout);
      }

      // Kotlin source files
      const kotlinPackage = srcMain.folder('java/com/robotics/deliverycontroller');
      if (kotlinPackage) {
        kotlinPackage.file('MainActivity.kt', ANDROID_STUDIO_PROJECT_FILES.mainActivity);
        
        const btFolder = kotlinPackage.folder('bluetooth');
        if (btFolder) {
          btFolder.file('BluetoothManager.kt', ANDROID_KOTLIN_FILES.bluetoothManager);
        }

        const svcFolder = kotlinPackage.folder('services');
        if (svcFolder) {
          svcFolder.file('NavigationForegroundService.kt', ANDROID_KOTLIN_FILES.navigationService);
        }

        const utilsFolder = kotlinPackage.folder('utils');
        if (utilsFolder) {
          utilsFolder.file('GeoMath.kt', ANDROID_KOTLIN_FILES.haversineCalc);
        }
      }
    }
  }

  // Also include Arduino sketch
  const arduino = zip.folder('arduino_firmware');
  if (arduino) {
    arduino.file('delivery_robot.ino', ARDUINO_UNO_FIRMWARE_SKETCH);
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
