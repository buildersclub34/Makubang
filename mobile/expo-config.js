
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Makubang',
  slug: 'makubang-food-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.makubang.foodapp',
    buildNumber: '1.0.0'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF'
    },
    package: 'com.makubang.foodapp',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED'
    ]
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro'
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Makubang to access your camera to record food videos.',
        microphonePermission: 'Allow Makubang to access your microphone to record food videos.',
        recordAudioAndroid: true
      }
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Allow Makubang to access your photos to upload food content.',
        savePhotosPermission: 'Allow Makubang to save photos to your device.',
        isAccessMediaLocationEnabled: true
      }
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Makubang to use your location to show nearby restaurants and track deliveries.'
      }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffffff',
        defaultChannel: 'default'
      }
    ],
    [
      'expo-build-properties',
      {
        ios: {
          newArchEnabled: false
        },
        android: {
          newArchEnabled: false
        }
      }
    ]
  ],
  extra: {
    router: {
      origin: false
    },
    eas: {
      projectId: '12345678-1234-1234-1234-123456789012'
    }
  },
  owner: 'makubang'
});
