// MainScreen.tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useDispatch } from "react-redux";
import DataServices from "../api/Services";
const logo = require("../assets/images/ctmlogoedited.png");

const MainScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.0922;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch<any>();

  const [userLocation, setUserLocation] = useState({
    latitude: "",
    longitude: "",
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const requestLocationPermission = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        getUserCurrentLocation();
      } else {
        alert("Location permission denied");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getUserCurrentLocation = async (): Promise<void> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLoc = {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      setUserLocation({
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } catch (error) {
      console.log("Error while getting user location:", error);
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    EmptyFun();
  }, []);

  const EmptyFun = async (): Promise<void> => {
    await dispatch.LoginModel.handleEmptyUserDetails();
  };

  const loginUser = async (): Promise<void> => {
    const password = "Alai1234$";
    const hashPassword = async (pwd: string): Promise<string> => {
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pwd);
    };
    try {
      const finalPassword = await hashPassword(password);
      const loginData = {
        emailId: "tamilselvan@alai-labs.com",
        password: finalPassword,
      };
      console.log("loginData", loginData);
      const response = await DataServices.login(loginData);
      console.log("APIRESPONSE", response.response.body.accessToken);
      await dispatch.LoginModel.handleApiToken(
        response.response.body.accessToken
      );
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  useEffect(() => {
    loginUser();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#CE132A",
      }}
    >
      <StatusBar backgroundColor={"#2988CC"} hidden={true} />
      <View
        style={{
          width: "96%",
          height: "96%",
          alignItems: "center",
          borderColor: "#333333",
          borderWidth: 3,
          borderRadius: Dimensions.get("screen").width / 20,
          backgroundColor: "#FFFFFF",
        }}
      >
        <View
          style={{
            width: Dimensions.get("screen").width / 2,
            flex: 0.5,
            justifyContent: "center",
          }}
        >
          <Image
            source={logo}
            style={{ width: Dimensions.get("screen").width / 2, height: "50%" }}
            resizeMode={"contain"}
          />
        </View>

        <View style={{ flex: 0.3, justifyContent: "space-evenly" }}>
          <TouchableOpacity
            style={{
              height: Dimensions.get("screen").height / 20,
              width: Dimensions.get("screen").width / 2,
              backgroundColor: "red",
              flexDirection: "row",
              borderRadius: 50,
              justifyContent: "center",
              alignContent: "center",
              alignItems: "center",
            }}
            onPress={() => router.push("./DeviceRecords")}
          >
            <MaterialIcons
              name="checklist"
              type="octicon"
              color="#ffffff"
              size={Dimensions.get("screen").width / 20}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: width / 28,
              }}
            >
              {"  "}
              Click here for Record
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              height: Dimensions.get("screen").height / 20,
              width: Dimensions.get("screen").width / 2,
              backgroundColor: "red",
              flexDirection: "row",
              borderRadius: 50,
              justifyContent: "center",
              alignContent: "center",
              alignItems: "center",
            }}
            onPress={() => router.push("./BleScan")}
          >
            <MaterialIcons
              name="checklist"
              type="octicon"
              color="#ffffff"
              size={Dimensions.get("screen").width / 20}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: width / 28,
              }}
            >
              {"  "}
              Click here to add device
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 0.4, justifyContent: "flex-end" }}>
          <Text style={{ marginBottom: 50, color: "#333333" }}>
            Copyright © {new Date().getFullYear()} Alai Labs.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
  },
  highlight: {
    fontWeight: "700",
  },
});

export default MainScreen;
