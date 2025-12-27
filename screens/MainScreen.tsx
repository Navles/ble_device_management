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

  const handleNavigateToAddDevice = (): void => {
    router.push({
      pathname: "./BleScan",
      params: { mode: "add" },
    });
  };

  const handleNavigateToMonitorLogs = (): void => {
    router.push({
      pathname: "./BleScan",
      params: { mode: "monitor" },
    });
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
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Feature Cards */}
        <View style={styles.cardsContainer}>
          {/* Device Records */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleNavigateToRecords}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#3b82f620" }]}>
              <MaterialIcons
                name="inventory"
                color="#3b82f6"
                size={36}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Device Records</Text>
              <Text style={styles.cardDescription}>
                View and manage registered devices
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              color={AppConstants.colors.textSecondary}
              size={28}
            />
          </TouchableOpacity>

          {/* Add New Device */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleNavigateToAddDevice}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#10b98120" }]}>
              <MaterialIcons
                name="add-circle"
                color="#10b981"
                size={36}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Add New Device</Text>
              <Text style={styles.cardDescription}>
                Scan and register a new device
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              color={AppConstants.colors.textSecondary}
              size={28}
            />
          </TouchableOpacity>

          {/* Monitor Device Logs */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleNavigateToMonitorLogs}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#8b5cf620" }]}>
              <MaterialIcons
                name="timeline"
                color="#8b5cf6"
                size={36}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Device Diagnostics</Text>
              <Text style={styles.cardDescription}>
                Connect and monitor device activity
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              color={AppConstants.colors.textSecondary}
              size={28}
            />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Copyright © {new Date().getFullYear()} Alai Labs
          </Text>
        </View>
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
  paddingTop: height * 0.06,
  paddingBottom: height * 0.05,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 30,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 15,
    minHeight: height * 0.13,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
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