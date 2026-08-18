import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Terminal,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  X,
  Share2,
  QrCode
} from 'lucide-react';
import { generateAndroidStudioZip, downloadBlob } from '../utils/apkGenerator';
import { ARDUINO_UNO_FIRMWARE_SKETCH } from '../data/arduinoCode';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);
  const [arduinoDownloaded, setArduinoDownloaded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'PWA' | 'PWABUILDER' | 'NATIVE_STUDIO'>('PWA');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const sharedAppUrl = 'https://ais-pre-rf7dkss3u35mchcnnhmfnk-9287584506.asia-east1.run.app';

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Copy URL or guide user
      navigator.clipboard.writeText(sharedAppUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleDownloadAndroidZip = async () => {
    try {
      setIsGeneratingZip(true);
      const zipBlob = await generateAndroidStudioZip();
      downloadBlob(zipBlob, 'DeliveryRobotController-AndroidStudio.zip');
      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 4000);
    } catch (err) {
      console.error('Failed to generate zip', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const handleDownloadArduinoIno = () => {
    const blob = new Blob([ARDUINO_UNO_FIRMWARE_SKETCH], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'delivery_robot_firmware.ino');
    setArduinoDownloaded(true);
    setTimeout(() => setArduinoDownloaded(false), 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const pwabuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(sharedAppUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#16181D] border border-[#2A2D35] rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2D35] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  Android APK & Installation Hub
                </h2>
                <span className="text-[10px] font-mono font-bold bg-green-500/20 border border-green-500/40 text-green-400 px-2 py-0.5 rounded-full">
                  READY
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                3 options to deploy & install this app on your robot-mounted Android smartphone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-[#1F2229] hover:bg-[#2A2D35] border border-[#2A2D35] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#0F1115] rounded-xl border border-[#2A2D35]">
          <button
            onClick={() => setActiveTab('PWA')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PWA'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1. Instant</span> WebAPK / PWA
          </button>

          <button
            onClick={() => setActiveTab('PWABUILDER')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PWABUILDER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2. Cloud</span> APK Builder
          </button>

          <button
            onClick={() => setActiveTab('NATIVE_STUDIO')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'NATIVE_STUDIO'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. Android</span> Studio (.ZIP)
          </button>
        </div>

        {/* TAB 1: Instant WebAPK / PWA Direct Install */}
        {activeTab === 'PWA' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-2xl p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  Recommended • Instant Android Native App
                </span>
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  No PC Required
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono leading-relaxed">
                When opened in Chrome on an Android phone, Android automatically packages and compiles the app into a <b>Native WebAPK</b> on the device with full-screen kiosk display, Web Bluetooth SPP, GPS Geolocation, and partial Wake Lock.
              </p>

              {/* URL & Copy Row */}
              <div className="flex items-center gap-2 bg-[#0F1115] border border-[#2A2D35] p-2.5 rounded-xl">
                <QrCode className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-xs font-mono text-gray-300 truncate flex-1 select-all">
                  {sharedAppUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 bg-[#1F2229] hover:bg-[#2A2D35] text-xs font-mono font-bold text-blue-400 border border-[#2A2D35] rounded-lg transition-colors shrink-0 flex items-center gap-1"
                >
                  {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Install / Add Button */}
              <button
                onClick={handleInstallPwa}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>{deferredPrompt ? '1-Tap Install WebAPK on Android' : 'Open Link on Android & Tap "Add to Home Screen"'}</span>
              </button>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-[#1F2229]/60 border border-[#2A2D35] p-3 rounded-xl flex flex-col gap-1">
                <span className="text-blue-400 font-bold">Step 1</span>
                <p className="text-gray-400 text-[11px]">Open the link in <b>Google Chrome</b> on your Android phone.</p>
              </div>
              <div className="bg-[#1F2229]/60 border border-[#2A2D35] p-3 rounded-xl flex flex-col gap-1">
                <span className="text-blue-400 font-bold">Step 2</span>
                <p className="text-gray-400 text-[11px]">Tap Chrome menu (<b>⋮</b>) and select <b>"Install app"</b> or <b>"Add to Home Screen"</b>.</p>
              </div>
              <div className="bg-[#1F2229]/60 border border-[#2A2D35] p-3 rounded-xl flex flex-col gap-1">
                <span className="text-blue-400 font-bold">Step 3</span>
                <p className="text-gray-400 text-[11px]">Android creates the standalone APK icon. Launch and mount on robot!</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PWABuilder / Bubblewrap 1-Click APK */}
        {activeTab === 'PWABUILDER' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-2xl p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  Cloud APK Packager (PWABuilder / Google Bubblewrap)
                </span>
                <span className="text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                  Standard .APK File
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono leading-relaxed">
                PWABuilder (powered by Microsoft & Google TWA) automatically wraps the app into a signed, sideloadable <b>.apk</b> or <b>.aab</b> file in under 60 seconds without needing to download Android Studio.
              </p>

              <div className="bg-[#0F1115] border border-[#2A2D35] p-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">Package ID:</span>
                  <span className="text-blue-400 font-bold">com.robotics.deliverycontroller</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">Target URL:</span>
                  <span className="text-gray-300 truncate max-w-[280px]">{sharedAppUrl}</span>
                </div>
              </div>

              <a
                href={pwabuilderUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open PWABuilder to Generate .APK (1-Click)</span>
              </a>
            </div>

            <div className="bg-[#0F1115] border border-[#2A2D35] p-3.5 rounded-xl text-xs font-mono text-gray-400 leading-relaxed">
              <span className="text-white font-bold block mb-1">How it works:</span>
              1. Click the button above to load the URL in PWABuilder.<br />
              2. Click <b>"Package for Android"</b>.<br />
              3. Download the generated <b>.apk</b> file and install it on your robot phone via USB or drive.
            </div>
          </div>
        )}

        {/* TAB 3: Native Android Studio Project (.ZIP) */}
        {activeTab === 'NATIVE_STUDIO' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-2xl p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  Full Kotlin Source & Android Studio Project (.ZIP)
                </span>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  100% Native Code
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono leading-relaxed">
                Download a fully structured, ready-to-compile Android Studio project containing <b>MainActivity.kt</b>, <b>BluetoothManager.kt (SPP RFCOMM)</b>, <b>NavigationForegroundService.kt</b>, and <b>build.gradle.kts</b>.
              </p>

              <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                <button
                  onClick={handleDownloadAndroidZip}
                  disabled={isGeneratingZip}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isGeneratingZip
                      ? 'Compiling ZIP Archive...'
                      : zipDownloaded
                      ? '✓ Project ZIP Downloaded!'
                      : 'Download Android Studio Project (.ZIP)'}
                  </span>
                </button>

                <button
                  onClick={handleDownloadArduinoIno}
                  className="px-4 py-3.5 rounded-xl bg-[#0F1115] hover:bg-[#2A2D35] text-green-400 border border-green-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
                  title="Download Arduino UNO firmware sketch (.ino)"
                >
                  <Cpu className="w-4 h-4" />
                  <span>{arduinoDownloaded ? '✓ .ino Downloaded' : 'Arduino .ino'}</span>
                </button>
              </div>
            </div>

            {/* Build Commands Box */}
            <div className="bg-[#0F1115] border border-[#2A2D35] rounded-xl p-3.5 flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Terminal Compilation Command:</span>
                </span>
                <span className="text-[10px] text-green-400">Outputs app-debug.apk</span>
              </div>
              <pre className="bg-[#16181D] border border-[#2A2D35] p-2.5 rounded-lg text-blue-400 select-all overflow-x-auto">
                ./gradlew assembleDebug
              </pre>
              <p className="text-[11px] text-gray-500 leading-normal">
                Generates <code className="text-gray-300">app/build/outputs/apk/debug/app-debug.apk</code> ready to sideload directly to any Android 8.0 - 14+ smartphone.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2A2D35] text-xs font-mono text-gray-500">
          <span>Target Architecture: ARM64 / x86_64 Android 8.0+</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1F2229] hover:bg-[#2A2D35] text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
