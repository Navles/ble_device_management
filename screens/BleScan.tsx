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
import { Device as BLEDevice, BleManager } from "react-native-ble-plx";
import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import { Device } from "../types/types";

const BleScan: React.FC = () => {
  const [manager] = useState<BleManager>(() => new BleManager());
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [clickEnabled, setClickEnabled] = useState<boolean>(true); // Changed to true by default
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null);
  const [bluetoothOffPopup, setBluetoothOffPopup] = useState<boolean>(false);

  const hasNavigated = useRef<boolean>(false);

  useEffect(() => {
    hasNavigated.current = false;
    setShowPopup(false);
  }, []);

  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        console.log("Bluetooth is powered on");
        setBluetoothOffPopup(false);
      } else {
        console.log(`Bluetooth state: ${state}`);
        if (state === "PoweredOff") {
          setBluetoothOffPopup(true);
          Alert.alert(
            "Bluetooth is Off",
            AppConstants.messages.error.bluetoothOff,
            [
              {
                text: "OK",
                onPress: () => {
                  setBluetoothOffPopup(false);
                },
              },
            ]
          );
        }
      }
    }, true);

    return () => {
      subscription.remove();
      manager.destroy();
    };
  }, [manager]);

  const startScan = (): void => {
    console.log("Starting BLE scan...");
    setDevices([]);
    setIsScanning(true);
    setClickEnabled(false); // Disable during scan
    setShowPopup(false);
    hasNavigated.current = false;

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        setIsScanning(false);
        setClickEnabled(true); // Re-enable on error
        return;
      }

      if (
        device?.name &&
        device.name.startsWith(AppConstants.bluetooth.devicePrefix)
      ) {
        console.log("Found DIC device:", device.name, device.id);

        setDevices((prevDevices) => {
          const updatedDevices = [...prevDevices, device].filter(
            (d, index, self) => index === self.findIndex((t) => t.id === d.id)
          );

          if (updatedDevices.length > 1 && !hasNavigated.current) {
            hasNavigated.current = true;
            setShowPopup(true);

            setTimeout(() => {
              setShowPopup(false);
              router.back();
            }, AppConstants.timeouts.popupDuration);
          }

          return updatedDevices;
        });
      }
    });

    // Stop scan after 10 seconds
    setTimeout(() => {
      console.log("Stopping scan...");
      manager.stopDeviceScan();
      setIsScanning(false);
      setClickEnabled(true); // Enable clicks after scan
    }, AppConstants.timeouts.scanDuration);
  };

  const handleDeviceClick = async (device: BLEDevice): Promise<void> => {
    console.log("Device clicked:", device.name, device.id);

    if (!clickEnabled) {
      console.log("Click ignored - not enabled yet");
      return;
    }

    setClickEnabled(false); // Prevent multiple taps

    // ⚠️ We'll proceed WITHOUT waiting for API success — always show 4 options
    // But we still *try* to fetch details (for Details screen), with fallbacks

    let deviceData: Device | null = null;

    try {
      console.log("Fetching device details from API...");
      const apiResponse = await DataServices.fetchDeviceUsingDeviceId(
        device.id
      );
      console.log("API Response:", apiResponse);

      if (
        apiResponse.statusCode === 200 &&
        apiResponse.response?.body?.length > 0
      ) {
        deviceData = apiResponse.response.body[0];
        setDeviceDetails(deviceData);
      } else {
        console.log("Device not found in DB; using fallback data");
      }
    } catch (error: any) {
      console.error("Error fetching device details (non-fatal):", error);
      // Proceed anyway — don't block UI
    }

    // ✅ Always show 4 options
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
        // {
        //   text: "Diagnostics",
        //   onPress: () => {
        //     router.push({
        //       pathname: "/DeviceDiagnostics",
        //       params: {
        //         deviceId: device.id,
        //         deviceName: device.name || "Unknown Device",
        //       },
        //     });
        //     setClickEnabled(true);
        //   },
        // },
        {
          text: "Details",
          onPress: () => {
            // Use fetched data if available, else fallback
            const name =
              deviceData?.deviceName || device.name || "Unnamed Device";
            const id = deviceData?.deviceId || device.id;
            const code = deviceData?.deviceCode || device.id || "N/A";

            router.push({
              pathname: "/DeviceDetails",
              params: {
                deviceName: name,
                deviceId: id,
                deviceCode: code,
                latitude: AppConstants.messages.info.fetchingLocation,
                longitude: AppConstants.messages.info.fetchingLocation,
              },
            });
            setClickEnabled(true);
          },
        },
      ],
      {
        onDismiss: () => setClickEnabled(true),
      }
    );
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
          2. Please ensure that Bluetooth is turned on in your device.
        </Text>
      </View>

      <Button
        title={isScanning ? AppConstants.messages.info.scanning : "Start Scan"}
        onPress={startScan}
        disabled={isScanning}
      />

      <Modal
        visible={showPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
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

      {devices.length > 0 && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Found {devices.length} device{devices.length > 1 ? "s" : ""}
          </Text>
          {!isScanning && (
            <Text style={styles.infoSubtext}>Tap a device to view options</Text>
          )}
        </View>
      )}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.deviceItem,
              {
                backgroundColor:
                  clickEnabled && !isScanning
                    ? AppConstants.colors.error
                    : "#999",
                opacity: clickEnabled && !isScanning ? 1 : 0.6,
              },
            ]}
            onPress={() => {
              console.log("Device tapped:", item.name);
              if (clickEnabled && !isScanning) {
                handleDeviceClick(item);
              } else {
                console.log("Click ignored - scanning or disabled");
              }
            }}
            disabled={!clickEnabled || isScanning}
          >
            <View style={styles.deviceContent}>
              <Text style={styles.deviceText}>
                {item.name || "Unnamed Device"}
              </Text>
              <Text style={styles.deviceIdText}>ID: {item.id}</Text>
              {item.rssi && (
                <Text style={styles.deviceRssiText}>
                  Signal: {item.rssi} dBm
                </Text>
              )}
            </View>
            {clickEnabled && !isScanning && (
              <Text style={styles.tapHintText}>Tap to select</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isScanning
                ? "Scanning for devices..."
                : 'No devices found. Press "Start Scan" to begin.'}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: AppConstants.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "black",
  },
  deviceItem: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceContent: {
    flex: 1,
  },
  deviceText: {
    color: AppConstants.colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  deviceIdText: {
    color: AppConstants.colors.white,
    fontSize: 12,
    opacity: 0.9,
  },
  deviceRssiText: {
    color: AppConstants.colors.white,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  tapHintText: {
    color: AppConstants.colors.white,
    fontSize: 12,
    fontStyle: "italic",
  },
  overlay: {
    width: "80%",
    height: "30%",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: AppConstants.colors.white,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "black",
  },
  noteContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  infoContainer: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppConstants.colors.secondary,
    textAlign: "center",
  },
  infoSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  emptyContainer: {
    marginTop: 50,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default BleScan;
