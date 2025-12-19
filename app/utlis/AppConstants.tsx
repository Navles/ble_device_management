// AppConstants.tsx - Centralized constants for the application
export default {
  // Redux action types
  address: 'address',
  coordinates: 'coordinates',

  // Screen names
  screens: {
    login: 'Login',
    mainScreen: 'MainScreen',
    deviceRecords: 'DeviceRecords',
    bleScan: 'BleScan',
    deviceDetails: 'DeviceDetails',
    cameraComp: 'CameraComp',
  },

  // API Endpoints
  api: {
    baseURL: 'https://ctm.sensz.ai/bo',
    endpoints: {
      login: '/user/login',
      device: '/device',
      deviceDic: '/device/dic',
      deviceHistory: '/device/history',
      upload: '/upload',
      register: '/register',
    },
  },

  // Authentication
  auth: {
    basicAuth: 'Basic c2Vuc3p1c2VyOlNlbnN6QUktMjAyNA==',
  },

  // Messages
  messages: {
    success: {
      loginSuccess: 'Login successful',
      deviceCreated: 'Device created successfully',
      deviceUpdated: 'Device updated successfully',
      imageUploaded: 'Image uploaded successfully',
      diagnosticsComplete: 'Diagnostics completed successfully',
    },
    error: {
      loginFailed: 'Login failed. Please check your credentials.',
      invalidEmail: 'Please enter a valid email address',
      invalidPassword: 'Password is required',
      bluetoothOff: 'Please turn on Bluetooth to continue scanning.',
      locationPermissionDenied: 'Location permission denied',
      fetchError: 'Failed to fetch data',
      deviceNotFound: 'Device not found',
      noRecordsFound: 'No Records Found',
      emptyDepth: 'Please enter the depth',
      emptySector: 'Please enter the sector',
      emptyTeam: 'Please select the team',
      emptyType: 'Please select the type',
      emptyBin: 'Please select the bin type',
    },
    info: {
      scanning: 'Scanning...',
      loading: 'Loading...',
      fetchingLocation: 'Fetching location...',
      multipleDevicesDetected: 'Multiple devices detected!',
      pleaseWait: 'Please wait...',
    },
  },

  // Device types
  deviceTypes: {
    dic: 'DIC',
    bin: 'BIN',
  },

  // Team options
  teamOptions: [
    'CSDT1', 'CSDT2', 'CSDT3', 'CSDT4', 'CSDT5', 'CSDT6', 'CSDT7', 'CSDT8', 'CSDT9',
    'HWPIE1', 'HWSLE1', 'HWTPE1', 'HWPIE2', 'HWECP1', 'HWKPE1', 'HWBKE1', 'HWKJE1',
    'HWCTE1', 'HWAYE1', 'NEDT1', 'NEDT2', 'NEDT3', 'NEDT4', 'NEDT5', 'NEDT6', 'NEDT7',
    'NEDT8', 'NEDT9', 'NEDT10', 'NEDT11',
  ],

  // Row options for pagination
  rowOptions: ['10', '20', '30', '100', '500', '1000'],

  // Bin types (default - can be overridden by remote config)
  binTypes: [
    'Type A',
    'Type B',
    'Type C',
    'Commercial',
    'Residential',
    'Industrial',
    'Organic',
    'Recyclable',
    'General Waste',
    'Hazardous',
  ],

  // Login - No API authentication required
  login: {
    enabled: true,
  },

  // Timeouts and delays
  timeouts: {
    scanDuration: 10000,
    scanClickDelay: 5000,
    popupDuration: 5000,
    toastDuration: 4000,
  },

  // Bluetooth
  bluetooth: {
    devicePrefix: 'Sens.Ai',
  },

  // Google Maps API
  googleMaps: {
    apiKey: 'AIzaSyBieos3XOdthBCASzsAvKOvdg8XD5BvD_k',
  },

  // Firebase Remote Config keys
  remoteConfig: {
    dropdownValues: 'dropDownValues',
  },

  // Colors
  colors: {
    primary: '#CE132A',
    secondary: '#333333',
    white: '#FFFFFF',
    background: '#f8f9fa',
    error: '#ff0000',
    success: '#41D094',
    warning: '#FFA500',
    tableHeader: '#E9E3D5',
  },

  // Copyright
  copyright: {
    text: 'Copyright © {year} Alai Labs.',
  },
};