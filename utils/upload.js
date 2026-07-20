const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "drivers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // অপশনাল: বড় ছবি অটো রিসাইজ
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ✅ Multer/Cloudinary এরর JSON আকারে পাঠানোর জন্য wrapper middleware
const uploadSingleImage = (fieldName) => (req, res, next) => {
  const middleware = upload.single(fieldName);
  middleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ success: false, message: "ছবির সাইজ ৫MB-এর বেশি হতে পারবে না" });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      // allowed_formats ভায়োলেশন বা অন্য Cloudinary এরর
      return res.status(400).json({ success: false, message: err.message || "শুধু jpg, jpeg, png, webp ফরম্যাট গ্রহণযোগ্য" });
    }
    next();
  });
};

module.exports = { upload, uploadSingleImage, cloudinary };