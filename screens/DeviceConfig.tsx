// screens/DeviceConfig.tsx (CORRECT VERSION - Based on Your Firmware)
import { MaterialIcons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
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

// ==================== YOUR ACTUAL UUIDs FROM FIRMWARE ====================
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const CHARACTERISTICS = {
  UNKNOWN: "beb5483e-36e1-4688-b7f5-ea07361b26a8",        // Not sure what this is
  APN: "beb5483e-36e1-4688-b7f5-ea07361b26a9",            // APN setting
  NUMBER: "beb5483e-36e1-4688-b7f5-ea07361b26aa",         // Phone number
  API_IMAGE: "beb5483e-36e1-4688-b7f5-ea07361b26ab",      // Image upload API
  API_KEEPALIVE: "beb5483e-36e1-4688-b7f5-ea07361b26ac",  // Keepalive API
  LOG: "beb5483e-36e1-4688-b7f5-ea07361b26ad",            // Logs (NOTIFY only)
};

// ==================== Configuration State ====================
interface DeviceConfig {
  apn: string;
  phoneNumber: string;
  imageApiUrl: string;
  keepaliveApiUrl: string;
  unknownValue: string;
}

const DEFAULT_CONFIG: DeviceConfig = {
  apn: "internet",
  phoneNumber: "",
  imageApiUrl: "https://ctm.sensz.ai/bo/upload",
  keepaliveApiUrl: "https://ctm.sensz.ai/bo/keepalive",
  unknownValue: "",
};

const DeviceConfig: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deviceId?: string;
    deviceName?: string;
  }>();

  const { isLoading, loadingMessage, withLoader } = useLoading();

  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [config, setConfig] = useState<DeviceConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<DeviceConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    connectAndReadConfig();

    return () => {
      if (device) {
        manager
          .cancelDeviceConnection(device.id)
          .catch((e) => console.log("Disconnect error:", e));
      }
    };
  }, []);

  // ==================== Helper: Read String from Characteristic ====================
  const readCharacteristic = async (
    device: BLEDevice,
    charUuid: string,
    label: string
  ): Promise<string> => {
    try {
      console.log(`📖 Reading ${label}...`);
      const result = await device.readCharacteristicForService(
        SERVICE_UUID,
        charUuid
      );

      if (result.value) {
        const value = Buffer.from(result.value, "base64").toString("utf-8");
        console.log(`✅ ${label}: "${value}"`);
        return value;
      }
      console.log(`⚠️ ${label}: empty`);
      return "";
    } catch (error: any) {
      console.error(`❌ Read ${label} failed:`, error.message);
      return "";
    }
  };

  // ==================== Helper: Write String to Characteristic ====================
  const writeCharacteristic = async (
    device: BLEDevice,
    charUuid: string,
    value: string,
    label: string
  ): Promise<boolean> => {
    try {
      console.log(`✍️ Writing ${label}: "${value}"`);
      const base64Data = Buffer.from(value, "utf-8").toString("base64");
      
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        charUuid,
        base64Data
      );
      
      console.log(`✅ ${label} written successfully`);
      return true;
    } catch (error: any) {
      console.error(`❌ Write ${label} failed:`, error.message);
      
      // Try without response as fallback
      try {
        console.log(`🔄 Retrying ${label} without response...`);
        const base64Data = Buffer.from(value, "utf-8").toString("base64");
        await device.writeCharacteristicWithoutResponseForService(
          SERVICE_UUID,
          charUuid,
          base64Data
        );
        console.log(`✅ ${label} written (without response)`);
        return true;
      } catch (retryError: any) {
        console.error(`❌ Retry failed:`, retryError.message);
        return false;
      }
    }
  };

  // ==================== Connect & Read All Config ====================
  const connectAndReadConfig = async () => {
    if (!params.deviceId) {
      Alert.alert("Error", "No device ID provided");
      return;
    }

    await withLoader(async () => {
      try {
        console.log("🔵 Connecting to device:", params.deviceId);
        
        // Connect
        const connectedDevice = await manager.connectToDevice(
          params.deviceId!,
          { timeout: 15000 }
        );
        
        console.log("✅ Device connected");
        setDevice(connectedDevice);
        setIsConnected(true);

        // Discover services
        console.log("🔍 Discovering services...");
        await connectedDevice.discoverAllServicesAndCharacteristics();
        console.log("✅ Services discovered");

        // Read all characteristics
        const newConfig: DeviceConfig = {
          apn: await readCharacteristic(
            connectedDevice,
            CHARACTERISTICS.APN,
            "APN"
          ),
          phoneNumber: await readCharacteristic(
            connectedDevice,
            CHARACTERISTICS.NUMBER,
            "Phone Number"
          ),
          imageApiUrl: await readCharacteristic(
            connectedDevice,
            CHARACTERISTICS.API_IMAGE,
            "Image API"
          ),
          keepaliveApiUrl: await readCharacteristic(
            connectedDevice,
            CHARACTERISTICS.API_KEEPALIVE,
            "Keepalive API"
          ),
          unknownValue: await readCharacteristic(
            connectedDevice,
            CHARACTERISTICS.UNKNOWN,
            "Unknown"
          ),
        };

        // Use defaults if empty
        const finalConfig = {
          apn: newConfig.apn || DEFAULT_CONFIG.apn,
          phoneNumber: newConfig.phoneNumber || DEFAULT_CONFIG.phoneNumber,
          imageApiUrl: newConfig.imageApiUrl || DEFAULT_CONFIG.imageApiUrl,
          keepaliveApiUrl: newConfig.keepaliveApiUrl || DEFAULT_CONFIG.keepaliveApiUrl,
          unknownValue: newConfig.unknownValue || DEFAULT_CONFIG.unknownValue,
        };

        setConfig(finalConfig);
        setOriginalConfig(finalConfig);
        setHasUnsavedChanges(false);

        showToastSuccess({
          message: "Configuration loaded from device",
          visibilityTime: 2000,
          position: "bottom",
        });

      } catch (error: any) {
        console.error("❌ Connection error:", error);
        setIsConnected(false);
        
        Alert.alert(
          "Connection Error",
          error.message?.includes("timeout")
            ? "Connection timeout. Make sure device is awake (use magnet)."
            : "Failed to connect to device: " + error.message
        );
      }
    }, "Connecting and reading configuration...");
  };

  // ==================== Write All Config ====================
  const writeConfiguration = async () => {
    if (!device || !isConnected) {
      Alert.alert("Error", "Device not connected");
      return;
    }

    await withLoader(async () => {
      const results: { [key: string]: boolean } = {};

      // Only write changed values
      if (config.apn !== originalConfig.apn) {
        results.APN = await writeCharacteristic(
          device,
          CHARACTERISTICS.APN,
          config.apn,
          "APN"
        );
      }

      if (config.phoneNumber !== originalConfig.phoneNumber) {
        results.PhoneNumber = await writeCharacteristic(
          device,
          CHARACTERISTICS.NUMBER,
          config.phoneNumber,
          "Phone Number"
        );
      }

      if (config.imageApiUrl !== originalConfig.imageApiUrl) {
        results.ImageAPI = await writeCharacteristic(
          device,
          CHARACTERISTICS.API_IMAGE,
          config.imageApiUrl,
          "Image API"
        );
      }

      if (config.keepaliveApiUrl !== originalConfig.keepaliveApiUrl) {
        results.KeepaliveAPI = await writeCharacteristic(
          device,
          CHARACTERISTICS.API_KEEPALIVE,
          config.keepaliveApiUrl,
          "Keepalive API"
        );
      }

      if (config.unknownValue !== originalConfig.unknownValue) {
        results.Unknown = await writeCharacteristic(
          device,
          CHARACTERISTICS.UNKNOWN,
          config.unknownValue,
          "Unknown Value"
        );
      }

      // Check results
      const allSuccess = Object.values(results).every((r) => r === true);
      const someSuccess = Object.values(results).some((r) => r === true);

      if (allSuccess) {
        setOriginalConfig(config);
        setHasUnsavedChanges(false);
        showToastSuccess({
          message: "All settings saved to device",
          visibilityTime: 2000,
          position: "bottom",
        });
      } else if (someSuccess) {
        setHasUnsavedChanges(false);
        showToastSuccess({
          message: "Some settings saved. Check logs for details.",
          visibilityTime: 3000,
          position: "bottom",
        });
      } else {
        showToastFail({
          message: "Failed to save settings",
          visibilityTime: 3000,
          position: "bottom",
        });
      }
    }, "Saving configuration...");
  };

  // ==================== Update Config ====================
  const updateConfig = (key: keyof DeviceConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // ==================== Navigation ====================
  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          { text: "Discard", style: "destructive", onPress: () => router.back() },
          { text: "Cancel", style: "cancel" },
          { 
            text: "Save", 
            onPress: async () => {
              await writeConfiguration();
              router.back();
            }
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // ==================== UI Components ====================
  const ConfigSection = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const ConfigField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    multiline = false 
  }: any) => (
    <View style={styles.configField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        editable={isConnected}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize="none"
      />
    </View>
  );

  // ==================== Render ====================
  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />
      
      <View style={styles.container}>
        {/* Status Bar */}
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

        {/* Help Banner */}
        <View style={styles.helpBanner}>
          <MaterialIcons name="info-outline" size={20} color="#3b82f6" />
          <Text style={styles.helpText}>
            Configure your device's network settings and API endpoints
          </Text>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Network Settings */}
          <ConfigSection title="📡 Network Settings">
            <ConfigField
              label="APN (Access Point Name)"
              value={config.apn}
              onChangeText={(text: string) => updateConfig("apn", text)}
              placeholder="e.g., internet, airtelgprs.com"
            />
            
            <ConfigField
              label="Phone Number"
              value={config.phoneNumber}
              onChangeText={(text: string) => updateConfig("phoneNumber", text)}
              placeholder="e.g., +1234567890"
            />
          </ConfigSection>

          {/* API Settings */}
          <ConfigSection title="🌐 API Endpoints">
            <ConfigField
              label="Image Upload API"
              value={config.imageApiUrl}
              onChangeText={(text: string) => updateConfig("imageApiUrl", text)}
              placeholder="https://your-server.com/upload"
              multiline
            />
            
            <ConfigField
              label="Keepalive API"
              value={config.keepaliveApiUrl}
              onChangeText={(text: string) => updateConfig("keepaliveApiUrl", text)}
              placeholder="https://your-server.com/keepalive"
              multiline
            />
          </ConfigSection>

          {/* Advanced (Unknown characteristic) */}
          <ConfigSection title="⚙️ Advanced">
            <ConfigField
              label="Device Parameter"
              value={config.unknownValue}
              onChangeText={(text: string) => updateConfig("unknownValue", text)}
              placeholder="Leave empty if unsure"
            />
            <Text style={styles.helperText}>
              This parameter's function is not documented. Modify only if instructed.
            </Text>
          </ConfigSection>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <MaterialIcons name="lightbulb-outline" size={20} color="#f59e0b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Configuration</Text>
              <Text style={styles.infoText}>
                • APN: Required for cellular data connection{'\n'}
                • Phone Number: For SMS functionality (if supported){'\n'}
                • API URLs: Where device sends images and keepalive pings{'\n'}
                • Changes take effect after saving
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={() => {
              Alert.alert(
                "Reset Configuration",
                "Re-read configuration from device?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: connectAndReadConfig,
                  },
                ]
              );
            }}
            disabled={!isConnected}
          >
            <MaterialIcons name="refresh" size={20} color="#ef4444" />
            <Text style={[styles.buttonText, { color: "#ef4444" }]}>
              Reload
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (!hasUnsavedChanges || !isConnected) && styles.saveButtonDisabled,
            ]}
            onPress={writeConfiguration}
            disabled={!hasUnsavedChanges || !isConnected}
          >
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>
              {hasUnsavedChanges ? "Save to Device" : "No Changes"}
            </Text>
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
  helpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
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
  configField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: -8,
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#78350f",
    lineHeight: 18,
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