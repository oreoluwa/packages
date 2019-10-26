const asyncifyStream = require('@oreoluwa/asyncifystream');
const path = require('path');

const title = 'Message Rewriting Plugin'

const init = (app, done) => {
  const enabledPlugins = Object.keys(app.config.plugins).filter(pluginName => app.config.plugins[pluginName].enabled);

  const supportedContentTypes = enabledPlugins.reduce((contentTypes, plugin) => {
    let { contentType } = app.config.plugins[plugin];

    if (!Array.isArray(contentType)) {
      contentType = [ contentType ];
    }

    contentType.forEach(contentTypes.add.bind(contentTypes));

    return contentTypes;
  }, new Set());

  const pluginMap = enabledPlugins.reduce((pluginMap, pluginName) => {
    const config = app.config.plugins[pluginName];
    const [pluginScope, mainPluginName] = pluginName.split('/');

    let handler;
    if (pluginScope === 'core') {
      handler = require(path.join(__dirname, 'plugins', mainPluginName));
    } else if (pluginScope === 'module') {
      handler = require(mainPluginName);
    } else if (pluginScope === 'custom') {
      handler = require(path.join(process.cwd(), 'rewritePlugins', mainPluginName));
    }

    const plugin = {
      config,
      handler,
    };

    pluginMap.set(pluginName, plugin);
    return pluginMap;
  }, new Map());

  app.addRewriteHook(
    (envelope, node) => supportedContentTypes.has(node.contentType),
    async (envelope, node, decoder, encoder) => {
      const data = await asyncifyStream(decoder, node.charset);
      node.setCharset('utf-8');

      const contextPluginNames = enabledPlugins.filter(pluginName => {
        const plugin = pluginMap.get(pluginName);
        return plugin.config.contentType.includes(node.contentType);
      });


      const chain = (plugins, pluginName, data) => {
        if (pluginName) {
          const plugin = pluginMap.get(pluginName);

          return plugin.handler(plugin.config, envelope, node, data, (err, updatedData) => {
            if (err) {
              throw err;
            }
            return chain(plugins ,plugins.shift(), updatedData);
          });
        }

        return data;
      };

      const resolvedData = chain(contextPluginNames, contextPluginNames.shift(), data);

      encoder.end(Buffer.from(resolvedData, node.charset || 'utf-8'))
    }
  );

  done();
};

module.exports = {
  init,
  title,
}
