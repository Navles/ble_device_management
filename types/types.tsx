export interface Coordinates {
  latitude: string;
  longitude: string;
}

export interface UserLocation {
  address: string;
  latitude?: string;
  longitude?: string;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface DeviceDetails {
  deviceName: string;
  deviceId: string;
  simNumber: string;
  cardNumber: string;
  deviceCode: string;
  depth: string;
  sector: string;
  team: string;
  path?: string;
  bin: string;
  type: string;
}

export interface Device {
  id: string;
  coordinates: string[];
  deviceType: string;
  latitude: string;
  longitude: string;
  address: string;
  deviceId: string;
  deviceStatus: string;
  image?: string;
  createdDateTime: number;
  modifiedDateTime: number;
  formattedCreatedDateTime: string;
  formattedModifiedDateTime: string;
  deviceName?: string;
  mobileNumber?: string;
  cardNumber?: string;
  deviceCode?: string;
  sector?: string;
  status?: string;
  team?: string;
  binType?: string;
  type?: string;
  depth?: string;
   config: ConfigItem[];
}

export interface ConfigItem {
  id: string;
  name: string;
  value: any;
}

export interface DropdownItem {
  label: string;
  value: string;
}

export interface LoginState {
  userLocation: {
    address: string;
  };
  userCoOrdinates: Coordinates;
  deviceQrValue: string;
  imagePath: string;
  fetchError?: any;
  token: string;
  fileKey: string;
  deviceDetails: DeviceDetails;
  isEdit: boolean;
  config: any[];
}

export interface RootState {
  LoginModel: LoginState;
}

export interface ApiResponse<T> {
  response: {
    body: T;
  };
  statusCode: number;
  data?: any;
  timeStamp?: string;
  message?: string;
}

export interface DeviceApiResponse {
  content: Device[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last?: boolean;
  totalElements?: number;
  totalPages?: number; // Added missing property
  first?: boolean;
  size?: number;
  number?: number;
  sort?: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  numberOfElements?: number;
  empty?: boolean;
}

export interface BLEDevice {
  id: string;
  name: string | null;
  rssi?: number;
  serviceUUIDs?: string[];
}

export interface RouteParams {
  deviceName?: string;
  deviceId?: string;
  latitude?: string;
  longitude?: string;
  deviceCode?: string;
  selectedItem?: Device;
  isEdit?: boolean;
}
