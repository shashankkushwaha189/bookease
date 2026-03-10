
// Full production entry point
require('dotenv').config();
const app = require('./app.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 BookEase API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
