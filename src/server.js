const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Web app running on port ${env.port}`);
});
