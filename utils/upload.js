const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// mimetype থেকে সঠিক extension বের করা (filename-এর উপর নির্ভর না করে)
const mimeToFormat = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const format = mimeToFormat[file.mimetype] || "jpg";
    return {
      folder: "drivers",
      format,
      public_id: `driver-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    };
  },
});

// ✅ allowed_formats সরিয়ে এখানে mimetype দিয়ে ভ্যালিডেশন করা হচ্ছে
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("শুধু jpg, jpeg, png, webp ফরম্যাট গ্রহণযোগ্য"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
      return res.status(400).json({ success: false, message: err.message || "শুধু jpg, jpeg, png, webp ফরম্যাট গ্রহণযোগ্য" });
    }
    next();
  });
};

module.exports = { upload, uploadSingleImage, cloudinary };