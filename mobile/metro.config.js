// Lets the app import shared code from ../lib (pricing, services, i18n, data layer) as "@shared/...".
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../lib");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
// supabase-js realtime otherwise resolves the Node-only "ws" package on native.
config.resolver.unstable_enablePackageExports = false;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = moduleName.startsWith("@shared/") ? path.join(sharedRoot, moduleName.slice("@shared/".length)) : moduleName;
  return (upstream ?? context.resolveRequest)(context, target, platform);
};

module.exports = config;
