import { RootState } from "@/app/store/store";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ListRenderItem,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import DataServices from "../api/Services";
import AppConstants from "../app/utlis/AppConstants";
import GlobalLoader from "../components/GlobalLoader";
import { useLoading } from "../hooks/useLoading";
import { ConfigItem, Device } from "../types/types";

const { width, height } = Dimensions.get("window");

const getConfigValue = (config: ConfigItem[], id: string): any => {
  const item = config.find((c) => c.id === id);
  return item ? item.value : undefined;
};

const getImageUrl = (item: Device): string | null => {
  const hasImage = getConfigValue(item.config, "IMG") === 1;
  if (!hasImage) return null;
  return `https://ctm.sensz.ai/images/${item.deviceId}.jpg?t=${Date.now()}`;
};

const DeviceRecords: React.FC = () => {
  const { token } = useSelector((state: RootState) => state.LoginModel);
  const dispatch = useDispatch<any>();
  const { isLoading, loadingMessage, withLoader } = useLoading();
  const [items, setItems] = useState<Device[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] =
    useState<boolean>(false);
  const [previewImageUri, setPreviewImageUri] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const fetchDevices = useCallback(
    async (pageNum: number, append: boolean = false): Promise<void> => {
      if (isFetchingRef.current) {
        console.log(`[DEBUG] Page ${pageNum}: Already fetching, skipped.`);
        return;
      }

      try {
        isFetchingRef.current = true;
        if (append) setIsLoadingMore(true);

        const params = {
          row: "10",
          deviceType: AppConstants.deviceTypes.dic,
          page: pageNum.toString(),
        };

        const apiResponse = await DataServices.getDicDevice(params, token);
        console.log(`[DEBUG] Raw API Response:`, apiResponse);

        const statusCode = apiResponse.statusCode?.toString().trim();
        const isSuccess = statusCode === "200";

        console.log(
          `[DEBUG] Parsed statusCode: "${statusCode}", isSuccess: ${isSuccess}`
        );

        if (isSuccess && apiResponse.response?.body) {
          const responseBody = apiResponse.response.body;
          const newItems: Device[] = responseBody.content || [];
          const currentPage = responseBody.number ?? pageNum;
          const totalPagesApi = responseBody.totalPages ?? 0;
          const totalElementsApi = responseBody.totalElements ?? 0;
          const isLastPage = responseBody.last ?? false;

          console.log(
            `[DEBUG] Page ${pageNum} — Items: ${newItems.length}, Current: ${currentPage}, TotalPages: ${totalPagesApi}`
          );

          setTotalPages(totalPagesApi);
          setTotalElements(totalElementsApi);

          if (append && newItems.length > 0) {
            setItems((prev) => [...prev, ...newItems]);
          } else if (!append) {
            setItems(newItems);
            console.log(`[DEBUG] Set initial items. Count:`, newItems.length);
          }

          const nextHasMore = !isLastPage && currentPage < totalPagesApi - 1;
          setHasMore(nextHasMore);
        } else {
          console.error(`[ERROR] API request failed`, {
            statusCode,
            response: apiResponse,
          });
          if (!append) setItems([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error(
          `[ERROR] Exception in fetchDevices (page ${pageNum}):`,
          error
        );
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [token]
  );

  const loadInitialData = useCallback(async (): Promise<void> => {
    await withLoader(async () => {
      setPage(0);
      setHasMore(true);
      isFetchingRef.current = false;
      await fetchDevices(0, false);
    }, "Loading devices...");
  }, [withLoader, fetchDevices]);

  useEffect(() => {
    console.log(`[DEBUG] items updated. Count: ${items.length}`);
    if (items.length > 0) {
      console.log(`[DEBUG] First item:`, {
        id: items[0].id,
        deviceId: items[0].deviceId,
        deviceName: items[0].deviceName,
        status: items[0].status,
      });
    }
  }, [items]);

  useEffect(() => {
    console.log("[DEBUG] Mounting DeviceRecords — loading initial data...");
    loadInitialData();
  }, []);

  const handleShowMore = useCallback((): void => {
    if (
      isLoadingMore ||
      !hasMore ||
      isFetchingRef.current ||
      page >= totalPages - 1
    ) {
      console.log("[DEBUG] Show More blocked:", {
        isLoadingMore,
        hasMore,
        page,
        totalPages,
        isFetching: isFetchingRef.current,
      });
      return;
    }

    const nextPage = page + 1;
    console.log(`[DEBUG] Loading page ${nextPage}`);
    setPage(nextPage);
    fetchDevices(nextPage, true);
  }, [isLoadingMore, hasMore, page, totalPages, fetchDevices]);

  const handleConfiguration = async (config: ConfigItem[]): Promise<void> => {
    await dispatch.LoginModel.handleConfigUpdate(config);
  };

  const handleCardPress = async (item: Device): Promise<void> => {
    if (item.config) {
      await handleConfiguration(item.config);
    }

    router.push({
      pathname: "./DeviceDetails",
      params: {
        selectedItem: JSON.stringify(item),
        isEdit: "true",
      },
    });
  };

  const handleImagePress = (imageUri: string): void => {
    if (!imageUri) return;
    setPreviewImageUri(imageUri);
    setImagePreviewVisible(true);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter((item) => {
        const id = (item.deviceId || "").toLowerCase();
        const name = (item.deviceName || "").toLowerCase();
        const addr = (item.address || "").toLowerCase();
        return (
          id.includes(normalizedQuery) ||
          name.includes(normalizedQuery) ||
          addr.includes(normalizedQuery)
        );
      })
    : items;

  const renderDeviceCard: ListRenderItem<Device> = ({ item }) => {
    const imageUrl = getImageUrl(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedDevice(item);
          setDetailsVisible(true);
        }}
        // onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
      >
        {/* Image Section */}
        {/* {imageUrl ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.deviceImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => handleImagePress(imageUrl)}
            >
              <MaterialIcons name="zoom-in" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noImageWrapper}>
            <MaterialIcons name="image-not-supported" size={32} color="#cbd5e1" />
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )} */}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceIconWrapper}>
                <MaterialIcons name="devices" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.deviceName} numberOfLines={1}>
                {item.deviceName || "Unnamed Device"}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    (item.status || "UNKNOWN") === "ACTIVE"
                      ? "#dcfce7"
                      : "#fee2e2",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      (item.status || "UNKNOWN") === "ACTIVE"
                        ? "#22c55e"
                        : "#ef4444",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      (item.status || "UNKNOWN") === "ACTIVE"
                        ? "#16a34a"
                        : "#dc2626",
                  },
                ]}
              >
                {item.status || "UNKNOWN"}
              </Text>
            </View>
          </View>

          {/* Device ID */}
          {/* <View style={styles.detailRow}>
            <MaterialIcons name="fingerprint" size={16} color="#64748b" />
            <Text style={styles.detailLabel}>ID:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.deviceId || "N/A"}
            </Text>
          </View> */}

          {/* Address */}
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#64748b" />
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {item.address || "N/A"}
            </Text>
          </View>

          {/* Action Button */}
          <View style={styles.viewDetailsButton}>
            <Text style={styles.viewDetailsText}>View Full Details</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#3b82f6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchDevices(0, false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const renderFooter = (): React.ReactElement | null => {
    if (searchQuery || items.length === 0) return null;

    if (hasMore) {
      return (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.showMoreButton,
              isLoadingMore && styles.showMoreButtonDisabled,
            ]}
            onPress={handleShowMore}
            disabled={isLoadingMore}
            activeOpacity={0.7}
          >
            {isLoadingMore ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.showMoreText}>Loading...</Text>
              </>
            ) : (
              <>
                <Text style={styles.showMoreText}>Load More Devices</Text>
                <MaterialIcons name="expand-more" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.footerInfo}>
            Showing {items.length} of {totalElements} devices
          </Text>
        </View>
      );
    }

    if (items.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <View style={styles.allLoadedContainer}>
            <MaterialIcons name="check-circle" size={20} color="#22c55e" />
            <Text style={styles.allLoadedText}>All devices loaded</Text>
          </View>
          <Text style={styles.footerInfo}>Total: {items.length} devices</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = (): React.ReactElement | null => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons name="devices-other" size={48} color="#94a3b8" />
        </View>
        <Text style={styles.emptyTitle}>No Devices Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? "Try adjusting your search criteria"
            : "Start by adding your first device"}
        </Text>
      </View>
    );
  };

  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />

      <View style={styles.container}>
        {/* Header */}
        {/* <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={styles.headerTitle}>Device Records</Text>
              <Text style={styles.headerSubtitle}>
                {totalElements > 0
                  ? `${totalElements} device${totalElements !== 1 ? "s" : ""} total`
                  : "No devices"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadInitialData}
            >
              <MaterialIcons name="refresh" size={24} color="#64748b" />
            </TouchableOpacity>
          </View> */}

        {/* <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={22} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search devices..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View> */}

        {/* {searchQuery && filteredItems.length > 0 && (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsText}>
                {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""} found
              </Text>
            </View>
          )}
        </View> */}

        {/* Device List */}
        <FlatList<Device>
          data={filteredItems}
          renderItem={renderDeviceCard}
          keyExtractor={(item) =>
            item.id || item.deviceId || Math.random().toString()
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          onEndReached={handleShowMore}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </View>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>Device Details</Text>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Image */}
              {selectedDevice && getImageUrl(selectedDevice) ? (
                <TouchableOpacity
                  onPress={() => handleImagePress(getImageUrl(selectedDevice)!)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: getImageUrl(selectedDevice)! }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayBadge}>
                    <MaterialIcons name="zoom-in" size={16} color="#fff" />
                    <Text style={styles.imageOverlayText}>Tap to expand</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noImageBox}>
                  <MaterialIcons
                    name="image-not-supported"
                    size={40}
                    color="#cbd5e1"
                  />
                  <Text style={styles.noImageBoxText}>No Image Available</Text>
                </View>
              )}

              {/* Details */}
              <View style={styles.modalDetailsSection}>
                <View style={styles.modalDetailItem}>
                  <View style={styles.modalDetailIconWrapper}>
                    <MaterialIcons name="label" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Device Name</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedDevice?.deviceName || "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDetailItem}>
                  <View style={styles.modalDetailIconWrapper}>
                    <MaterialIcons
                      name="fingerprint"
                      size={20}
                      color="#3b82f6"
                    />
                  </View>
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Device ID</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedDevice?.deviceId || "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDetailItem}>
                  <View style={styles.modalDetailIconWrapper}>
                    <MaterialIcons name="info" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Status</Text>
                    <View
                      style={[
                        styles.modalStatusBadge,
                        {
                          backgroundColor:
                            selectedDevice?.status === "ACTIVE"
                              ? "#dcfce7"
                              : "#fee2e2",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.modalStatusDot,
                          {
                            backgroundColor:
                              selectedDevice?.status === "ACTIVE"
                                ? "#22c55e"
                                : "#ef4444",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.modalStatusText,
                          {
                            color:
                              selectedDevice?.status === "ACTIVE"
                                ? "#16a34a"
                                : "#dc2626",
                          },
                        ]}
                      >
                        {selectedDevice?.status || "UNKNOWN"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalDetailItem}>
                  <View style={styles.modalDetailIconWrapper}>
                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color="#3b82f6"
                    />
                  </View>
                  <View style={styles.modalDetailContent}>
                    <Text style={styles.modalDetailLabel}>Address</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedDevice?.address || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={async () => {
                    if (selectedDevice?.config) {
                      await handleConfiguration(selectedDevice.config);
                    }
                    setDetailsVisible(false);
                    router.push({
                      pathname: "./DeviceDetails",
                      params: {
                        selectedItem: JSON.stringify(selectedDevice),
                        isEdit: "true",
                      },
                    });
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={styles.editButtonText}>Edit Device</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setDetailsVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setImagePreviewVisible(false)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: previewImageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  searchResultsText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  imageWrapper: {
    width: "100%",
    height: 160,
    backgroundColor: "#f8fafc",
    position: "relative",
  },
  deviceImage: {
    width: "100%",
    height: "100%",
  },
  zoomButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageWrapper: {
    width: "100%",
    height: 160,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  noImageText: {
    marginTop: 8,
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  deviceIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  deviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginLeft: 8,
    // marginRight: 8,
    minWidth: 55,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  footerContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppConstants.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    minWidth: 220,
  },
  showMoreButtonDisabled: {
    opacity: 0.6,
  },
  showMoreText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerInfo: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  allLoadedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
  },
  allLoadedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalHeaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f8fafc",
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  imageOverlayBadge: {
    position: "absolute",
    bottom: 12,
    right: 32,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  imageOverlayText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  noImageBox: {
    height: 220,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  noImageBoxText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  modalDetailsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  modalDetailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalDetailIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalDetailContent: {
    flex: 1,
    paddingTop: 2,
  },
  modalDetailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalDetailValue: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
    lineHeight: 22,
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 2,
  },
  modalStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppConstants.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: width * 0.95,
    height: height * 0.8,
  },
});

export default DeviceRecords;
