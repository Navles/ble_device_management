// screens/DeviceMonitor.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { Buffer } from "buffer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Device as BLEDevice } from "react-native-ble-plx";
import manager from "../app/ble/bleManager";
import { Theme } from "../constants/ThemeConstants";

global.Buffer = global.Buffer || Buffer;

const { width } = Dimensions.get("screen");

// -------------------- BLE UUIDs --------------------
const NOTIFICATION_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const NOTIFICATION_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ad";

// -------------------- Types --------------------
interface StepItem {
  label: string;
  isCompleted: boolean;
  value?: string | number;
  color?: string;
  icon?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
}

const DeviceMonitor: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deviceId?: string;
    deviceName?: string;
  }>();

  // BLE State
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Simplified 7 steps
  const [steps, setSteps] = useState<Record<string, StepItem>>({
    depthMeasure: {
      label: "Depth Measure",
      isCompleted: false,
      value: "",
      icon: "straighten",
    },
    modemSim: {
      label: "Modem & SIM",
      isCompleted: false,
      icon: "sim-card",
    },
    internet: {
      label: "Connected to Internet",
      isCompleted: false,
      icon: "wifi",
    },
    heartbeat: {
      label: "Heartbeat Sent",
      isCompleted: false,
      icon: "favorite",
    },
    imgCapture: {
      label: "Image Captured",
      isCompleted: false,
      icon: "camera",
    },
    imgSent: {
      label: "Image Sent",
      isCompleted: false,
      icon: "image",
    },
    sleep: {
      label: "Device Sleep",
      isCompleted: false,
      icon: "bedtime",
    },
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    connectToDevice();

    return () => {
      if (device) {
        manager
          .cancelDeviceConnection(device.id)
          .catch((e) => console.log("Disconnect error", e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showLogs) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [logs, showLogs]);

  // -------------------- Helpers --------------------
  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  };

  const updateStep = (key: string, updates: Partial<StepItem>) => {
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  };

  // -------------------- BLE Connection --------------------
  const connectToDevice = async () => {
    if (!params.deviceId) return;
    try {
      setIsConnecting(true);

      console.log(`🔵 Connecting to: ${params.deviceId}`);
      const connectedDevice = await manager.connectToDevice(params.deviceId, {
        timeout: 10000,
      });
      setDevice(connectedDevice);
      setIsConnected(true);
      addLog("Device connected successfully", "success");

      await connectedDevice.discoverAllServicesAndCharacteristics();
      addLog("Services discovered", "success");

      // Subscribe
      monitorNotifications(connectedDevice);
      addLog("Subscribed to notifications", "success");

      console.log("🟢 BLE Connected & Subscribed!");
    } catch (error: any) {
      console.error("Connection failed:", error);
      Alert.alert("Connection Error", error.message || "Failed to connect");
      setIsConnected(false);
      addLog(`Connection failed: ${error.message}`, "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const monitorNotifications = (device: BLEDevice) => {
    device.monitorCharacteristicForService(
      NOTIFICATION_SERVICE_UUID,
      NOTIFICATION_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("❌ Notification error:", error);
          addLog(`Notification error: ${error.message}`, "error");
          return;
        }

        if (characteristic?.value) {
          const rawData = Buffer.from(characteristic.value, "base64").toString(
            "utf-8"
          );
          parseLog(rawData);
        }
      }
    );
  };

  // -------------------- Parse BLE Logs --------------------
  const parseLog = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    const lower = clean.toLowerCase();
    let logType: LogEntry["type"] = "info";

    if (lower.includes("error") || lower.includes("fail")) {
      logType = "error";
    } else if (lower.includes("success") || lower.includes("ok")) {
      logType = "success";
    } else if (lower.includes("warning")) {
      logType = "warning";
    }

    addLog(clean, logType);

    // Parse for specific steps
    if (lower.includes("tof_value") || lower.includes("depth")) {
      const match = lower.match(/tof_value\D*(\d+)|depth\D*(\d+)/);
      if (match) {
        const value = match[1] || match[2];
        updateStep("depthMeasure", {
          isCompleted: true,
          value: `${value} mm`,
        });
      }
    }

    if (
      lower.includes("modem") &&
      (lower.includes("sim ok") || lower.includes("sim card"))
    ) {
      updateStep("modemSim", { isCompleted: true });
    }
    
    // Check for both "connected to internet" and "conncted to internet" (typo in logs)
    if (
      lower.includes("connected to internet") ||
      lower.includes("conncted to internet")
    ) {
      updateStep("internet", { isCompleted: true });
    }

    if (
      lower.includes("heartbeat") ||
      lower.includes("keepalive") ||
      lower.includes("data send")
    ) {
      updateStep("heartbeat", { isCompleted: true });
    }

    if (lower.includes("image capture") || lower.includes("img capture")) {
      updateStep("imgCapture", { isCompleted: true });
    }

    if (
      lower.includes("image send") ||
      lower.includes("image sent") ||
      lower.includes("img send")
    ) {
      updateStep("imgSent", { isCompleted: true });
    }

    if (lower.includes("sleep") || lower.includes("going to sleep")) {
      updateStep("sleep", { isCompleted: true });
    }
  };

  // Get completion stats
  const completedSteps = Object.values(steps).filter(
    (s) => s.isCompleted
  ).length;
  const totalSteps = Object.values(steps).length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // -------------------- UI Components --------------------
  const StepRow = ({ label, isCompleted, value, color, icon }: StepItem) => {
    const spinValue = useRef(new Animated.Value(0)).current;
    const iconScaleValue = useRef(new Animated.Value(0)).current;
    const checkScaleValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!isCompleted) {
        // Spinning animation for loader
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ).start();
      } else {
        // Scale animation for icon appearing on the left
        Animated.spring(iconScaleValue, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
        
        // Scale animation for checkmark on the right
        Animated.spring(checkScaleValue, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    }, [isCompleted]);

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isCompleted ? "#22c55e15" : "#f3f4f6",
              },
            ]}
          >
            {isCompleted ? (
              <Animated.View style={{ transform: [{ scale: iconScaleValue }] }}>
                <MaterialIcons 
                  name={icon as any} 
                  size={24} 
                  color="#22c55e" 
                />
              </Animated.View>
            ) : (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <ActivityIndicator size={20} color="#9ca3af" />
              </Animated.View>
            )}
          </View>
          <View style={styles.stepTextContainer}>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: isCompleted ? "#1f2937" : "#6b7280",
                  fontWeight: isCompleted ? "600" : "400",
                },
              ]}
            >
              {label}
            </Text>
            {value && (
              <Text style={[styles.stepValue, { color: color || "#3b82f6" }]}>
                {value}
              </Text>
            )}
          </View>
        </View>
        {isCompleted && (
          <Animated.View style={{ transform: [{ scale: checkScaleValue }] }}>
            <MaterialIcons name="check" size={24} color="#22c55e" />
          </Animated.View>
        )}
      </View>
    );
  };

  const getLogIcon = (type?: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return { name: "check-circle", color: "#10b981" };
      case "error":
        return { name: "error", color: "#ef4444" };
      case "warning":
        return { name: "warning", color: "#f59e0b" };
      default:
        return { name: "info", color: "#3b82f6" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Device Info Card */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceCardHeader}>
          <View style={styles.deviceIconCircle}>
            <MaterialIcons
              name="devices"
              size={24}
              color={Theme.colors.primary}
            />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {params.deviceName || "Unknown Device"}
            </Text>
            <Text style={styles.deviceId}>{params.deviceId}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isConnected
                  ? "#22c55e"
                  : isConnecting
                  ? "#f59e0b"
                  : "#ef4444",
              },
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {isConnecting
                ? "Connecting..."
                : isConnected
                ? "Connected"
                : "Disconnected"}
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <MaterialIcons name="timeline" size={16} color="#3b82f6" />
            <Text style={styles.progressText}>
              {completedSteps}/{totalSteps} ({progressPercentage}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Steps List */}
      <ScrollView
        style={styles.stepsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <MaterialIcons
            name="list-alt"
            size={20}
            color={Theme.colors.primary}
          />
          <Text style={styles.sectionTitle}>Device Progress</Text>
        </View>
        <View style={styles.card}>
          {Object.keys(steps).map((key, index) => (
            <View key={key}>
              <StepRow {...steps[key]} />
              {index < Object.keys(steps).length - 1 && (
                <View style={styles.stepDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Spacer for logs toggle button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Logs Toggle Button */}
      {/* <TouchableOpacity
        style={styles.logsToggleButton}
        onPress={() => setShowLogs(!showLogs)}
      >
        <MaterialIcons
          name={showLogs ? "expand-more" : "expand-less"}
          size={20}
          color="#ffffff"
        />
        <Text style={styles.logsToggleText}>
          {showLogs ? "Hide" : "Show"} Live Logs
        </Text>
        <View style={styles.logCountBadge}>
          <Text style={styles.logCountText}>{logs.length}</Text>
        </View>
      </TouchableOpacity> */}

      {/* Expandable Logs Window */}
      {/* {showLogs && (
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <View style={styles.logsHeaderLeft}>
              <MaterialIcons name="terminal" size={18} color="#10b981" />
              <Text style={styles.logsTitle}>Live Logs</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLogs([])}
              style={styles.clearButton}
            >
              <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.logsBox}
            showsVerticalScrollIndicator={false}
          >
            {logs.length === 0 ? (
              <View style={styles.emptyLogsContainer}>
                <MaterialIcons
                  name="hourglass-empty"
                  size={24}
                  color="#6b7280"
                />
                <Text style={styles.emptyLogs}>Waiting for data...</Text>
              </View>
            ) : (
              logs.map((log) => {
                const logIcon = getLogIcon(log.type);
                return (
                  <View key={log.id} style={styles.logEntry}>
                    <View style={styles.logHeader}>
                      <MaterialIcons
                        name={logIcon.name as any}
                        size={12}
                        color={logIcon.color}
                      />
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                    </View>
                    <Text style={[styles.logText, { color: logIcon.color }]}>
                      {log.message}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  deviceCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  deviceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  statusText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 12,
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  progressText: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 12,
  },
  stepsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 4,
  },
  stepLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  stepValue: {
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  logsToggleButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    gap: 8,
  },
  logsToggleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  logCountBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  logCountText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  logsContainer: {
    position: "absolute",
    bottom: 68,
    left: 16,
    right: 16,
    height: 240,
    backgroundColor: "#1f2937",
    borderRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logsTitle: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#374151",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },
  logsBox: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 10,
  },
  logEntry: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  logText: {
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 16,
  },
  logTime: {
    color: "#9ca3af",
    fontSize: 10,
    fontFamily: "monospace",
  },
  emptyLogsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyLogs: {
    color: "#6b7280",
    fontSize: 13,
    fontStyle: "italic",
  },
});

export default DeviceMonitor;