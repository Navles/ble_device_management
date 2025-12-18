// DeviceDetails.tsx
import firebase from '@react-native-firebase/app';
import { NavigationProp, RouteProp, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useDispatch } from 'react-redux';
import AppConstants from "../app/utlis/AppConstants";
import { showToastFail } from '../app/utlis/ToastConfig';
import { DeviceDetails as DeviceDetailsType, DropdownItem, RouteParams } from '../types/types';

const teamOptions: DropdownItem[] = [
  { label: 'CSDT1', value: 'CSDT1' },
  { label: 'CSDT2', value: 'CSDT2' },
  { label: 'CSDT3', value: 'CSDT3' },
  { label: 'CSDT4', value: 'CSDT4' },
  { label: 'CSDT5', value: 'CSDT5' },
  { label: 'CSDT6', value: 'CSDT6' },
  { label: 'CSDT7', value: 'CSDT7' },
  { label: 'CSDT8', value: 'CSDT8' },
  { label: 'CSDT9', value: 'CSDT9' },
  { label: 'HWPIE1', value: 'HWPIE1' },
  { label: 'HWSLE1', value: 'HWSLE1' },
  { label: 'HWTPE1', value: 'HWTPE1' },
  { label: 'HWPIE2', value: 'HWPIE2' },
  { label: 'HWECP1', value: 'HWECP1' },
  { label: 'HWKPE1', value: 'HWKPE1' },
  { label: 'HWBKE1', value: 'HWBKE1' },
  { label: 'HWKJE1', value: 'HWKJE1' },
  { label: 'HWCTE1', value: 'HWCTE1' },
  { label: 'HWAYE1', value: 'HWAYE1' },
  { label: 'NEDT1', value: 'NEDT1' },
  { label: 'NEDT2', value: 'NEDT2' },
  { label: 'NEDT3', value: 'NEDT3' },
  { label: 'NEDT4', value: 'NEDT4' },
  { label: 'NEDT5', value: 'NEDT5' },
  { label: 'NEDT6', value: 'NEDT6' },
  { label: 'NEDT7', value: 'NEDT7' },
  { label: 'NEDT8', value: 'NEDT8' },
  { label: 'NEDT9', value: 'NEDT9' },
  { label: 'NEDT10', value: 'NEDT10' },
  { label: 'NEDT11', value: 'NEDT11' },
];

const typeOptions: DropdownItem[] = [
  { label: 'DIC', value: 'DIC' },
  { label: 'BIN', value: 'BIN' },
];

type DeviceDetailsRouteProp = RouteProp<Record<string, RouteParams>, string>;

interface DeviceDetailsProps {
  route: DeviceDetailsRouteProp;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { deviceName: initialDeviceName, selectedItem, isEdit } = route.params;

  const [deviceName, setDeviceName] = useState<string>(
    isEdit ? selectedItem?.deviceName || '' : initialDeviceName || ''
  );
  const [deviceId, setDeviceId] = useState<string>(
    isEdit ? selectedItem?.deviceId || '' : route.params.deviceId || ''
  );
  const [simNumber, setSimNumber] = useState<string>(
    isEdit ? selectedItem?.mobileNumber || '' : ''
  );
  const [cardNumber, setCardNumber] = useState<string>(
    isEdit ? selectedItem?.cardNumber || '' : ''
  );
  const [deviceCode, setDeviceCode] = useState<string>(
    isEdit ? selectedItem?.deviceCode || '' : route.params.deviceCode || ''
  );
  const [sector, setSector] = useState<string>(
    isEdit ? selectedItem?.sector || '' : ''
  );
  const [team, setTeam] = useState<string>(isEdit ? selectedItem?.team || '' : '');
  const [type, setType] = useState<string>(isEdit ? selectedItem?.type || '' : '');
  const [bin, setBin] = useState<string>(isEdit ? selectedItem?.binType || '' : '');
  const [depth, setDepth] = useState<string>(isEdit ? selectedItem?.depth || '' : '');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [items] = useState<DropdownItem[]>(teamOptions);
  const [types] = useState<DropdownItem[]>(typeOptions);
  const [bins, setBins] = useState<DropdownItem[]>([]);

  const [open, setOpen] = useState<boolean>(false);
  const [typeOpen, setTypeOpen] = useState<boolean>(false);
  const [binOpen, setBinOpen] = useState<boolean>(false);

  const dispatch = useDispatch<any>();

  const reduxFunction = async (datavalues: boolean): Promise<void> => {
    await dispatch.LoginModel.handleIsEdit(datavalues);
  };

  useEffect(() => {
    if (isEdit) {
      reduxFunction(isEdit);
    }
  }, [isEdit]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    const str = firebase.remoteConfig().getValue('dropDownValues').asString();
    const str_array = str.split(',');
    const dropdownItem: DropdownItem[] = [];
    for (let i = 0; i < str_array.length; i++) {
      str_array[i] = str_array[i].replace(/^\s*/, '').replace(/\s*$/, '');
      const dummy: DropdownItem = { label: str_array[i], value: str_array[i] };
      dropdownItem.push(dummy);
    }
    setBins(dropdownItem);
    console.log('dropdownItem', dropdownItem);
  }, []);

  const requestLocationPermission = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getUserCurrentLocation();
      } else {
        setError('Location permission denied');
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setError('Failed to request location permission');
    }
  };

  const getUserCurrentLocation = async (): Promise<void> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
    } catch (error) {
      console.error('Error fetching location:', error);
      setError('Unable to fetch location');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!depth) {
      showToastFail({
        message: 'Please enter the depth',
        visibilityTime: 5000,
        position: 'bottom',
      });
      return;
    }
    if (!sector) {
      showToastFail({
        message: 'Please enter the sector',
        visibilityTime: 5000,
        position: 'bottom',
      });
      return;
    }
    if (!team) {
      showToastFail({
        message: 'Please select the team',
        visibilityTime: 5000,
        position: 'bottom',
      });
      return;
    }
    if (!type) {
      showToastFail({
        message: 'Please select the type',
        visibilityTime: 5000,
        position: 'bottom',
      });
      return;
    }
    if (type === 'BIN' && !bin) {
      showToastFail({
        message: 'Please select the bin type',
        visibilityTime: 5000,
        position: 'bottom',
      });
      return;
    }

    const deviceDetails: DeviceDetailsType = {
      deviceName,
      deviceId,
      simNumber,
      cardNumber,
      deviceCode,
      depth,
      sector,
      team,
      type,
      bin,
      path: '',
    };

    const datavalues = {
      name: AppConstants.coordinates,
      data: {
        latitude,
        longitude,
      },
    };

    await dispatch.LoginModel.handleUserDetails(datavalues);
    await dispatch.LoginModel.handleDeviceDetails(deviceDetails);
    await dispatch.LoginModel.handleUserAddress(datavalues.data);

    navigation.navigate('CameraComp');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>
          {isEdit ? 'Edit Device' : 'Create Device'}
        </Text>

        <Text style={styles.label}>Device Name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          editable={false}
          placeholder="Device Name"
        />

        <Text style={styles.label}>Device ID</Text>
        <TextInput
          style={styles.input}
          value={deviceId}
          editable={false}
          placeholder="Device ID"
        />

        <Text style={styles.label}>Latitude</Text>
        <TextInput
          style={styles.input}
          value={latitude}
          editable={false}
          placeholder="Latitude"
        />

        <Text style={styles.label}>Longitude</Text>
        <TextInput
          style={styles.input}
          value={longitude}
          editable={false}
          placeholder="Longitude"
        />

        <Text style={styles.label}>DIC height (cm)</Text>
        <TextInput
          style={styles.input}
          value={depth}
          onChangeText={setDepth}
          placeholder="Depth"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Sector</Text>
        <TextInput
          style={styles.input}
          value={sector}
          onChangeText={setSector}
          placeholder="Sector"
        />

        <Text style={styles.label}>Team</Text>
        <DropDownPicker
          open={open}
          value={team}
          items={items}
          setOpen={setOpen}
          setValue={setTeam}
          setItems={() => {}}
          placeholder="Select Team"
          style={{ marginBottom: 30, marginTop: 20 }}
          dropDownContainerStyle={{ zIndex: 1000 }}
          listMode="SCROLLVIEW"
          dropDownDirection="TOP"
        />

        <Text style={styles.label}>Type</Text>
        <DropDownPicker
          open={typeOpen}
          value={type}
          items={types}
          setOpen={setTypeOpen}
          setValue={setType}
          setItems={() => {}}
          placeholder="Select Type"
          style={{ marginBottom: 30, marginTop: 10 }}
          dropDownContainerStyle={{ zIndex: 1000 }}
          listMode="SCROLLVIEW"
          dropDownDirection="BOTTOM"
        />

        {type === 'BIN' && (
          <>
            <Text style={styles.label}>Bin Type</Text>
            <DropDownPicker
              open={binOpen}
              value={bin}
              items={bins}
              setOpen={setBinOpen}
              setValue={setBin}
              setItems={setBins}
              placeholder="Select Bin Type"
              style={{ marginBottom: 30, marginTop: 20 }}
              dropDownContainerStyle={{
                backgroundColor: 'white',
              }}
              listMode="SCROLLVIEW"
              dropDownDirection="TOP"
            />
          </>
        )}

        <Button title="Take Photo" onPress={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    color: 'black',
  },
});

export default DeviceDetails;