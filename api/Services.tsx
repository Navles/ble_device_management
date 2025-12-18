// DataServices.ts
import { ApiResponse, Device, DeviceApiResponse } from '../types/types';

const baseURL = `https://api.pixvisonz.com/v1/devices`;
const baseURLForSensz = `http://sensz.pixvisonz.com:8094/api/v1`;
const newUrl = 'https://ctm.sensz.ai/bo';

interface RequestData {
  row?: string;
  deviceType?: string;
  [key: string]: any;
}

interface LoginCredentials {
  emailId: string;
  password: string;
}

const responseBuilder = async <T,>(data: Response): Promise<T> => {
  try {
    const json = await data.json();
    return json as T;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getRecords = async (data: RequestData): Promise<ApiResponse<Device[]>> => {
  try {
    const recordsInfo = await fetch(
      `${newUrl}?deviceType=${data.deviceType}&page=0&size=${data.row}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    return await responseBuilder<ApiResponse<Device[]>>(recordsInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deviceDetailsAPI = async (data: any): Promise<ApiResponse<any>> => {
  try {
    const deviceInfo = await fetch(`${newUrl}/register`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await responseBuilder<ApiResponse<any>>(deviceInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const CreateDevice = async (data: any, token: string): Promise<ApiResponse<any>> => {
  try {
    const createDeviceInfo = await fetch(`${newUrl}/device`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await responseBuilder<ApiResponse<any>>(createDeviceInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const UpdateDevice = async (
  data: any,
  token: string,
  deviceId: string
): Promise<ApiResponse<any>> => {
  console.log('apientering', data, deviceId);
  try {
    const updateDeviceInfo = await fetch(`${newUrl}/device/${deviceId}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    console.log('url', `${newUrl}/device/${deviceId}`);
    return await responseBuilder<ApiResponse<any>>(updateDeviceInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const UploadImage = async (data: any, token: string): Promise<ApiResponse<any>> => {
  try {
    const uploadImageInfo = await fetch(`${newUrl}/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await responseBuilder<ApiResponse<any>>(uploadImageInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const login = async (credentials: LoginCredentials): Promise<ApiResponse<any>> => {
  try {
    const userLogin = await fetch(`${newUrl}/user/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Basic c2Vuc3p1c2VyOlNlbnN6QUktMjAyNA==',
      },
      body: JSON.stringify(credentials),
    });
    return await responseBuilder<ApiResponse<any>>(userLogin);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getDicDevice = async (
  data: RequestData,
  token: string
): Promise<ApiResponse<DeviceApiResponse>> => {
  console.log('apientering');
  try {
    const getDeviceInfo = await fetch(
      `${newUrl}/device/dic?&pageNo=0&pageSize=${data.row}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return await responseBuilder<ApiResponse<DeviceApiResponse>>(getDeviceInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const fetchDeviceUsingDeviceId = async (
  deviceId: string
): Promise<ApiResponse<Device[]>> => {
  console.log('apientering');
  try {
    const getDeviceInfo = await fetch(
      `${newUrl}/device/history?deviceId=${deviceId}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    return await responseBuilder<ApiResponse<Device[]>>(getDeviceInfo);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default {
  deviceDetailsAPI,
  getRecords,
  CreateDevice,
  UploadImage,
  login,
  getDicDevice,
  UpdateDevice,
  fetchDeviceUsingDeviceId,
};