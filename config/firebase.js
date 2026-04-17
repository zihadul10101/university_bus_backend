// const admin = require("firebase-admin");
// const serviceAccount = require("../bus-tracking-3ddab-firebase-adminsdk-fbsvc-9942eab2a3.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// module.exports = admin;

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

module.exports = admin;