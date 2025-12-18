import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, ToastConfig as ToastConfigType } from 'react-native-toast-message';

interface ToastShowParams {
  message: string;
  onHide?: () => void;
  visibilityTime?: number;
  position?: 'top' | 'bottom';
}

export const ToastConfig: ToastConfigType = {
  success: (props) => (
    <BaseToast
      text1NumberOfLines={3}
      {...props}
      style={{ borderLeftColor: '#41D094' }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '400',
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 16,
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
  message: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: 'orange',
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '400',
        color: 'black',
      }}
    />
  ),
  customToast: (props) => {
    return (
      <SafeAreaView edges={['bottom']}>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 16,
            width: '80%',
            backgroundColor: 'rgba(59,76,104,.9)',
          }}>
          <Text style={{ color: '#FFFFFF' }}>
            {props.text1|| ''}
          </Text>
        </View>
      </SafeAreaView>
    );
  },
};

export const showToast = ({
  message,
  onHide = () => {},
  visibilityTime = 4000,
}: ToastShowParams): void => {
  Toast.show({
    type: 'error',
    text1: message,
    onHide,
    visibilityTime,
  });
};

export const showToastSuccess = ({
  message,
  onHide = () => {},
  visibilityTime = 4000,
  position = 'top',
}: ToastShowParams): void => {
  Toast.show({
    type: 'success',
    text1: message,
    onHide,
    visibilityTime,
    position,
  });
};

export const showToastFail = ({
  message,
  onHide = () => {},
  visibilityTime = 4000,
  position = 'top',
}: ToastShowParams): void => {
  Toast.show({
    type: 'error',
    text1: message,
    onHide,
    visibilityTime,
    position,
  });
};

export const showToastMessage = ({
  message,
  onHide = () => {},
  visibilityTime = 4000,
}: Omit<ToastShowParams, 'position'>): void => {
  Toast.show({
    type: 'message',
    text1: message,
    onHide,
    visibilityTime,
  });
};

export const showCustomToast = ({
  message,
  onHide = () => {},
  visibilityTime = 4000,
}: Omit<ToastShowParams, 'position'>): void => {
  Toast.show({
    type: 'customToast',
    text1: { message } as any,
    position: 'bottom',
    onHide,
    visibilityTime,
  });
};