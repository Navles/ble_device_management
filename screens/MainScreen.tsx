// screens/MainScreen.tsx (IMPROVED VERSION)
import AppConstants from "@/app/utlis/AppConstants";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useDispatch } from "react-redux";
import DataServices from "../api/Services";

const logo = require("../assets/images/appLogo.png");
const { width, height } = Dimensions.get("screen");

const MainScreen: React.FC = () => {
  const dispatch = useDispatch<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async (): Promise<void> => {
    try {
      await dispatch.LoginModel.handleEmptyUserDetails();
      await requestLocationPermission();
      await loginUser();
      setIsLoading(false);
    } catch (error) {
      console.error("Initialization error:", error);
      setIsLoading(false);
    }
  };

  const requestLocationPermission = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        await getUserCurrentLocation();
      } else {
        console.log("Location permission denied");
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

  const handleNavigateToRecords = (): void => {
    router.push("./DeviceRecords");
  };

  const handleNavigateToBleScan = (): void => {
    router.push("./BleScan");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          backgroundColor={AppConstants.colors.primary}
          barStyle="light-content"
        />
        <Image source={logo} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator
          size="large"
          color={AppConstants.colors.primary}
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
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
          <Text style={styles.welcomeText}>Device Manager</Text>
          <Text style={styles.subtitleText}>
            Monitor, configure, and manage your IoT devices
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Feature Cards */}
        <View style={styles.cardsContainer}>
          {/* Device Records/Database */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleNavigateToRecords}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#3b82f620" }]}>
              <MaterialIcons
                name="inventory"
                color="#3b82f6"
                size={32}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Device Database</Text>
              <Text style={styles.cardDescription}>
                View and manage registered devices
              </Text>
              <View style={styles.featureTags}>
                <View style={[styles.featureTag, { backgroundColor: "#dbeafe" }]}>
                  <Text style={[styles.featureTagText, { color: "#2563eb" }]}>View</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "#dbeafe" }]}>
                  <Text style={[styles.featureTagText, { color: "#2563eb" }]}>Edit</Text>
                </View>
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              color={AppConstants.colors.textSecondary}
              size={24}
            />
          </TouchableOpacity>

          {/* Scan & Connect - All BLE Operations */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleNavigateToBleScan}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#10b98120" }]}>
              <MaterialIcons
                name="bluetooth-searching"
                color="#10b981"
                size={32}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Scan & Connect</Text>
              <Text style={styles.cardDescription}>
                Find nearby devices to interact with
              </Text>
              <View style={styles.featureTags}>
                <View style={[styles.featureTag, { backgroundColor: "#d1fae5" }]}>
                  <Text style={[styles.featureTagText, { color: "#059669" }]}>Monitor</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "#d1fae5" }]}>
                  <Text style={[styles.featureTagText, { color: "#059669" }]}>Configure</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "#d1fae5" }]}>
                  <Text style={[styles.featureTagText, { color: "#059669" }]}>Register</Text>
                </View>
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              color={AppConstants.colors.textSecondary}
              size={24}
            />
          </TouchableOpacity>
        </View>

        {/* Info Section - Clarifies the workflow */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialIcons name="lightbulb-outline" color="#f59e0b" size={20} />
            <Text style={styles.infoHeaderText}>Quick Guide</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoNumber}>1</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Database Management</Text>
              <Text style={styles.infoText}>
                View all registered devices, edit their details, or check their history
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoNumber}>2</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Connect to Devices</Text>
              <Text style={styles.infoText}>
                Scan for nearby devices, then choose to monitor live data, configure settings, or register new devices
              </Text>
            </View>
          </View>
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
            <MaterialIcons name="verified-user" color="#10b981" size={20} />
            <Text style={styles.statusText}>Authenticated</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Copyright © {new Date().getFullYear()} Alai Labs
        </Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: width * 0.35,
    height: height * 0.1,
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: AppConstants.colors.textSecondary,
    marginTop: 10,
  },
  header: {
    height: height * 0.3,
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
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: (width * 0.28) / 2,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 13,
    color: "#ffffff",
    opacity: 0.9,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
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
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: AppConstants.colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: AppConstants.colors.textSecondary,
    marginBottom: 8,
  },
  featureTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fbbf24",
    justifyContent: "center",
    alignItems: "center",
  },
  infoNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#78350f",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: "#92400e",
    lineHeight: 18,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: "auto",
    marginBottom: 10,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  footer: {
    paddingVertical: 16,
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