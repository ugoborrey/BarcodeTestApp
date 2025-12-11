const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Path to the local library
const localLibPath = path.resolve(__dirname, '../mobile-scanner-1');

// Packages that should be resolved from the app's node_modules (not the library's)
const sharedDependencies = {
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react-native-vision-camera': path.resolve(__dirname, 'node_modules/react-native-vision-camera'),
  'react-native-worklets-core': path.resolve(__dirname, 'node_modules/react-native-worklets-core'),
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [localLibPath],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
    extraNodeModules: {
      ...sharedDependencies,
      'react-native-vision-camera-barcodes-scanner': localLibPath,
    },
    // Block the library's node_modules from being used
    blockList: [
      new RegExp(`${localLibPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react/.*`),
      new RegExp(`${localLibPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react-native/.*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
