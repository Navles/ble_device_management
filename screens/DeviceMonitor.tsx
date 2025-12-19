// screens/DeviceMonitor.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Device as BLEDevice, BleManager } from 'react-native-ble-plx';
import AppConstants from '../app/utlis/AppConstants';
import { showToastFail, showToastSuccess } from '../app/utlis/ToastConfig';

interface DeviceNotification {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  isImportant: boolean;
}

interface DeviceStatus {
  tofValue?: number;
  modemSimStatus?: string;
  networkStatus?: string;
  internetStatus?: string;
  iccid?: string;
  signalStrength?: string;
  signalQuality?: number;
  lastDataSend?: string;
  lastImageCapture?: string;
  lastImageSend?: string;
  batteryLevel?: number;
  batteryVoltage?: number;
  isCharging?: boolean;
}

const DeviceMonitor: React.FC = () => {
  const params = useLocalSearchParams<{
    deviceId?: string;
    deviceName?: string;
  }>();

  const [manager] = useState<BleManager>(() => new BleManager());
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<DeviceNotification[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({});
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const notificationCountRef = useRef<number>(0);

  // BLE Service and Characteristic UUIDs (adjust these to match your device)
  const NOTIFICATION_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
  const NOTIFICATION_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
  const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
  const BATTERY_CHAR_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

  useEffect(() => {
    connectToDevice();

    return () => {
      disconnectDevice();
      manager.destroy();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && notifications.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [notifications, autoScroll]);

  const connectToDevice = async (): Promise<void> => {
    if (!params.deviceId) {
      showToastFail({
        message: 'No device ID provided',
        position: 'bottom',
      });
      return;
    }

    setIsConnecting(true);

    try {
      console.log('Connecting to device:', params.deviceId);
      
      const connectedDevice = await manager.connectToDevice(params.deviceId, {
        timeout: 15000,
      });

      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      setDevice(connectedDevice);
      setIsConnected(true);

      showToastSuccess({
        message: 'Connected successfully',
        position: 'bottom',
      });

      // Start monitoring
      await startMonitoring(connectedDevice);
    } catch (error: any) {
      console.error('Connection error:', error);
      showToastFail({
        message: `Connection failed: ${error.message}`,
        position: 'bottom',
      });
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async (): Promise<void> => {
    try {
      if (device && isConnected) {
        await manager.cancelDeviceConnection(device.id);
        setIsConnected(false);
        setDevice(null);
        setIsMonitoring(false);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const startMonitoring = async (connectedDevice: BLEDevice): Promise<void> => {
    setIsMonitoring(true);

    try {
      // Read battery level initially
      await readBatteryLevel(connectedDevice);

      // Subscribe to notification characteristic
      await subscribeToNotifications(connectedDevice);

      // Poll battery level every 30 seconds
      const batteryInterval = setInterval(async () => {
        if (isConnected) {
          await readBatteryLevel(connectedDevice);
        } else {
          clearInterval(batteryInterval);
        }
      }, 30000);

    } catch (error: any) {
      console.error('Monitoring error:', error);
      showToastFail({
        message: `Monitoring failed: ${error.message}`,
        position: 'bottom',
      });
    }
  };

  const subscribeToNotifications = async (connectedDevice: BLEDevice): Promise<void> => {
    try {
      // Subscribe to the notification characteristic
      connectedDevice.monitorCharacteristicForService(
        NOTIFICATION_SERVICE_UUID,
        NOTIFICATION_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Notification subscription error:', error);
            return;
          }

          if (characteristic?.value) {
            const notificationData = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            parseNotification(notificationData);
          }
        }
      );

      console.log('Subscribed to notifications');
    } catch (error) {
      console.error('Subscription error:', error);
      // If notification service not available, simulate with polling
      startPollingNotifications(connectedDevice);
    }
  };

  const startPollingNotifications = (connectedDevice: BLEDevice): void => {
    // Fallback: poll for notifications every 2 seconds
    const pollInterval = setInterval(async () => {
      if (isConnected) {
        try {
          const characteristic = await connectedDevice.readCharacteristicForService(
            NOTIFICATION_SERVICE_UUID,
            NOTIFICATION_CHAR_UUID
          );

          if (characteristic.value) {
            const notificationData = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            parseNotification(notificationData);
          }
        } catch (error) {
          // Ignore read errors during polling
        }
      } else {
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const parseNotification = (data: string): void => {
    console.log('Received notification:', data);

    const timestamp = new Date().toLocaleTimeString();
    let type = 'info';
    let isImportant = false;

    // Parse different notification types
    if (data.includes('ToF_value')) {
      const match = data.match(/ToF_value:\s*(\d+)/);
      if (match) {
        const tofValue = parseInt(match[1]);
        setDeviceStatus(prev => ({ ...prev, tofValue }));
        isImportant = true;
        type = 'measurement';
      }
    } else if (data.includes('MODEM & SIM OK')) {
      setDeviceStatus(prev => ({ ...prev, modemSimStatus: 'OK' }));
      isImportant = true;
      type = 'status';
    } else if (data.includes('Network Reg OK')) {
      setDeviceStatus(prev => ({ ...prev, networkStatus: 'OK' }));
      isImportant = true;
      type = 'status';
    } else if (data.includes('Conncted to Internet')) {
      setDeviceStatus(prev => ({ ...prev, internetStatus: 'Connected' }));
      isImportant = true;
      type = 'status';
    } else if (data.includes('ICCCID')) {
      const match = data.match(/ICCCID:\s*([A-F0-9]+)/);
      if (match) {
        setDeviceStatus(prev => ({ ...prev, iccid: match[1] }));
        isImportant = true;
        type = 'info';
      }
    } else if (data.includes('+CSQ:')) {
      const match = data.match(/\+CSQ:\s*(\d+),(\d+)/);
      if (match) {
        const signalValue = parseInt(match[1]);
        setDeviceStatus(prev => ({ 
          ...prev, 
          signalStrength: data,
          signalQuality: signalValue 
        }));
        isImportant = true;
        type = 'signal';
      }
    } else if (data.includes('Data send successfully')) {
      setDeviceStatus(prev => ({ ...prev, lastDataSend: timestamp }));
      isImportant = true;
      type = 'success';
    } else if (data.includes('Image Capture ok')) {
      setDeviceStatus(prev => ({ ...prev, lastImageCapture: timestamp }));
      isImportant = true;
      type = 'success';
    } else if (data.includes('Image send successfully')) {
      setDeviceStatus(prev => ({ ...prev, lastImageSend: timestamp }));
      isImportant = true;
      type = 'success';
    } else if (data.includes('+HTTPACTION:')) {
      isImportant = true;
      type = 'http';
    }

    // Add notification to list
    const notification: DeviceNotification = {
      id: `notification_${notificationCountRef.current++}`,
      timestamp,
      type,
      message: data,
      isImportant,
    };

    setNotifications(prev => [...prev, notification]);
  };

  const readBatteryLevel = async (connectedDevice: BLEDevice): Promise<void> => {
    try {
      const characteristic = await connectedDevice.readCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_CHAR_UUID
      );

      if (characteristic.value) {
        const batteryLevel = parseInt(characteristic.value, 10);
        setDeviceStatus(prev => ({ ...prev, batteryLevel }));
      }
    } catch (error) {
      console.log('Battery service not available');
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    if (device) {
      await readBatteryLevel(device);
    }
    setIsRefreshing(false);
  };

  const clearNotifications = (): void => {
    setNotifications([]);
    notificationCountRef.current = 0;
  };

  const getSignalQualityText = (quality?: number): string => {
    if (!quality) return 'Unknown';
    if (quality >= 20) return 'Excellent';
    if (quality >= 15) return 'Good';
    if (quality >= 10) return 'Fair';
    if (quality >= 5) return 'Poor';
    return 'Very Poor';
  };

  const getSignalQualityColor = (quality?: number): string => {
    if (!quality) return '#999';
    if (quality >= 20) return '#4CAF50';
    if (quality >= 15) return '#8BC34A';
    if (quality >= 10) return '#FFC107';
    if (quality >= 5) return '#FF9800';
    return '#F44336';
  };

  const getBatteryIcon = (level?: number): string => {
    if (!level) return 'battery-unknown';
    if (level >= 80) return 'battery-full';
    if (level >= 60) return 'battery-80';
    if (level >= 40) return 'battery-60';
    if (level >= 20) return 'battery-30';
    return 'battery-20';
  };

  const getBatteryColor = (level?: number): string => {
    if (!level) return '#999';
    if (level >= 60) return '#4CAF50';
    if (level >= 30) return '#FFC107';
    return '#F44336';
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'measurement': return 'straighten';
      case 'status': return 'check-circle';
      case 'signal': return 'signal-cellular-alt';
      case 'success': return 'check';
      case 'http': return 'cloud-upload';
      default: return 'info';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'measurement': return '#2196F3';
      case 'status': return '#4CAF50';
      case 'signal': return '#9C27B0';
      case 'success': return '#4CAF50';
      case 'http': return '#FF9800';
      default: return '#757575';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={AppConstants.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Monitor</Text>
        <TouchableOpacity onPress={clearNotifications}>
          <MaterialIcons name="delete-sweep" size={24} color={AppConstants.colors.white} />
        </TouchableOpacity>
      </View> */}

      {/* Device Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{params.deviceName || 'Device'}</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <Text style={styles.deviceId}>ID: {params.deviceId}</Text>
      </View>

      {/* Status Overview Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Overview</Text>

        <View style={styles.statusGrid}>
          {/* Battery */}
          <View style={styles.statusItem}>
            <MaterialIcons 
              name={getBatteryIcon(deviceStatus.batteryLevel)} 
              size={24} 
              color={getBatteryColor(deviceStatus.batteryLevel)} 
            />
            <Text style={styles.statusLabel}>Battery</Text>
            <Text style={styles.statusValue}>
              {deviceStatus.batteryLevel ? `${deviceStatus.batteryLevel}%` : 'N/A'}
            </Text>
          </View>

          {/* Signal */}
          <View style={styles.statusItem}>
            <MaterialIcons 
              name="signal-cellular-alt" 
              size={24} 
              color={getSignalQualityColor(deviceStatus.signalQuality)} 
            />
            <Text style={styles.statusLabel}>Signal</Text>
            <Text style={styles.statusValue}>
              {deviceStatus.signalQuality ? deviceStatus.signalQuality : 'N/A'}
            </Text>
            <Text style={styles.statusSubtext}>
              {getSignalQualityText(deviceStatus.signalQuality)}
            </Text>
          </View>

          {/* ToF Value */}
          <View style={styles.statusItem}>
            <MaterialIcons name="straighten" size={24} color="#2196F3" />
            <Text style={styles.statusLabel}>ToF</Text>
            <Text style={styles.statusValue}>
              {deviceStatus.tofValue || 'N/A'}
            </Text>
            {deviceStatus.tofValue && (
              <Text style={styles.statusSubtext}>mm</Text>
            )}
          </View>

          {/* Network */}
          <View style={styles.statusItem}>
            <MaterialIcons 
              name="network-check" 
              size={24} 
              color={deviceStatus.internetStatus ? '#4CAF50' : '#999'} 
            />
            <Text style={styles.statusLabel}>Network</Text>
            <Text style={styles.statusValue}>
              {deviceStatus.internetStatus || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Additional Info */}
        {deviceStatus.iccid && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ICCID:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {deviceStatus.iccid}
            </Text>
          </View>
        )}

        {deviceStatus.lastDataSend && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Data Send:</Text>
            <Text style={styles.infoValue}>{deviceStatus.lastDataSend}</Text>
          </View>
        )}

        {deviceStatus.lastImageCapture && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Image Capture:</Text>
            <Text style={styles.infoValue}>{deviceStatus.lastImageCapture}</Text>
          </View>
        )}
      </View>

      {/* Notifications */}
      <View style={[styles.card, styles.notificationsCard]}>
        <View style={styles.notificationsHeader}>
          <Text style={styles.cardTitle}>
            Notifications ({notifications.length})
          </Text>
          <TouchableOpacity onPress={() => setAutoScroll(!autoScroll)}>
            <MaterialIcons 
              name={autoScroll ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} 
              size={24} 
              color={AppConstants.colors.secondary} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.notificationsList}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <MaterialIcons name="notifications-none" size={48} color="#999" />
              <Text style={styles.emptyText}>
                {isMonitoring ? 'Waiting for notifications...' : 'No notifications yet'}
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <View 
                key={notification.id} 
                style={[
                  styles.notificationItem,
                  notification.isImportant && styles.importantNotification
                ]}
              >
                <MaterialIcons 
                  name={getNotificationIcon(notification.type)} 
                  size={20} 
                  color={getNotificationColor(notification.type)} 
                />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTime}>{notification.timestamp}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      {!isConnected && !isConnecting && (
        <TouchableOpacity
          style={styles.reconnectButton}
          onPress={connectToDevice}
        >
          <MaterialIcons name="refresh" size={24} color={AppConstants.colors.white} />
          <Text style={styles.reconnectButtonText}>Reconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppConstants.colors.background,
  },
  header: {
    backgroundColor: AppConstants.colors.error,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: AppConstants.colors.white,
  },
  card: {
    backgroundColor: AppConstants.colors.white,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppConstants.colors.secondary,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppConstants.colors.secondary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  statusItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppConstants.colors.secondary,
    marginTop: 4,
  },
  statusSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: AppConstants.colors.secondary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  notificationsCard: {
    flex: 1,
    marginBottom: 16,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationsList: {
    flex: 1,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  importantNotification: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: AppConstants.colors.secondary,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppConstants.colors.error,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  reconnectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppConstants.colors.white,
    marginLeft: 8,
  },
});

export default DeviceMonitor;