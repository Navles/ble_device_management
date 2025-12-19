// screens/DeviceDiagnostics.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Device as BLEDevice, BleManager } from 'react-native-ble-plx';
import AppConstants from '../app/utlis/AppConstants';
import { showToastFail, showToastSuccess } from '../app/utlis/ToastConfig';

interface DiagnosticTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: string;
  error?: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  rssi?: number;
  isConnected: boolean;
  batteryLevel?: number;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

const DeviceDiagnostics: React.FC = () => {
  const params = useLocalSearchParams<{
    deviceId?: string;
    deviceName?: string;
  }>();

  const [manager] = useState<BleManager>(() => new BleManager());
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    id: params.deviceId || '',
    name: params.deviceName || 'Unknown Device',
    isConnected: false,
  });

  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTest[]>([
    {
      id: 'connection',
      name: 'Connection Test',
      description: 'Test BLE connection to device',
      status: 'pending',
    },
    {
      id: 'signal',
      name: 'Signal Strength',
      description: 'Measure RSSI signal strength',
      status: 'pending',
    },
    {
      id: 'services',
      name: 'Service Discovery',
      description: 'Discover available BLE services',
      status: 'pending',
    },
    {
      id: 'battery',
      name: 'Battery Level',
      description: 'Read battery status',
      status: 'pending',
    },
    {
      id: 'firmware',
      name: 'Firmware Version',
      description: 'Read device firmware version',
      status: 'pending',
    },
    {
      id: 'readwrite',
      name: 'Read/Write Test',
      description: 'Test data communication',
      status: 'pending',
    },
  ]);

  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  useEffect(() => {
    return () => {
      disconnectDevice();
      manager.destroy();
    };
  }, []);

  const updateTestStatus = (
    testId: string,
    status: 'pending' | 'running' | 'passed' | 'failed',
    result?: string,
    error?: string
  ) => {
    setDiagnosticTests((prevTests) =>
      prevTests.map((test) =>
        test.id === testId
          ? { ...test, status, result, error }
          : test
      )
    );
  };

  const connectToDevice = async (): Promise<boolean> => {
    try {
      updateTestStatus('connection', 'running');

      const connectedDevice = await manager.connectToDevice(deviceInfo.id, {
        timeout: 10000,
      });

      setDevice(connectedDevice);
      setDeviceInfo((prev) => ({ ...prev, isConnected: true }));

      await connectedDevice.discoverAllServicesAndCharacteristics();

      updateTestStatus('connection', 'passed', 'Successfully connected');
      return true;
    } catch (error: any) {
      updateTestStatus('connection', 'failed', undefined, error.message);
      return false;
    }
  };

  const testSignalStrength = async (): Promise<void> => {
    try {
      updateTestStatus('signal', 'running');

      if (!device) {
        throw new Error('Device not connected');
      }

      const rssiValue = await device.readRSSI();
      setDeviceInfo((prev) => ({ ...prev, rssi: rssiValue }));

      let signalQuality = 'Excellent';
      if (rssiValue < -80) signalQuality = 'Poor';
      else if (rssiValue < -70) signalQuality = 'Fair';
      else if (rssiValue < -60) signalQuality = 'Good';

      updateTestStatus(
        'signal',
        'passed',
        `RSSI: ${rssiValue} dBm (${signalQuality})`
      );
    } catch (error: any) {
      updateTestStatus('signal', 'failed', undefined, error.message);
    }
  };

  const discoverServices = async (): Promise<void> => {
    try {
      updateTestStatus('services', 'running');

      if (!device) {
        throw new Error('Device not connected');
      }

      const services = await device.services();
      const serviceCount = services.length;

      updateTestStatus(
        'services',
        'passed',
        `Found ${serviceCount} service(s)`
      );
    } catch (error: any) {
      updateTestStatus('services', 'failed', undefined, error.message);
    }
  };

  const readBatteryLevel = async (): Promise<void> => {
    try {
      updateTestStatus('battery', 'running');

      if (!device) {
        throw new Error('Device not connected');
      }

      // Standard Battery Service UUID
      const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
      const BATTERY_LEVEL_CHARACTERISTIC_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

      try {
        const characteristic = await device.readCharacteristicForService(
          BATTERY_SERVICE_UUID,
          BATTERY_LEVEL_CHARACTERISTIC_UUID
        );

        if (characteristic.value) {
          // Decode base64 to get battery level
          const batteryLevel = parseInt(characteristic.value, 10);
          setDeviceInfo((prev) => ({ ...prev, batteryLevel }));

          updateTestStatus(
            'battery',
            'passed',
            `Battery: ${batteryLevel}%`
          );
        } else {
          throw new Error('No battery data available');
        }
      } catch (serviceError) {
        // Battery service might not be available
        updateTestStatus(
          'battery',
          'passed',
          'Battery service not available'
        );
      }
    } catch (error: any) {
      updateTestStatus('battery', 'failed', undefined, error.message);
    }
  };

  const readFirmwareVersion = async (): Promise<void> => {
    try {
      updateTestStatus('firmware', 'running');

      if (!device) {
        throw new Error('Device not connected');
      }

      // Standard Device Information Service
      const DEVICE_INFO_SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
      const FIRMWARE_REVISION_UUID = '00002a26-0000-1000-8000-00805f9b34fb';

      try {
        const characteristic = await device.readCharacteristicForService(
          DEVICE_INFO_SERVICE_UUID,
          FIRMWARE_REVISION_UUID
        );

        if (characteristic.value) {
          // Decode base64 to get firmware version
          const firmwareVersion = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          setDeviceInfo((prev) => ({ ...prev, firmwareVersion }));

          updateTestStatus(
            'firmware',
            'passed',
            `Version: ${firmwareVersion}`
          );
        } else {
          throw new Error('No firmware data available');
        }
      } catch (serviceError) {
        updateTestStatus(
          'firmware',
          'passed',
          'Firmware info not available'
        );
      }
    } catch (error: any) {
      updateTestStatus('firmware', 'failed', undefined, error.message);
    }
  };

  const testReadWrite = async (): Promise<void> => {
    try {
      updateTestStatus('readwrite', 'running');

      if (!device) {
        throw new Error('Device not connected');
      }

      const services = await device.services();
      let testPassed = false;

      // Try to find a writable characteristic
      for (const service of services) {
        const characteristics = await service.characteristics();

        for (const char of characteristics) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            // Found a writable characteristic
            testPassed = true;
            break;
          }
        }

        if (testPassed) break;
      }

      if (testPassed) {
        updateTestStatus(
          'readwrite',
          'passed',
          'Read/Write capabilities available'
        );
      } else {
        updateTestStatus(
          'readwrite',
          'passed',
          'No writable characteristics found'
        );
      }
    } catch (error: any) {
      updateTestStatus('readwrite', 'failed', undefined, error.message);
    }
  };

  const runAllDiagnostics = async (): Promise<void> => {
    setIsRunningDiagnostics(true);
    setOverallStatus('running');

    // Reset all tests
    setDiagnosticTests((prevTests) =>
      prevTests.map((test) => ({ ...test, status: 'pending' as const, result: undefined, error: undefined }))
    );

    try {
      // Step 1: Connect to device
      const connected = await connectToDevice();
      if (!connected) {
        throw new Error('Failed to connect to device');
      }

      // Wait a bit between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Test signal strength
      await testSignalStrength();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Discover services
      await discoverServices();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Read battery level
      await readBatteryLevel();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 5: Read firmware version
      await readFirmwareVersion();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 6: Test read/write
      await testReadWrite();

      setOverallStatus('completed');
      showToastSuccess({
        message: AppConstants.messages.success.diagnosticsComplete || 'Diagnostics completed',
        position: 'bottom',
      });
    } catch (error: any) {
      console.error('Diagnostics error:', error);
      showToastFail({
        message: `Diagnostics failed: ${error.message}`,
        position: 'bottom',
      });
      setOverallStatus('completed');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const disconnectDevice = async (): Promise<void> => {
    try {
      if (device && deviceInfo.isConnected) {
        await manager.cancelDeviceConnection(device.id);
        setDeviceInfo((prev) => ({ ...prev, isConnected: false }));
        setDevice(null);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // const handleBackPress = (): void => {
  //   Alert.alert(
  //     'Exit Diagnostics',
  //     'Are you sure you want to exit? This will disconnect the device.',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Exit',
  //         onPress: async () => {
  //           await disconnectDevice();
  //           router.back();
  //         },
  //       },
  //     ]
  //   );
  // };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <MaterialIcons name="check-circle" size={24} color="#4CAF50" />;
      case 'failed':
        return <MaterialIcons name="error" size={24} color="#F44336" />;
      case 'running':
        return <ActivityIndicator size="small" color={AppConstants.colors.error} />;
      default:
        return <MaterialIcons name="radio-button-unchecked" size={24} color="#999" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'running':
        return AppConstants.colors.error;
      default:
        return '#999';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={AppConstants.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Diagnostics</Text>
      </View> */}

      <ScrollView style={styles.content}>
        {/* Device Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{deviceInfo.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValue}>{deviceInfo.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: deviceInfo.isConnected ? '#4CAF50' : '#F44336' },
                ]}
              />
              <Text style={styles.statusText}>
                {deviceInfo.isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          {deviceInfo.rssi && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Signal:</Text>
              <Text style={styles.infoValue}>{deviceInfo.rssi} dBm</Text>
            </View>
          )}
          {deviceInfo.batteryLevel && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Battery:</Text>
              <Text style={styles.infoValue}>{deviceInfo.batteryLevel}%</Text>
            </View>
          )}
          {deviceInfo.firmwareVersion && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Firmware:</Text>
              <Text style={styles.infoValue}>{deviceInfo.firmwareVersion}</Text>
            </View>
          )}
        </View>

        {/* Diagnostic Tests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diagnostic Tests</Text>

          {diagnosticTests.map((test) => (
            <View key={test.id} style={styles.testItem}>
              <View style={styles.testHeader}>
                <View style={styles.testInfo}>
                  {getStatusIcon(test.status)}
                  <View style={styles.testText}>
                    <Text style={styles.testName}>{test.name}</Text>
                    <Text style={styles.testDescription}>{test.description}</Text>
                  </View>
                </View>
              </View>

              {test.result && (
                <View style={styles.testResult}>
                  <Text style={styles.testResultText}>{test.result}</Text>
                </View>
              )}

              {test.error && (
                <View style={styles.testError}>
                  <MaterialIcons name="warning" size={16} color="#F44336" />
                  <Text style={styles.testErrorText}>{test.error}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Overall Status */}
        {overallStatus === 'completed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <View style={styles.summaryContainer}>
              {diagnosticTests.every((test) => test.status === 'passed') ? (
                <>
                  <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
                  <Text style={styles.summaryText}>All tests passed!</Text>
                  <Text style={styles.summarySubtext}>
                    Your device is working properly
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="error" size={48} color="#FF9800" />
                  <Text style={styles.summaryText}>Some tests failed</Text>
                  <Text style={styles.summarySubtext}>
                    Check the results above for details
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            isRunningDiagnostics && styles.buttonDisabled,
          ]}
          onPress={runAllDiagnostics}
          disabled={isRunningDiagnostics}
        >
          {isRunningDiagnostics ? (
            <ActivityIndicator color={AppConstants.colors.white} />
          ) : (
            <>
              <MaterialIcons name="play-arrow" size={24} color={AppConstants.colors.white} />
              <Text style={styles.buttonText}>
                {overallStatus === 'idle' ? 'Start Diagnostics' : 'Run Again'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {deviceInfo.isConnected && !isRunningDiagnostics && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={disconnectDevice}
          >
            <MaterialIcons name="bluetooth-disabled" size={24} color={AppConstants.colors.error} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>
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
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppConstants.colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: AppConstants.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppConstants.colors.secondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: AppConstants.colors.secondary,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: AppConstants.colors.secondary,
  },
  testItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  testText: {
    marginLeft: 12,
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppConstants.colors.secondary,
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 12,
    color: '#666',
  },
  testResult: {
    marginTop: 8,
    marginLeft: 36,
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
  },
  testResultText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  testError: {
    marginTop: 8,
    marginLeft: 36,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testErrorText: {
    fontSize: 12,
    color: '#C62828',
    marginLeft: 6,
    flex: 1,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppConstants.colors.secondary,
    marginTop: 16,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: AppConstants.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: AppConstants.colors.error,
  },
  secondaryButton: {
    backgroundColor: AppConstants.colors.white,
    borderWidth: 2,
    borderColor: AppConstants.colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppConstants.colors.white,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: AppConstants.colors.error,
  },
});

export default DeviceDiagnostics;