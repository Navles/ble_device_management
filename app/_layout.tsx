import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { Provider } from "react-redux";
import { store } from "./store/store";
import AppConstants from "./utlis/AppConstants";
import { ToastConfig } from "./utlis/ToastConfig";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Login Screen - Initial Route */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Main App Screens */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* Other Screens */}
        <Stack.Screen
          name="BleScan"
          options={{
            headerShown: true,
            title: "BLE Scanner",
            headerStyle: {
              backgroundColor: AppConstants.colors.error,
            },
            headerTintColor: AppConstants.colors.white,
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />

        <Stack.Screen
          name="DeviceDetails"
          options={{
            headerShown: true,
            title: "Device Details",
            headerStyle: {
              backgroundColor: AppConstants.colors.error,
            },
            headerTintColor: AppConstants.colors.white,
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />

        <Stack.Screen
          name="DeviceRecords"
          options={{
            headerShown: true,
            title: "Device Records",
            headerStyle: {
              backgroundColor: AppConstants.colors.error,
            },
            headerTintColor: AppConstants.colors.white,
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
        <Stack.Screen
          name="DeviceDiagnostics"
          options={{
            headerShown: true,
            title: "Device Diagnostics",
          }}
        />
        <Stack.Screen
          name="DeviceMonitor"
          options={{
            headerShown: true,
            title: "Device Monitor",
          }}
        />
      </Stack>

      <Toast config={ToastConfig} />
    </Provider>
  );
}
