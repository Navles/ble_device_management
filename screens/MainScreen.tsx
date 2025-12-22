// screens/MainScreen.tsx (Updated with 3 options)
import AppConstants from "@/app/utlis/AppConstants";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Device as BLEDevice } from "react-native-ble-plx";
import { Text } from "react-native-paper";
import { useDispatch } from "react-redux";
import DataServices from "../api/Services";
import manager from "../ble/bleManager";
import GlobalLoader from "../components/GlobalLoader";
import { useLoading } from "../hooks/useLoading";

const logo = require("../assets/images/appLogo.png");
const { width, height } = Dimensions.get("screen");

const MainScreen: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { isLoading, loadingMessage, withLoader, showLoader, hideLoader } =
    useLoading();

  const [locationGranted, setLocationGranted] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async (): Promise<void> => {
    await withLoader(async () => {
      try {
        await dispatch.LoginModel.handleEmptyUserDetails();
        await requestLocationPermission();
        await loginUser();
        await checkBluetoothStatus();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    }, "Initializing...");
  };

  const requestLocationPermission = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        await getUserCurrentLocation();
      } else {
        setLocationGranted(false);
      }
    } catch (error) {
      console.error("Location permission error:", error);
    }
  };

  const getUserCurrentLocation = async (): Promise<void> => {
    try {
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const loginUser = async (): Promise<void> => {
    try {
      const password = "Alai1234$";
      const finalPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const loginData = {
        emailId: "tamilselvan@alai-labs.com",
        password: finalPassword,
      };

      const response = await DataServices.login(loginData);
      await dispatch.LoginModel.handleApiToken(
        response.response.body.accessToken
      );
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const checkBluetoothStatus = async (): Promise<void> => {
    const state = await manager.state();
    setBluetoothEnabled(state === "PoweredOn");

    manager.onStateChange((state) => {
      setBluetoothEnabled(state === "PoweredOn");
    }, true);
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
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

  const ensureBluetoothEnabled = async (): Promise<boolean> => {
    const state = await manager.state();
    if (state === "PoweredOn") return true;

    if (Platform.OS === "android") {
      try {
        await manager.enable();
        return true;
      } catch (error) {
        Alert.alert(
          "Bluetooth Required",
          "Please enable Bluetooth to scan for devices."
        );
        return false;
      }
    }

    Alert.alert(
      "Bluetooth Required",
      "Please enable Bluetooth in your settings."
    );
    return false;
  };

  const scanAndNavigate = async (destination: "monitor" | "configure") => {
    // Check permissions
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Bluetooth and location permissions are needed to scan devices."
      );
      return;
    }

    // Check Bluetooth
    const btEnabled = await ensureBluetoothEnabled();
    if (!btEnabled) return;

    // Check location services (Android)
    if (Platform.OS === "android") {
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        Alert.alert(
          "Location Services Required",
          "Please enable location services to scan for Bluetooth devices."
        );
        return;
      }
    }

    showLoader("Scanning for devices...");
    setIsScanning(true);

    const foundDevices: BLEDevice[] = [];
    let scanTimeout: NodeJS.Timeout;

    try {
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          hideLoader();
          setIsScanning(false);
          Alert.alert("Scan Error", error.message || "Failed to scan devices");
          return;
        }

        if (
          device?.name &&
          device.name.startsWith(AppConstants.bluetooth.devicePrefix)
        ) {
          // Check if device already found
          if (!foundDevices.find((d) => d.id === device.id)) {
            foundDevices.push(device);
          }
        }
      });

      scanTimeout = setTimeout(() => {
        manager.stopDeviceScan();
        hideLoader();
        setIsScanning(false);

        if (foundDevices.length === 0) {
          Alert.alert(
            "No Devices Found",
            "No devices were detected. Please make sure the device is powered on and nearby.",
            [{ text: "OK" }]
          );
        } else if (foundDevices.length === 1) {
          // Single device found - navigate directly
          navigateToDestination(foundDevices[0], destination);
        } else {
          // Multiple devices - show selection
          showDeviceSelection(foundDevices, destination);
        }
      }, AppConstants.timeouts.scanDuration);
    } catch (error: any) {
      hideLoader();
      setIsScanning(false);
      Alert.alert("Error", error.message || "Failed to scan");
    }
  };

  const navigateToDestination = (
    device: BLEDevice,
    destination: "monitor" | "configure"
  ) => {
    const pathname = destination === "monitor" ? "/DeviceMonitor" : "/DeviceConfig";
    
    router.push({
      pathname,
      params: {
        deviceId: device.id,
        deviceName: device.name || "Unknown Device",
      },
    });
  };

  const showDeviceSelection = (
    devices: BLEDevice[],
    destination: "monitor" | "configure"
  ) => {
    const buttons = devices.map((device) => ({
      text: `${device.name || "Unknown"} (${device.id.substring(0, 8)}...)`,
      onPress: () => navigateToDestination(device, destination),
    }));

    buttons.push({
      text: "Cancel",
      onPress: () => {},
    });

    Alert.alert(
      "Multiple Devices Found",
      `Found ${devices.length} devices. Select one:`,
      buttons
    );
  };

  const handleNavigateToRecords = (): void => {
    router.push("./DeviceRecords");
  };

  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />
      <View style={styles.container}>
        <StatusBar
          backgroundColor={AppConstants.colors.primary}
          barStyle="light-content"
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerOverlay} />
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.welcomeText}>Welcome to Device Manager</Text>
            <Text style={styles.subtitleText}>
              Monitor and manage your IoT devices
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Feature Cards */}
          <View style={styles.cardsContainer}>
            {/* Device Records Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={handleNavigateToRecords}
              activeOpacity={0.8}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: "#3b82f620" }]}
              >
                <MaterialIcons name="assessment" color="#3b82f6" size={32} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Device Records</Text>
                <Text style={styles.cardDescription}>
                  View history and analytics
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                color={AppConstants.colors.textSecondary}
                size={24}
              />
            </TouchableOpacity>

            {/* Monitor Device Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => scanAndNavigate("monitor")}
              activeOpacity={0.8}
              disabled={isScanning}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: "#10b98120" }]}
              >
                {isScanning ? (
                  <ActivityIndicator size={32} color="#10b981" />
                ) : (
                  <MaterialIcons name="monitor" color="#10b981" size={32} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Monitor Device</Text>
                <Text style={styles.cardDescription}>
                  Scan and monitor live data
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                color={AppConstants.colors.textSecondary}
                size={24}
              />
            </TouchableOpacity>

            {/* Configure Device Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => scanAndNavigate("configure")}
              activeOpacity={0.8}
              disabled={isScanning}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: "#f59e0b20" }]}
              >
                {isScanning ? (
                  <ActivityIndicator size={32} color="#f59e0b" />
                ) : (
                  <MaterialIcons name="settings" color="#f59e0b" size={32} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Configure Device</Text>
                <Text style={styles.cardDescription}>
                  Scan and update settings
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                color={AppConstants.colors.textSecondary}
                size={24}
              />
            </TouchableOpacity>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <MaterialIcons
                name={locationGranted ? "location-on" : "location-off"}
                color={locationGranted ? "#10b981" : "#ef4444"}
                size={20}
              />
              <Text style={styles.statusText}>
                Location {locationGranted ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <MaterialIcons
                name={bluetoothEnabled ? "bluetooth" : "bluetooth-disabled"}
                color={bluetoothEnabled ? "#10b981" : "#ef4444"}
                size={20}
              />
              <Text style={styles.statusText}>
                Bluetooth {bluetoothEnabled ? "On" : "Off"}
              </Text>
            </View>
          </View>

          {/* Info Banner */}
          {isScanning && (
            <View style={styles.scanningBanner}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.scanningText}>
                Scanning for nearby devices...
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Copyright © {new Date().getFullYear()} Alai Labs
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    height: height * 0.35,
    backgroundColor: AppConstants.colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: (width * 0.35) / 2,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppConstants.colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: AppConstants.colors.textSecondary,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 30,
    paddingHorizontal: 20,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statusText: {
    fontSize: 12,
    color: AppConstants.colors.textPrimary,
    fontWeight: "600",
  },
  scanningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  scanningText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 12,
    color: AppConstants.colors.textSecondary,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: AppConstants.colors.textSecondary,
    opacity: 0.7,
  },
});

export default MainScreen;