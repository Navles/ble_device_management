// DeviceRecords.tsx
import { RootState } from "@/app/store/store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Spinner from "react-native-loading-spinner-overlay";
import { Button, DataTable, Modal, Text, TextInput } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import DataServices from "../api/Services";
import { Device, DropdownItem } from "../types/types";

interface RequestData {
  row: string;
  deviceType: string;
}

const DeviceRecords: React.FC = () => {
  const { width, height } = Dimensions.get("window");
  const navigation = useNavigation<NavigationProp<any>>();
  const { token } = useSelector((state: RootState) => state.LoginModel);

  const [items, setItems] = useState<Device[]>([]);
  const [filteredItems, setFilteredItems] = useState<Device[]>([]);
  const [list] = useState<DropdownItem[]>([
    { label: "DLC", value: "DLC" },
    { label: "BIN", value: "BIN" },
  ]);
  const [value, setValue] = useState<string>("BIN");
  const [rowList] = useState<DropdownItem[]>([
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "30", value: "30" },
    { label: "100", value: "100" },
    { label: "500", value: "500" },
    { label: "1000", value: "1000" },
  ]);
  const [rowValue, setRowValue] = useState<string>("1000");
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Device | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [spinnerValue, setSpinnerValue] = useState<boolean>(false);

  const dispatch = useDispatch<any>();

  const HandleAPICall = async (value: RequestData): Promise<void> => {
    try {
      setSpinnerValue(true);
      const apiResponse = await DataServices.getDicDevice(value, token);
      console.log("apiResponse", apiResponse);
      setItems(apiResponse.response.body.content);
      setFilteredItems(apiResponse.response.body.content);
    } catch (error) {
      setItems([]);
      console.error(error);
    } finally {
      setSpinnerValue(false);
    }
  };

  useEffect(() => {
    try {
      const data: RequestData = {
        row: rowValue,
        deviceType: value,
      };
      HandleAPICall(data);
    } catch (error) {
      console.error(error);
    }
  }, [rowValue, value]);

  const handleConfiguration = async (config: any[]): Promise<void> => {
    console.log("config", config);
    await dispatch.LoginModel.handleConfigUpdate(config);
  };

  useEffect(() => {
    const filtered = items.filter((item) =>
      item.deviceId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  return (
    <View
      style={{
        width: width,
        height: height,
        alignItems: "center",
      }}
    >
      <Modal
        visible={visible}
        // animationType="fade"
        // statusBarTranslucent
        // onRequestClose={() => {
        //   setVisible(false);
        //   setSelectedItem(undefined);
        // }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setVisible(false);
            setSelectedItem(undefined);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View>
              <Image
                style={{
                  width: width / 2,
                  height: width / 2,
                  alignSelf: "center",
                }}
                resizeMode="cover"
                source={{
                  uri: selectedItem?.image || "",
                }}
              />
              <View
                style={{
                  marginTop: 20,
                  width: "95%",
                  alignSelf: "center",
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <Text
                    variant="titleMedium"
                    style={{ width: "35%", fontWeight: "500" }}
                  >
                    Device Name:
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ width: "45%" }}
                    numberOfLines={6}
                  >
                    {selectedItem?.deviceName || ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    variant="titleMedium"
                    style={{ width: "30%", fontWeight: "500" }}
                  >
                    Latitude:{" "}
                  </Text>
                  <Text variant="bodyLarge">
                    {selectedItem?.latitude || ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    variant="titleMedium"
                    style={{ width: "30%", fontWeight: "500" }}
                  >
                    Longitude:
                  </Text>
                  <Text variant="bodyLarge">
                    {selectedItem?.longitude || ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    variant="titleMedium"
                    style={{ fontWeight: "500", width: "30%" }}
                  >
                    Address:
                  </Text>
                  <Text
                    variant="bodyLarge"
                    style={{ width: "65%" }}
                    numberOfLines={6}
                  >
                    {selectedItem?.address || ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    variant="titleMedium"
                    style={{ width: "30%", fontWeight: "500" }}
                  >
                    Device Info:
                  </Text>
                  <Text variant="bodyLarge">
                    {selectedItem?.deviceId || ""}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: width / 1.1,
                  height: height / 20,
                  marginTop: 20,
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                }}
              >
                <Button
                  mode="contained"
                  style={{ width: "40%" }}
                  onPress={() => {
                    setVisible(false);
                    setSelectedItem(undefined);
                  }}
                >
                  Close
                </Button>
                <Button
                  mode="contained"
                  style={{ width: "40%" }}
                  onPress={() => {
                    setVisible(false);
                    router.push({
                      pathname: "./DeviceDetails",
                      params: {
                        selectedItem: JSON.stringify(selectedItem),
                        isEdit: "true",
                      },
                    });
                    if (selectedItem?.config) {
                      handleConfiguration(selectedItem.config);
                    }
                    setSelectedItem(undefined);
                  }}
                >
                  Edit
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View
        style={{
          width: "100%",
          height: "90%",
          marginTop: width / 10,
        }}
      >
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingHorizontal: width / 30,
          }}
        >
          <Spinner
            visible={spinnerValue}
            textContent={"Loading..."}
            textStyle={{ color: "#FFF" }}
          />
          <TouchableOpacity>
            <Ionicons
              name="reload-circle"
              size={width / 10}
              type="ionicon"
              color={"red"}
              onPress={() => {
                HandleAPICall({
                  row: rowValue,
                  deviceType: value,
                });
              }}
            />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ marginRight: 10 }}>Rows per page:</Text>
            <Dropdown
              data={rowList}
              value={rowValue}
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              valueField="value"
              labelField="label"
              style={{
                borderColor: "red",
                borderWidth: 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 5,
                width: width / 6,
              }}
              onChange={(item) => {
                setRowValue(item.value);
              }}
            />
          </View>

          <TextInput
            style={{
              width: "40%",
              marginBottom: 2,
              borderWidth: 1,
              borderColor: "red",
              borderRadius: 5,
              paddingHorizontal: 10,
              height: 40,
            }}
            placeholder="Search by Device ID"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <DataTable>
          <DataTable.Header
            style={{
              backgroundColor: "red",
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
            }}
          >
            <DataTable.Title
              style={{
                justifyContent: "center",
                flex: 1.3,
              }}
              textStyle={{
                fontSize: width / 30,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              Device Id
            </DataTable.Title>
            <DataTable.Title
              style={{ flex: 1.3, justifyContent: "center" }}
              textStyle={{
                fontSize: width / 30,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              Address
            </DataTable.Title>
            <DataTable.Title
              style={{ justifyContent: "center" }}
              textStyle={{
                fontSize: width / 30,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              Actions
            </DataTable.Title>
          </DataTable.Header>

          {filteredItems?.length === 0 && !spinnerValue ? (
            <View
              style={{
                width: "100%",
                height: 100,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#E9E3D5",
                borderBottomRightRadius: 10,
                borderBottomLeftRadius: 10,
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: width / 28 }}>
                No Records Found
              </Text>
            </View>
          ) : (
            <View style={{ height: height / 1.5 }}>
              <ScrollView persistentScrollbar={true}>
                {filteredItems?.map((item, index) => (
                  <DataTable.Row
                    style={{
                      backgroundColor: "#E9E3D5",
                    }}
                    key={index}
                  >
                    <DataTable.Cell
                      style={{ flex: 1.3, justifyContent: "center" }}
                    >
                      {item.deviceId}
                    </DataTable.Cell>
                    <DataTable.Cell
                      style={{ flex: 1.3, justifyContent: "center" }}
                    >
                      {item.address}
                    </DataTable.Cell>

                    <DataTable.Cell style={{ justifyContent: "center" }}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(item);
                          setVisible(true);
                        }}
                      >
                        <MaterialIcons
                          name="read-more"
                          size={30}
                          color={"red"}
                        />
                      </TouchableOpacity>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </ScrollView>
            </View>
          )}
        </DataTable>
      </View>
    </View>
  );
};

export default DeviceRecords;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 15,
    justifyContent: "space-evenly",
    padding: 10,
  },
});
