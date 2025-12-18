// BleScan.tsx
import { NavigationProp, useNavigation } from "@react-navigation/native";
// import { Overlay } from '@rneui/themed';
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
import { Device } from "../types/types";

const BleScan: React.FC = () => {
  const [manager] = useState<BleManager>(() => new BleManager());
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [clickEnabled, setClickEnabled] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null);
  const [bluetoothOffPopup, setBluetoothOffPopup] = useState<boolean>(false);

  const navigation = useNavigation<NavigationProp<any>>();
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
            "Please turn on Bluetooth to continue scanning.",
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

      if (device?.name && device.name.startsWith("DIC")) {
        setDevices((prevDevices) => {
          const updatedDevices = [...prevDevices, device].filter(
            (d, index, self) => index === self.findIndex((t) => t.id === d.id)
          );

          if (updatedDevices.length > 1 && !hasNavigated.current) {
            hasNavigated.current = true;
            setShowPopup(true);

            setTimeout(() => {
              setShowPopup(false);
              navigation.navigate("MainScreen");
            }, 5000);
          }

          return updatedDevices;
        });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      setTimeout(() => setClickEnabled(true), 5000);
    }, 10000);

    setTimeout(() => {
      setClickEnabled(true);
    }, 5000);
  };

  const handleDeviceClick = async (device: BLEDevice): Promise<void> => {
    try {
      const apiResponse = await DataServices.fetchDeviceUsingDeviceId(
        device.id
      );
      console.log("apiResponse", apiResponse);
      if (apiResponse.statusCode === 200) {
        const deviceData = apiResponse.response.body[0];
        setDeviceDetails(deviceData);
        setSelectedDevice(device);
        console.log("Selected Device:", device);
        router.push({
          pathname: "./DeviceDetails",
          params: {
            deviceName: deviceData?.deviceName || "Unnamed Device",
            deviceId: deviceData?.deviceId,
            latitude: "Fetching...",
            longitude: "Fetching...",
            deviceCode: deviceData?.deviceCode,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching device details:", error);
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
          2. Please ensure that Bluetooth is turned on in your device.
        </Text>
      </View>
      <Button
        title={isScanning ? "Scanning..." : "Start Scan"}
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
            <Text style={styles.popupText}>Multiple devices detected!</Text>
            <Text style={styles.popupText}>Please wait...</Text>
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
              { backgroundColor: clickEnabled ? "red" : "gray" },
            ]}
            onPress={() => clickEnabled && handleDeviceClick(item)}
            disabled={!clickEnabled}
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
  },
  noteText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
});

export default BleScan;
