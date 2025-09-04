const { getDefaultConfig } = require('@expo/metro-config');

// Create the default config
const config = getDefaultConfig(__dirname);

// Add support for SVG files
const { assetExts, sourceExts } = config.resolver;

config.transformer = {
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...sourceExts, 'svg'],
  resolverMainFields: ['react-native', 'browser', 'main'],
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add any custom middleware logic here
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
