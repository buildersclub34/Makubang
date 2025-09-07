import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { deliveryAPI } from '../services/api';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp?: number;
}

interface LocationContextType {
  currentLocation: Location | null;
  isLocationEnabled: boolean;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  updateLocation: (location: Location) => void;
  requestLocationPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location for delivery tracking',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setIsLocationEnabled(true);
          getCurrentLocation();
          return true;
        } else {
          Alert.alert(
            'Permission Required',
            'Location permission is required for delivery tracking'
          );
          return false;
        }
      } else {
        // iOS permission handling
        Geolocation.requestAuthorization(
          () => {
            setIsLocationEnabled(true);
            getCurrentLocation();
          },
          (error) => {
            console.error('Location permission error:', error);
            Alert.alert(
              'Permission Required',
              'Location permission is required for delivery tracking'
            );
          }
        );
        return true;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setCurrentLocation(location);
      },
      (error) => {
        console.error('Get location error:', error);
        Alert.alert('Error', 'Failed to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  };

  const startTracking = async (): Promise<void> => {
    if (!isLocationEnabled) {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;
    }

    if (isTracking) return;

    const id = Geolocation.watchPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setCurrentLocation(location);

        // Send location update to server
        try {
          await deliveryAPI.updateLocation(location);
        } catch (error) {
          console.error('Location update error:', error);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 3000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  };

  const updateLocation = (location: Location) => {
    setCurrentLocation(location);
  };

  const value: LocationContextType = {
    currentLocation,
    isLocationEnabled,
    isTracking,
    startTracking,
    stopTracking,
    updateLocation,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};