import { RootState } from "@/app/store/store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Button, DataTable, Text, TextInput } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import GlobalLoader from "../components/GlobalLoader";
import { useLoading } from "../hooks/useLoading";
import { Device, DropdownItem } from "../types/types";

interface RequestData {
  row: string;
  deviceType: string;
}

const DeviceRecords: React.FC = () => {
  const { width, height } = Dimensions.get("window");
  const { token } = useSelector((state: RootState) => state.LoginModel);
  const dispatch = useDispatch<any>();
  const { isLoading, loadingMessage, withLoader, showLoader, hideLoader } =
    useLoading();

  const [items, setItems] = useState<Device[]>([]);
  const [filteredItems, setFilteredItems] = useState<Device[]>([]);
  const [list] = useState<DropdownItem[]>([
    {
      label: AppConstants.deviceTypes.dic,
      value: AppConstants.deviceTypes.dic,
    },
    {
      label: AppConstants.deviceTypes.bin,
      value: AppConstants.deviceTypes.bin,
    },
  ]);
  const [value, setValue] = useState<string>(AppConstants.deviceTypes.bin);
  const [rowList] = useState<DropdownItem[]>(
    AppConstants.rowOptions.map((row) => ({ label: row, value: row }))
  );
  const [rowValue, setRowValue] = useState<string>("1000");
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Device | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>("");

  const HandleAPICall = async (value: RequestData): Promise<void> => {
    await withLoader(async () => {
      try {
        const apiResponse = await DataServices.getDicDevice(value, token);
        console.log("apiResponse", apiResponse);
        setItems(apiResponse.response.body.content);
        setFilteredItems(apiResponse.response.body.content);
      } catch (error) {
        setItems([]);
        console.error(error);
      }
    }, "Fetching device records...");
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

  const handleEdit = async (): Promise<void> => {
    setVisible(false);

    showLoader("Opening device details...");

    if (selectedItem?.config) {
      await handleConfiguration(selectedItem.config);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    hideLoader();

    router.push({
      pathname: "./DeviceDetails",
      params: {
        selectedItem: JSON.stringify(selectedItem),
        isEdit: "true",
      },
    });

    setSelectedItem(undefined);
  };

  const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={4}>
        {value || "-"}
      </Text>
    </View>
  );

  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />

      <Modal
        visible={visible}
        onDismiss={() => {
          setVisible(false);
          setSelectedItem(undefined);
        }}
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
            {/* Image */}
            <Image
              source={{ uri: selectedItem?.image || "" }}
              resizeMode="cover"
              style={styles.deviceImage}
            />

            {/* Info Section */}
            <View style={styles.infoContainer}>
              <InfoRow label="Device Name" value={selectedItem?.deviceName} />
              <InfoRow label="Latitude" value={selectedItem?.latitude} />
              <InfoRow label="Longitude" value={selectedItem?.longitude} />
              <InfoRow label="Address" value={selectedItem?.address} />
              <InfoRow label="Device Info" value={selectedItem?.deviceId} />
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                style={styles.button}
                onPress={() => {
                  setVisible(false);
                  setSelectedItem(undefined);
                }}
              >
                Close
              </Button>

              <Button
                mode="contained"
                style={styles.button}
                onPress={handleEdit}
              >
                Edit
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View
        style={{
          width: width,
          height: height,
          alignItems: "center",
        }}
      >
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
            <TouchableOpacity>
              <Ionicons
                name="reload-circle"
                size={width / 10}
                color={AppConstants.colors.primary}
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
                  borderColor: AppConstants.colors.primary,
                  borderWidth: 1,
                  backgroundColor: AppConstants.colors.white,
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
                borderColor: AppConstants.colors.primary,
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
                backgroundColor: AppConstants.colors.primary,
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
                  color: AppConstants.colors.white,
                }}
              >
                Device Id
              </DataTable.Title>
              <DataTable.Title
                style={{ flex: 1.3, justifyContent: "center" }}
                textStyle={{
                  fontSize: width / 30,
                  fontWeight: "bold",
                  color: AppConstants.colors.white,
                }}
              >
                Address
              </DataTable.Title>
              <DataTable.Title
                style={{ justifyContent: "center" }}
                textStyle={{
                  fontSize: width / 30,
                  fontWeight: "bold",
                  color: AppConstants.colors.white,
                }}
              >
                Actions
              </DataTable.Title>
            </DataTable.Header>

            {filteredItems?.length === 0 && !isLoading ? (
              <View
                style={{
                  width: "100%",
                  height: 100,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: AppConstants.colors.tableHeader,
                  borderBottomRightRadius: 10,
                  borderBottomLeftRadius: 10,
                }}
              >
                <Text style={{ fontWeight: "bold", fontSize: width / 28 }}>
                  {AppConstants.messages.error.noRecordsFound}
                </Text>
              </View>
            ) : (
              <View style={{ height: height / 1.5 }}>
                <ScrollView persistentScrollbar={true}>
                  {filteredItems?.map((item, index) => (
                    <DataTable.Row
                      style={{
                        backgroundColor: AppConstants.colors.tableHeader,
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
                            color={AppConstants.colors.highlight}
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
    </>
  );
};

export default DeviceRecords;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },

  deviceImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },

  infoContainer: {
    gap: 12,
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  label: {
    width: 110,
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },

  value: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  button: {
    flex: 1,
    borderRadius: 10,
  },
});
