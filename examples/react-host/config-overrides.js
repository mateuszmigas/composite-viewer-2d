const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");
const WorkerPlugin = require("worker-plugin");

module.exports = function override(config, env) {
  config.resolve.plugins = config.resolve.plugins.filter(
    plugin => !(plugin instanceof ModuleScopePlugin)
  );
  config.plugins.push(new WorkerPlugin({ globalObject: "self" }));
  return config;
};
