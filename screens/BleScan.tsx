import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Device as BLEDevice } from "react-native-ble-plx";

import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import manager from "../ble/bleManager";
import { Device } from "../types/types";

const { width } = Dimensions.get("screen");

const BleScan: React.FC = () => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [clickEnabled, setClickEnabled] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const hasNavigated = useRef(false);
  const scanTimeoutRef = useRef<number | null>(undefined);

  /* -------------------- Permissions & Bluetooth Flow -------------------- */
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          result["android.permission.BLUETOOTH_SCAN"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.BLUETOOTH_CONNECT"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        return (
          result["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          result["android.permission.ACCESS_COARSE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  };

  const ensureBluetoothEnabled = async () => {
    const state = await manager.state();
    if (state === "PoweredOn") return true;

    if (Platform.OS === "android") {
      try {
        await manager.enable();
        return true;
      } catch (error) {
        console.log("User refused to enable Bluetooth");
        return false;
      }
    }

    // iOS or failure
    Alert.alert(
      "Bluetooth Required",
      "Please enable Bluetooth in your settings."
    );
    return false;
  };

  /* -------------------- Check Location Services -------------------- */
  const checkLocationServices = async () => {
    if (Platform.OS === "android") {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          try {
            // Mimic MainScreen behavior to trigger system dialog
            await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            return true;
          } catch (e) {
            Alert.alert(
              "Location Services Required",
              "Location services must be enabled to scan for Bluetooth devices.",
              [{ text: "OK" }]
            );
            return false;
          }
        }
      } catch (e) {
        console.log("Error checking location services", e);
      }
    }
    return true;
  };

  const initBluetooth = async () => {
    setIsInitializing(true);
    hasNavigated.current = false;

    // 1. Request Runtime Permissions
    const permissionsGranted = await requestPermissions();
    setPermissionsGranted(permissionsGranted);

    if (!permissionsGranted) {
      Alert.alert(
        "Permission Denied",
        "Bluetooth and Location permissions are required."
      );
      setIsInitializing(false);
      return;
    }

    // 2. Enable Bluetooth (System Dialog)
    const btEnabled = await ensureBluetoothEnabled();
    setBluetoothEnabled(btEnabled);

    // 3. Check Location Services (GPS)
    if (Platform.OS === "android" && btEnabled) {
      await checkLocationServices();
    }

    setIsInitializing(false);
  };

  useEffect(() => {
    initBluetooth();

    const subscription = manager.onStateChange((state) => {
      const isBtOn = state === "PoweredOn";
      setBluetoothEnabled(isBtOn);

      if (!isBtOn && !isInitializing) {
        Alert.alert(
          "Bluetooth Turned Off",
          "Please turn on Bluetooth to continue scanning.",
          [{ text: "OK" }]
        );
        stopScanSafely();
      }
    }, true);

    return () => {
      subscription.remove();
      stopScanSafely();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- Safe Scan Stop -------------------- */
  const stopScanSafely = () => {
    try {
      manager.stopDeviceScan();
    } catch {}
    setIsScanning(false);
    setClickEnabled(true);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = undefined;
    }
  };

  /* -------------------- Start Scan -------------------- */
  const startScan = async () => {
    // 1. Re-check permissions
    const perm = await requestPermissions();
    if (!perm) {
      Alert.alert("Permissions Missing", "Please grant permissions to scan.");
      return;
    }

    // 2. Re-check Bluetooth
    const bt = await ensureBluetoothEnabled();
    if (!bt) return;

    // 3. Re-check Location (Android)
    if (Platform.OS === "android") {
      await checkLocationServices();
    }

    if (isScanning) return;

    setDevices([]);
    setIsScanning(true);
    setClickEnabled(false);
    setShowPopup(false);
    hasNavigated.current = false;

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        stopScanSafely();
        Alert.alert("Scan Error", error.message || "Failed to scan devices");
        return;
      }

      if (
        device?.name &&
        device.name.startsWith(AppConstants.bluetooth.devicePrefix)
      ) {
        setDevices((prev) => {
          const updated = [...prev, device].filter(
            (d, i, self) => i === self.findIndex((t) => t.id === d.id)
          );

          if (updated.length > 1 && !hasNavigated.current) {
            hasNavigated.current = true;
            setShowPopup(true);

            setTimeout(() => {
              setShowPopup(false);
              router.back();
            }, AppConstants.timeouts.popupDuration);
          }

          return updated;
        });
      }
    });

    scanTimeoutRef.current = setTimeout(() => {
      stopScanSafely();
    }, AppConstants.timeouts.scanDuration);
  };

  /* -------------------- Device Click -------------------- */
  const handleDeviceClick = async (device: BLEDevice) => {
    if (!clickEnabled || isScanning) return;

    stopScanSafely();
    setClickEnabled(false);

    let deviceData: Device | null = null;

    try {
      const apiResponse = await DataServices.fetchDeviceUsingDeviceId(
        device.id
      );
      if (
        apiResponse.statusCode === 200 &&
        apiResponse.response?.body?.length > 0
      ) {
        deviceData = apiResponse.response.body[0];
      }
    } catch (e) {
      console.log("Device not found in DB, continuing...");
    }

    Alert.alert(
      "Device Options",
      `Device: ${device.name || "Unknown"}\nID: ${device.id}`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setClickEnabled(true),
        },
        {
          text: "Monitor",
          onPress: () => {
            router.push({
              pathname: "/DeviceMonitor",
              params: {
                deviceId: device.id,
                deviceName: device.name || "Unknown Device",
              },
            });
            setClickEnabled(true);
          },
        },
        {
          text: "Details",
          onPress: () => {
            router.push({
              pathname: "/DeviceDetails",
              params: {
                deviceName:
                  deviceData?.deviceName || device.name || "Unnamed Device",
                deviceId: deviceData?.deviceId || device.id,
                deviceCode: deviceData?.deviceCode || device.id,
                latitude: AppConstants.messages.info.fetchingLocation,
                longitude: AppConstants.messages.info.fetchingLocation,
              },
            });
            setClickEnabled(true);
          },
        },
      ],
      { onDismiss: () => setClickEnabled(true) }
    );
  };

  /* -------------------- Signal Strength Color -------------------- */
  const getSignalColor = (rssi?: number) => {
    if (!rssi) return "#9ca3af";
    if (rssi >= -60) return "#22c55e";
    if (rssi >= -70) return "#84cc16";
    if (rssi >= -80) return "#facc15";
    if (rssi >= -90) return "#fb923c";
    return "#ef4444";
  };

  const getSignalBars = (rssi?: number) => {
    if (!rssi) return 0;
    if (rssi >= -60) return 4;
    if (rssi >= -70) return 3;
    if (rssi >= -80) return 2;
    if (rssi >= -90) return 1;
    return 0;
  };

  /* -------------------- UI -------------------- */
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppConstants.colors.primary} />
        <Text style={styles.loadingText}>Initializing Bluetooth...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <MaterialIcons
              name="bluetooth"
              size={20}
              color={bluetoothEnabled ? "#22c55e" : "#ef4444"}
            />
            <Text
              style={[
                styles.statusText,
                { color: bluetoothEnabled ? "#22c55e" : "#ef4444" },
              ]}
            >
              Bluetooth {bluetoothEnabled ? "ON" : "OFF"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <MaterialIcons
              name={permissionsGranted ? "check-circle" : "cancel"}
              size={20}
              color={permissionsGranted ? "#22c55e" : "#ef4444"}
            />
            <Text
              style={[
                styles.statusText,
                { color: permissionsGranted ? "#22c55e" : "#ef4444" },
              ]}
            >
              Permissions {permissionsGranted ? "Granted" : "Required"}
            </Text>
          </View>
        </View>
      </View>

      {/* Instructions Card */}
      <View style={styles.instructionsCard}>
        <View style={styles.instructionHeader}>
          <MaterialIcons name="info" size={20} color="#3b82f6" />
          <Text style={styles.instructionTitle}>How to Connect</Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Gently rub a magnet along the device's side to wake it up
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Ensure Bluetooth is turned ON
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            Tap "Start Scan" button below
          </Text>
        </View>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={[
          styles.scanButton,
          (isScanning || !bluetoothEnabled || !permissionsGranted) &&
            styles.scanButtonDisabled,
        ]}
        onPress={startScan}
        disabled={isScanning || !bluetoothEnabled || !permissionsGranted}
      >
        {isScanning ? (
          <>
            <ActivityIndicator color="#ffffff" size="small" />
            <Text style={styles.scanButtonText}>Scanning...</Text>
          </>
        ) : (
          <>
            <MaterialIcons name="search" size={24} color="#ffffff" />
            <Text style={styles.scanButtonText}>Start Scan</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Devices Count */}
      {devices.length > 0 && (
        <View style={styles.devicesHeader}>
          <MaterialIcons name="devices" size={20} color="#3b82f6" />
          <Text style={styles.devicesCount}>
            {devices.length} device{devices.length > 1 ? "s" : ""} found
          </Text>
        </View>
      )}

      {/* Multiple Devices Popup */}
      <Modal visible={showPopup} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.popupCard}>
            <MaterialIcons name="info" size={48} color="#3b82f6" />
            <Text style={styles.popupTitle}>Multiple Devices Detected</Text>
            <Text style={styles.popupText}>
              {AppConstants.messages.info.multipleDevicesDetected}
            </Text>
            <Text style={styles.popupSubtext}>
              {AppConstants.messages.info.pleaseWait}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Devices List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const signalColor = getSignalColor();
          const signalBars = getSignalBars();

          return (
            <TouchableOpacity
              style={styles.deviceCard}
              onPress={() => handleDeviceClick(item)}
              disabled={!clickEnabled}
              activeOpacity={0.7}
            >
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIconContainer}>
                  <MaterialIcons
                    name="bluetooth-connected"
                    size={28}
                    color="#3b82f6"
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {item.name || "Unnamed Device"}
                  </Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
              </View>

              {item.rssi && (
                <View style={styles.signalContainer}>
                  <View style={styles.signalBars}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={[
                          styles.signalBar,
                          {
                            height: bar * 4,
                            backgroundColor:
                              bar <= signalBars ? signalColor : "#e5e7eb",
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.signalText, { color: signalColor }]}>
                    {item.rssi} dBm
                  </Text>
                </View>
              )}

              <MaterialIcons
                name="chevron-right"
                size={24}
                color="#9ca3af"
                style={styles.chevron}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={isScanning ? "search" : "bluetooth-searching"}
              size={64}
              color="#d1d5db"
            />
            <Text style={styles.emptyTitle}>
              {isScanning ? "Scanning..." : "No Devices Found"}
            </Text>
            <Text style={styles.emptyText}>
              {isScanning
                ? "Looking for nearby devices"
                : bluetoothEnabled && permissionsGranted
                ? 'Press "Start Scan" to search for devices'
                : "Please enable Bluetooth and grant permissions"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppConstants.colors.primary,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  statusCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  instructionsCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppConstants.colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  scanButtonDisabled: {
    backgroundColor: "#9ca3af",
    elevation: 0,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  devicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  devicesCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 11,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  signalContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: 4,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  signalText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 32,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  popupText: {
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 8,
  },
  popupSubtext: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default BleScan;
