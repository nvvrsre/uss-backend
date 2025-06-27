// This file is used to start the auth service
const app = require('./server');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Auth service running on port ${PORT}`);
});
