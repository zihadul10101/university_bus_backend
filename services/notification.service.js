const admin = require("../config/firebase");
const User = require("../models/User");

exports.sendToToken = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: { title, body },
      data: data,
      token: token,
    };
    return await admin.messaging().send(message);
  } catch (error) {
    // যদি টোকেনটি ইনভ্যালিড হয় বা ইউজার অ্যাপ আনইনস্টল করে দেয়
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      console.log(`Removing invalid token for a user...`);
      await User.updateOne({ fcmToken: token }, { $unset: { fcmToken: "" } });
    }
    throw error;
  }
};

exports.sendToMultiple = async (tokens, title, body, data = {}) => {
  try {
    const message = {
      notification: { title, body },
      data: data,
      tokens: tokens,
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // মাল্টিকাস্টের ক্ষেত্রে ইনভ্যালিড টোকেনগুলো খুঁজে বের করে রিমুভ করা
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          if (errorCode === 'messaging/registration-token-not-registered' || 
              errorCode === 'messaging/invalid-registration-token') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      
      if (invalidTokens.length > 0) {
        await User.updateMany({ fcmToken: { $in: invalidTokens } }, { $unset: { fcmToken: "" } });
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};