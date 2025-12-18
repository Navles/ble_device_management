import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { store } from "./store/store";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="DeviceRecords" />
        <Stack.Screen name="BleScan" />
        <Stack.Screen name="DeviceDetails" />
      </Stack>
    </Provider>
  );
}