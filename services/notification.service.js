const admin = require("../config/firebase");

// 🔹 single
exports.sendToToken = async (token, title, body) => {
  return admin.messaging().send({
    token,
    notification: { title, body },
  });
};

// 🔹 multiple
exports.sendToMultiple = async (tokens, title, body) => {
  return admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
  });
};