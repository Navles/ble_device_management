import { Coordinates, LoginState } from '../../types/types';
import appConstants from '../utlis/AppConstants';

interface PayloadData {
  name?: string;
  data?: any;
  address?: string;
  latitude?: string;
  longitude?: string;
  qrValue?: string;
  imageValue?: string;
  fileKey?: string;
  token?: string;
}

export default {
  state: {
    userLocation: {
      address: '',
    },
    userCoOrdinates: {
      latitude: '',
      longitude: '',
    },
    deviceQrValue: '',
    imagePath: '',
    fetchError: undefined,
    token: '',
    fileKey: '',
    deviceDetails: {
      deviceName: '',
      deviceId: '',
      simNumber: '',
      cardNumber: '',
      deviceCode: '',
      depth: '',
      sector: '',
      team: '',
      path: '',
      bin: '',
      type: '',
    },
    isEdit: false,
    config: [],
  } as LoginState,

  reducers: {
    setUserLocation(state: LoginState, payload: { address: string }): LoginState {
      return {
        ...state,
        userLocation: {
          address: payload.address,
        },
      };
    },
    setDeviceQrValue(state: LoginState, payload: { qrValue: string }): LoginState {
      return {
        ...state,
        deviceQrValue: payload.qrValue,
      };
    },
    setImageDetails(state: LoginState, payload: { imageValue: string }): LoginState {
      return {
        ...state,
        imagePath: payload.imageValue,
      };
    },
    setFileKey(state: LoginState, payload: { fileKey: string }): LoginState {
      console.log('payload', payload);
      return {
        ...state,
        fileKey: payload.fileKey,
      };
    },
    setUserCoOrdinates(state: LoginState, payload: Coordinates): LoginState {
      return {
        ...state,
        userCoOrdinates: {
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      };
    },
    setToken(state: LoginState, payload: { token: string }): LoginState {
      return {
        ...state,
        token: payload.token,
      };
    },
    setIsEdit(state: LoginState, payload: boolean): LoginState {
      return {
        ...state,
        isEdit: payload,
      };
    },
    setDeviceDetails(state: LoginState, payload: Partial<LoginState['deviceDetails']>): LoginState {
      return {
        ...state,
        deviceDetails: {
          ...state.deviceDetails,
          ...payload,
        },
      };
    },
    setError(state: LoginState, payload: any): LoginState {
      return {
        ...state,
        fetchError: payload,
      };
    },
    setConfig(state: LoginState, payload: any[]): LoginState {
      return {
        ...state,
        config: payload,
      };
    },
  },

  effects: (dispatch: any) => ({
    async handleUserDetails(payload: PayloadData) {
      try {
        if (payload.name === appConstants.address) {
          dispatch.LoginModel.setUserLocation(payload.data);
        }
        if (payload.name === appConstants.coordinates) {
          dispatch.LoginModel.setUserCoOrdinates(payload.data);
        }
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleEmptyUserDetails() {
      try {
        dispatch.LoginModel.setUserLocation({ address: '' });
        dispatch.LoginModel.setUserCoOrdinates({
          latitude: '',
          longitude: '',
        });
        dispatch.LoginModel.setDeviceQrValue({ qrValue: '' });
        dispatch.LoginModel.setImageDetails({ imageValue: '' });
        dispatch.LoginModel.setFileKey({ fileKey: '' });
        dispatch.LoginModel.setIsEdit(false);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleQrDetails(payload: string) {
      try {
        const data = {
          qrValue: payload,
        };
        dispatch.LoginModel.setDeviceQrValue(data);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleConfigUpdate(payload: any[]) {
      console.log('payloadConfig', payload);
      try {
        dispatch.LoginModel.setConfig(payload);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleDeviceImage(payload: string) {
      try {
        const data = {
          imageValue: payload,
        };
        dispatch.LoginModel.setImageDetails(data);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleApiToken(payload: string) {
      try {
        const data = {
          token: payload,
        };
        dispatch.LoginModel.setToken(data);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleFileKey(payload: string) {
      try {
        const data = {
          fileKey: payload,
        };
        console.log('load=======>', payload, data);
        dispatch.LoginModel.setFileKey(data);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleDeviceDetails(payload: Partial<LoginState['deviceDetails']>) {
      try {
        dispatch.LoginModel.setDeviceDetails(payload);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleIsEdit(payload: boolean) {
      try {
        dispatch.LoginModel.setIsEdit(payload);
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },

    async handleUserAddress(payload: Coordinates) {
      const apiKey = 'AIzaSyBieos3XOdthBCASzsAvKOvdg8XD5BvD_k';
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${payload.latitude},${payload.longitude}&key=${apiKey}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        const json = await response.json();
        if (response.ok && json.results && json.results.length > 0) {
          const addressValue = {
            address: json.results[0].formatted_address,
          };
          dispatch.LoginModel.setUserLocation(addressValue);
        }
      } catch (error) {
        dispatch.LoginModel.setError(error);
      }
    },
  }),
};