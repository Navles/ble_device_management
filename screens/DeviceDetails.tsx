// screens/DeviceDetails.tsx (Updated)
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
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
import AppConstants from '../app/utlis/AppConstants';
import { showToastFail } from '../app/utlis/ToastConfig';
import GlobalLoader from '../components/GlobalLoader';
import { useLoading } from '../hooks/useLoading';
import { DeviceDetails as DeviceDetailsType, DropdownItem } from '../types/types';

const DeviceDetails: React.FC = () => {
  const params = useLocalSearchParams<{
    deviceName?: string;
    deviceId?: string;
    deviceCode?: string;
    selectedItem?: string;
    isEdit?: string;
  }>();

  const dispatch = useDispatch<any>();
  const { isLoading, loadingMessage, withLoader } = useLoading();

  const selectedItem = params.selectedItem 
    ? JSON.parse(params.selectedItem as string) 
    : null;
  const isEdit = params.isEdit === 'true';

  const [deviceName, setDeviceName] = useState<string>(
    isEdit ? selectedItem?.deviceName || '' : params.deviceName || ''
  );
  const [deviceId, setDeviceId] = useState<string>(
    isEdit ? selectedItem?.deviceId || '' : params.deviceId || ''
  );
  const [simNumber, setSimNumber] = useState<string>(
    isEdit ? selectedItem?.mobileNumber || '' : ''
  );
  const [cardNumber, setCardNumber] = useState<string>(
    isEdit ? selectedItem?.cardNumber || '' : ''
  );
  const [deviceCode, setDeviceCode] = useState<string>(
    isEdit ? selectedItem?.deviceCode || '' : params.deviceCode || ''
  );
  const [sector, setSector] = useState<string>(
    isEdit ? selectedItem?.sector || '' : ''
  );
  const [team, setTeam] = useState<string>(
    isEdit ? selectedItem?.team || '' : ''
  );
  const [type, setType] = useState<string>(
    isEdit ? selectedItem?.type || '' : ''
  );
  const [bin, setBin] = useState<string>(
    isEdit ? selectedItem?.binType || '' : ''
  );
  const [depth, setDepth] = useState<string>(
    isEdit ? selectedItem?.depth || '' : ''
  );
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [items] = useState<DropdownItem[]>(
    AppConstants.teamOptions.map(team => ({ label: team, value: team }))
  );
  const [types] = useState<DropdownItem[]>([
    { label: AppConstants.deviceTypes.dic, value: AppConstants.deviceTypes.dic },
    { label: AppConstants.deviceTypes.bin, value: AppConstants.deviceTypes.bin },
  ]);
  const [bins, setBins] = useState<DropdownItem[]>(
    AppConstants.binTypes.map(binType => ({ label: binType, value: binType }))
  );

  const [open, setOpen] = useState<boolean>(false);
  const [typeOpen, setTypeOpen] = useState<boolean>(false);
  const [binOpen, setBinOpen] = useState<boolean>(false);

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

  const requestLocationPermission = async (): Promise<void> => {
    await withLoader(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          await getUserCurrentLocation();
        } else {
          setError(AppConstants.messages.error.locationPermissionDenied);
        }
      } catch (error) {
        console.error('Permission request error:', error);
        setError(AppConstants.messages.error.fetchError);
      }
    }, 'Getting location...');
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
      setError(AppConstants.messages.error.fetchError);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!depth) {
      showToastFail({
        message: AppConstants.messages.error.emptyDepth,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: 'bottom',
      });
      return;
    }
    
    if (!sector) {
      showToastFail({
        message: AppConstants.messages.error.emptySector,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: 'bottom',
      });
      return;
    }
    
    if (!team) {
      showToastFail({
        message: AppConstants.messages.error.emptyTeam,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: 'bottom',
      });
      return;
    }
    
    if (!type) {
      showToastFail({
        message: AppConstants.messages.error.emptyType,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: 'bottom',
      });
      return;
    }
    
    if (type === AppConstants.deviceTypes.bin && !bin) {
      showToastFail({
        message: AppConstants.messages.error.emptyBin,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: 'bottom',
      });
      return;
    }

    await withLoader(async () => {
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

      await new Promise(resolve => setTimeout(resolve, 500));
      router.back();
    }, 'Saving device details...');
  };

  return (
    <>
      <GlobalLoader visible={isLoading} message={loadingMessage} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Device ID</Text>
          <TextInput
            style={styles.input}
            value={deviceId}
            editable={false}
            placeholder="Device ID"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            editable={false}
            placeholder="Latitude"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            editable={false}
            placeholder="Longitude"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>DIC height (cm)</Text>
          <TextInput
            style={styles.input}
            value={depth}
            onChangeText={setDepth}
            placeholder="Depth"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Sector</Text>
          <TextInput
            style={styles.input}
            value={sector}
            onChangeText={setSector}
            placeholder="Sector"
            placeholderTextColor="#999"
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

          {type === AppConstants.deviceTypes.bin && (
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
                  backgroundColor: AppConstants.colors.white,
                }}
                listMode="SCROLLVIEW"
                dropDownDirection="TOP"
              />
            </>
          )}

          <Button 
            title="Submit" 
            onPress={handleSubmit}
            color={AppConstants.colors.primary}
            disabled={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppConstants.colors.background,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: AppConstants.colors.secondary,
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
    backgroundColor: AppConstants.colors.white,
  },
});

export default DeviceDetails;