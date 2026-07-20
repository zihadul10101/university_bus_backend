const { cloudinary } = require("../middlewares/upload");

const safeDeleteCloudinaryImage = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (e) {
    console.error("Cloudinary delete failed:", e.message);
  }
};

module.exports = safeDeleteCloudinaryImage;