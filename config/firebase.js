const admin = require("firebase-admin");
const serviceAccount = require("../bus-tracking-3ddab-firebase-adminsdk-fbsvc-14a71e8298.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;