// screens/BleScan.tsx
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Device as BLEDevice } from "react-native-ble-plx";

import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import manager from "../ble/bleManager"; // ✅ SHARED MANAGER
import { Device } from "../types/types";

const BleScan: React.FC = () => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [clickEnabled, setClickEnabled] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [bluetoothOffPopup, setBluetoothOffPopup] = useState(false);

  const hasNavigated = useRef(false);
  const scanTimeoutRef = useRef<number | null>(null);

  /* -------------------- Bluetooth State Listener -------------------- */
  useEffect(() => {
    hasNavigated.current = false;

    const subscription = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        setBluetoothOffPopup(false);
      } else if (state === "PoweredOff") {
        setBluetoothOffPopup(true);
        Alert.alert(
          "Bluetooth is Off",
          AppConstants.messages.error.bluetoothOff
        );
      }
    }, true);

    return () => {
      subscription.remove();
      stopScanSafely();
    };
  }, []);

  /* -------------------- Safe Scan Stop -------------------- */
  const stopScanSafely = () => {
    try {
      manager.stopDeviceScan();
    } catch { }
    setIsScanning(false);
    setClickEnabled(true);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  /* -------------------- Start Scan -------------------- */
  const startScan = () => {
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

  /* -------------------- UI -------------------- */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Scanner</Text>

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          1. To wake up the device, gently rub a magnet along its side.
        </Text>
        <Text style={styles.noteText}>
          2. Please ensure Bluetooth is turned ON.
        </Text>
      </View>

      <Button
        title={isScanning ? "Scanning..." : "Start Scan"}
        onPress={startScan}
        disabled={isScanning}
      />

      <Modal visible={showPopup} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.overlay}>
            <Text style={styles.popupText}>
              {AppConstants.messages.info.multipleDevicesDetected}
            </Text>
            <Text style={styles.popupText}>
              {AppConstants.messages.info.pleaseWait}
            </Text>
          </View>
        </View>
      </Modal>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => handleDeviceClick(item)}
            disabled={!clickEnabled}
          >
            <Text style={styles.deviceText}>
              {item.name || "Unnamed Device"}
            </Text>
            <Text style={styles.deviceIdText}>ID: {item.id}</Text>
            {item.rssi && (
              <Text style={styles.deviceRssiText}>Signal: {item.rssi} dBm</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isScanning
              ? "Scanning for devices..."
              : 'Press "Start Scan" to search devices'}
          </Text>
        }
      />
    </View>
  );
};

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: AppConstants.colors.background },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: AppConstants.colors.secondary },
  deviceItem: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    backgroundColor: AppConstants.colors.highlight,
  },
  deviceText: { color: AppConstants.colors.white, fontSize: 16, fontWeight: "bold" },
  deviceIdText: { color: AppConstants.colors.white, fontSize: 12 },
  deviceRssiText: { color: AppConstants.colors.white, fontSize: 12 },
  noteContainer: { marginBottom: 15 },
  noteText: { fontSize: 14, color: AppConstants.colors.textSecondary },
  emptyText: { textAlign: "center", marginTop: 40, color: AppConstants.colors.textSecondary },
  overlay: {
    padding: 20,
    backgroundColor: AppConstants.colors.white,
    borderRadius: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupText: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
});

export default BleScan;
