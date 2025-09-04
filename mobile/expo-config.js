
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
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
    buildNumber: '1.0.0',
    infoPlist: {
      NSCameraUsageDescription: 'This app uses the camera to take photos and videos for food content.',
      NSMicrophoneUsageDescription: 'This app uses the microphone to record audio for videos.',
      NSLocationWhenInUseUsageDescription: 'This app uses location to show nearby restaurants and delivery tracking.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses location to show nearby restaurants and delivery tracking.'
    },
    associatedDomains: [
      'applinks:makubang.com'
    ]
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF'
    },
    package: 'com.makubang.foodapp',
    versionCode: 1,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
      'com.android.vending.BILLING'
    ],
    googleServicesFile: './google-services.json',
    usesCleartextTraffic: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'makubang.com'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      }
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
        cameraPermission: 'Allow Makubang to access your camera to take photos and videos for food content.'
      }
    ],
    [
      'expo-av',
      {
        microphonePermission: 'Allow Makubang to access your microphone to record audio for videos.'
      }
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Makubang to use your location to show nearby restaurants and track deliveries.',
        locationAlwaysPermission: 'Allow Makubang to use your location to show nearby restaurants and track deliveries.',
        locationWhenInUsePermission: 'Allow Makubang to use your location to show nearby restaurants and track deliveries.'
      }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffffff',
        defaultChannel: 'makubang-orders',
        sounds: [
          './assets/sounds/order-notification.wav',
          './assets/sounds/message-notification.wav'
        ]
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: '34.0.0'
        },
        ios: {
          deploymentTarget: '13.0'
        }
      }
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Inter-Regular.ttf',
          './assets/fonts/Inter-Medium.ttf',
          './assets/fonts/Inter-SemiBold.ttf',
          './assets/fonts/Inter-Bold.ttf'
        ]
      }
    ],
    'expo-secure-store',
    'expo-linking',
    'expo-constants',
    'expo-file-system',
    'expo-image-picker',
    'expo-video',
    '@react-native-async-storage/async-storage'
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:5000',
    razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    environment: process.env.NODE_ENV || 'development',
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'your-project-id'
    }
  },
  owner: 'makubang',
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/your-project-id'
  },
  runtimeVersion: {
    policy: 'sdkVersion'
  },
  scheme: 'makubang',
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true
  }
};

export default config;
