import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Device as BLEDevice, BleManager } from "react-native-ble-plx";

import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import { Device } from "../types/types";

/* ✅ SINGLE GLOBAL BLE MANAGER (DO NOT DESTROY) */
const BLE_MANAGER = new BleManager();

const BleScan: React.FC = () => {
  const manager = BLE_MANAGER;

  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [clickEnabled, setClickEnabled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [bluetoothOffPopup, setBluetoothOffPopup] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null);

  const hasNavigated = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ✅ ANDROID PERMISSIONS */
  const requestBlePermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  /* ✅ BLUETOOTH STATE LISTENER */
  useEffect(() => {
    requestBlePermissions();

    const subscription = manager.onStateChange((state) => {
      console.log("Bluetooth state:", state);

      if (state === "PoweredOn") {
        setBluetoothOffPopup(false);
      }

      if (state === "PoweredOff") {
        setBluetoothOffPopup(true);
        Alert.alert(
          "Bluetooth is Off",
          AppConstants.messages.error.bluetoothOff
        );
      }
    }, true);

    return () => {
      subscription.remove();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, []);

  /* ✅ ENSURE BLUETOOTH BEFORE SCAN */
  const ensureBluetoothAndScan = () => {
    const sub = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        sub.remove();
        startScanInternal();
      }
    }, true);
  };

  /* ✅ MAIN SCAN LOGIC */
  const startScanInternal = () => {
    if (isScanning) return;

    setDevices([]);
    setIsScanning(true);
    setClickEnabled(false);
    setShowPopup(false);
    hasNavigated.current = false;

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        setIsScanning(false);
        return;
      }

      if (
        device?.name &&
        device.name.startsWith(AppConstants.bluetooth.devicePrefix)
      ) {
        setDevices((prev) => {
          if (prev.some((d) => d.id === device.id)) return prev;
          return [...prev, device];
        });
      }
    });

    /* ✅ AUTO STOP SCAN */
    scanTimeoutRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      setClickEnabled(true);
    }, AppConstants.timeouts.scanDuration);
  };

  /* ✅ DEVICE CLICK */
  const handleDeviceClick = async (device: BLEDevice) => {
    if (!clickEnabled) return;

    try {
      const apiResponse = await DataServices.fetchDeviceUsingDeviceId(
        device.id
      );

      if (apiResponse.statusCode === 200) {
        const deviceData = apiResponse.response.body[0];

        setSelectedDevice(device);
        setDeviceDetails(deviceData);

        router.push({
          pathname: "./DeviceDetails",
          params: {
            deviceName: deviceData?.deviceName ?? "Unnamed Device",
            deviceId: deviceData?.deviceId,
            latitude: AppConstants.messages.info.fetchingLocation,
            longitude: AppConstants.messages.info.fetchingLocation,
            deviceCode: deviceData?.deviceCode,
          },
        });
      }
    } catch (error) {
      console.error("Device fetch error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Scanner</Text>

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>Note:</Text>
        <Text style={styles.noteText}>
          1. To wake up the device, gently rub a magnet along its side.
        </Text>
        <Text style={styles.noteText}>
          2. Please ensure Bluetooth is turned ON.
        </Text>
      </View>

      <Button
        title={isScanning ? "Scanning..." : "Start Scan"}
        onPress={ensureBluetoothAndScan}
        disabled={isScanning}
      />

      {/* ✅ MULTIPLE DEVICE POPUP */}
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
            style={[
              styles.deviceItem,
              {
                backgroundColor: clickEnabled
                  ? AppConstants.colors.error
                  : "gray",
              },
            ]}
            disabled={!clickEnabled}
            onPress={() => handleDeviceClick(item)}
          >
            <Text style={styles.deviceText}>
              {item.name || "Unnamed Device"}
            </Text>
            <Text style={styles.deviceText}>ID: {item.id}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "black",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deviceItem: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
  },
  deviceText: {
    color: "white",
  },
  overlay: {
    width: "80%",
    height: "30%",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  popupText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "black",
  },
  noteContainer: {
    marginTop: 10, // Add some spacing between the title and the note
  },
  noteText: {
    fontSize: 14,
    color: "#555", // Use a softer color for the note
    marginBottom: 5, // Add spacing between lines
  },
});

export default BleScan;
