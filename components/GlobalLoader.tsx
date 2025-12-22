// components/GlobalLoader.tsx
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import AppConstants from '../app/utlis/AppConstants';

interface GlobalLoaderProps {
  visible: boolean;
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ 
  visible, 
  message = 'Loading...' 
}) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator 
            size="large" 
            color={AppConstants.colors.highlight} 
          />
          <Text style={styles.loaderText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    backgroundColor: AppConstants.colors.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    minWidth: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: AppConstants.colors.textPrimary,
    fontWeight: '600',
  },
});

export default GlobalLoader;