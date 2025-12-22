// screens/DeviceConfig.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Device as BLEDevice } from "react-native-ble-plx";
import manager from "../app/ble/bleManager";
import AppConstants from "../app/utlis/AppConstants";
import { showToastFail, showToastSuccess } from "../app/utlis/ToastConfig";
import GlobalLoader from "../components/GlobalLoader";
import { useLoading } from "../hooks/useLoading";

// BLE UUIDs for Configuration
const CONFIG_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CONFIG_READ_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a1"; // Read characteristic
const CONFIG_WRITE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a2"; // Write characteristic

interface DeviceConfig {
  // Measurement Settings
  measurementInterval: number; // in minutes (1-60)
  tofEnabled: boolean;
  
  // Communication Settings
  dataUploadInterval: number; // in minutes (5-1440)
  serverUrl: string;
  apn: string;
  
  // Power Management
  sleepMode: boolean;
  batteryThreshold: number; // percentage (10-50)
  
  // Image Capture
  imageCaptureEnabled: boolean;
  imageQuality: number; // 1-100
  imageInterval: number; // in hours (1-24)
  
  // Alert Settings
  alertsEnabled: boolean;
  alertThreshold: number; // distance in cm
  
  // Device Info (Read-only)
  firmwareVersion?: string;
  batteryLevel?: number;
  signalStrength?: number;
}

const DeviceConfig: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deviceId?: string;
    deviceName?: string;
  }>();

  const { isLoading, loadingMessage, withLoader, showLoader, hideLoader } =
    useLoading();

  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<DeviceConfig>({
    measurementInterval: 15,
    tofEnabled: true,
    dataUploadInterval: 30,
    serverUrl: "https://ctm.sensz.ai/bo",
    apn: "internet",
    sleepMode: true,
    batteryThreshold: 20,
    imageCaptureEnabled: true,
    imageQuality: 80,
    imageInterval: 6,
    alertsEnabled: true,
    alertThreshold: 50,
  });

  useEffect(() => {
    connectAndReadConfig();

    return () => {
      if (device) {
        manager
          .cancelDeviceConnection(device.id)
          .catch((e) => console.log("Disconnect error", e));
      }
    };
  }, []);

  const connectAndReadConfig = async () => {
    if (!params.deviceId) return;

    await withLoader(async () => {
      try {
        // Connect to device
        const connectedDevice = await manager.connectToDevice(
          params.deviceId!,
          { timeout: 10000 }
        );
        setDevice(connectedDevice);
        setIsConnected(true);

        // Discover services
        await connectedDevice.discoverAllServicesAndCharacteristics();

        // Read configuration
        await readConfiguration(connectedDevice);
      } catch (error: any) {
        console.error("Connection error:", error);
        Alert.alert(
          "Connection Error",
          error.message || "Failed to connect to device"
        );
        setIsConnected(false);
      }
    }, "Connecting and reading configuration...");
  };

  const readConfiguration = async (device: BLEDevice) => {
    try {
      const characteristic = await device.readCharacteristicForService(
        CONFIG_SERVICE_UUID,
        CONFIG_READ_CHAR_UUID
      );

      if (characteristic.value) {
        const rawData = Buffer.from(characteristic.value, "base64").toString(
          "utf-8"
        );
        const parsedConfig = JSON.parse(rawData);
        setConfig({ ...config, ...parsedConfig });
        showToastSuccess({
          message: "Configuration loaded successfully",
          visibilityTime: 2000,
          position: "bottom",
        });
      }
    } catch (error: any) {
      console.error("Read error:", error);
      showToastFail({
        message: "Failed to read configuration. Using defaults.",
        visibilityTime: 3000,
        position: "bottom",
      });
    }
  };

  const writeConfiguration = async () => {
    if (!device || !isConnected) {
      Alert.alert("Error", "Device not connected");
      return;
    }

    await withLoader(async () => {
      try {
        const configJson = JSON.stringify(config);
        const base64Data = Buffer.from(configJson).toString("base64");

        await device.writeCharacteristicWithResponseForService(
          CONFIG_SERVICE_UUID,
          CONFIG_WRITE_CHAR_UUID,
          base64Data
        );

        setHasUnsavedChanges(false);
        showToastSuccess({
          message: "Configuration saved successfully",
          visibilityTime: 2000,
          position: "bottom",
        });
      } catch (error: any) {
        console.error("Write error:", error);
        showToastFail({
          message: "Failed to write configuration",
          visibilityTime: 3000,
          position: "bottom",
        });
      }
    }, "Saving configuration...");
  };

  const updateConfig = (key: keyof DeviceConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          { text: "Discard", style: "destructive", onPress: () => router.back() },
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: async () => {
            await writeConfiguration();
            router.back();
          }},
        ]
      );
    } else {
      router.back();
    }
  };

  // UI Components
  const ConfigSection = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const ConfigRow = ({ label, children }: any) => (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      {children}
    </View>
  );

  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />
      
      <View style={styles.container}>
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? "#22c55e" : "#ef4444" },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? "Connected" : "Disconnected"}
            </Text>
          </View>
          <Text style={styles.deviceName}>
            {params.deviceName || "Unknown Device"}
          </Text>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Measurement Settings */}
          <ConfigSection title="📏 Measurement Settings">
            <ConfigRow label="Measurement Interval (min)">
              <TextInput
                style={styles.input}
                value={config.measurementInterval.toString()}
                onChangeText={(text) =>
                  updateConfig("measurementInterval", parseInt(text) || 15)
                }
                keyboardType="numeric"
                placeholder="1-60"
              />
            </ConfigRow>
            <ConfigRow label="ToF Sensor Enabled">
              <Switch
                value={config.tofEnabled}
                onValueChange={(val) => updateConfig("tofEnabled", val)}
                trackColor={{ false: "#cbd5e1", true: "#22c55e" }}
              />
            </ConfigRow>
          </ConfigSection>

          {/* Communication Settings */}
          <ConfigSection title="📡 Communication Settings">
            <ConfigRow label="Upload Interval (min)">
              <TextInput
                style={styles.input}
                value={config.dataUploadInterval.toString()}
                onChangeText={(text) =>
                  updateConfig("dataUploadInterval", parseInt(text) || 30)
                }
                keyboardType="numeric"
                placeholder="5-1440"
              />
            </ConfigRow>
            <ConfigRow label="Server URL">
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={config.serverUrl}
                onChangeText={(text) => updateConfig("serverUrl", text)}
                placeholder="https://..."
                autoCapitalize="none"
              />
            </ConfigRow>
            <ConfigRow label="APN">
              <TextInput
                style={styles.input}
                value={config.apn}
                onChangeText={(text) => updateConfig("apn", text)}
                placeholder="internet"
                autoCapitalize="none"
              />
            </ConfigRow>
          </ConfigSection>

          {/* Power Management */}
          <ConfigSection title="🔋 Power Management">
            <ConfigRow label="Sleep Mode">
              <Switch
                value={config.sleepMode}
                onValueChange={(val) => updateConfig("sleepMode", val)}
                trackColor={{ false: "#cbd5e1", true: "#22c55e" }}
              />
            </ConfigRow>
            <ConfigRow label="Battery Alert (%)">
              <TextInput
                style={styles.input}
                value={config.batteryThreshold.toString()}
                onChangeText={(text) =>
                  updateConfig("batteryThreshold", parseInt(text) || 20)
                }
                keyboardType="numeric"
                placeholder="10-50"
              />
            </ConfigRow>
          </ConfigSection>

          {/* Image Capture */}
          <ConfigSection title="📷 Image Capture">
            <ConfigRow label="Image Capture">
              <Switch
                value={config.imageCaptureEnabled}
                onValueChange={(val) =>
                  updateConfig("imageCaptureEnabled", val)
                }
                trackColor={{ false: "#cbd5e1", true: "#22c55e" }}
              />
            </ConfigRow>
            <ConfigRow label="Image Quality (%)">
              <TextInput
                style={styles.input}
                value={config.imageQuality.toString()}
                onChangeText={(text) =>
                  updateConfig("imageQuality", parseInt(text) || 80)
                }
                keyboardType="numeric"
                placeholder="1-100"
              />
            </ConfigRow>
            <ConfigRow label="Capture Interval (hours)">
              <TextInput
                style={styles.input}
                value={config.imageInterval.toString()}
                onChangeText={(text) =>
                  updateConfig("imageInterval", parseInt(text) || 6)
                }
                keyboardType="numeric"
                placeholder="1-24"
              />
            </ConfigRow>
          </ConfigSection>

          {/* Alert Settings */}
          <ConfigSection title="🔔 Alert Settings">
            <ConfigRow label="Alerts Enabled">
              <Switch
                value={config.alertsEnabled}
                onValueChange={(val) => updateConfig("alertsEnabled", val)}
                trackColor={{ false: "#cbd5e1", true: "#22c55e" }}
              />
            </ConfigRow>
            <ConfigRow label="Alert Threshold (cm)">
              <TextInput
                style={styles.input}
                value={config.alertThreshold.toString()}
                onChangeText={(text) =>
                  updateConfig("alertThreshold", parseInt(text) || 50)
                }
                keyboardType="numeric"
                placeholder="Distance in cm"
              />
            </ConfigRow>
          </ConfigSection>

          {/* Device Info (Read-only) */}
          {config.firmwareVersion && (
            <ConfigSection title="ℹ️ Device Information">
              {config.firmwareVersion && (
                <ConfigRow label="Firmware Version">
                  <Text style={styles.readOnlyText}>
                    {config.firmwareVersion}
                  </Text>
                </ConfigRow>
              )}
              {config.batteryLevel !== undefined && (
                <ConfigRow label="Battery Level">
                  <Text style={styles.readOnlyText}>
                    {config.batteryLevel}%
                  </Text>
                </ConfigRow>
              )}
              {config.signalStrength !== undefined && (
                <ConfigRow label="Signal Strength">
                  <Text style={styles.readOnlyText}>
                    {config.signalStrength} dBm
                  </Text>
                </ConfigRow>
              )}
            </ConfigSection>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={() => {
              Alert.alert(
                "Reset Configuration",
                "Reset to device defaults?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => connectAndReadConfig(),
                  },
                ]
              );
            }}
          >
            <MaterialIcons name="refresh" size={20} color="#ef4444" />
            <Text style={[styles.buttonText, { color: "#ef4444" }]}>
              Reset
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              !hasUnsavedChanges && styles.saveButtonDisabled,
            ]}
            onPress={writeConfiguration}
            disabled={!hasUnsavedChanges || !isConnected}
          >
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Save to Device</Text>
          </TouchableOpacity>
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
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  deviceName: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
  },
  scrollView: {
    flex: 1,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  configLabel: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    minWidth: 100,
  },
  readOnlyText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  resetButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  saveButton: {
    backgroundColor: AppConstants.colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default DeviceConfig;