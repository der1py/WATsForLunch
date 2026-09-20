const appJson = require('./app.json');

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    // Safe to embed: this only controls local console diagnostics.
    openAiDebug: process.env.OPENAI_DEBUG === 'true',
  },
});
