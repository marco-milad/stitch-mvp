// Metro config tuned for a pnpm workspace + NativeWind v4.
// - watchFolders lets Metro pick up changes in shared packages (packages/*)
// - nodeModulesPaths + disableHierarchicalLookup makes module resolution
//   deterministic when pnpm hoists dependencies locally (.npmrc: node-linker=hoisted).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: './global.css' });
