const mongoose = require('mongoose');
const slugify = require('slugify');

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',       // ← your existing Student model
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    // category: {
    //   type:     String,
    //   required: [true, 'Category is required'],
    //   enum: [
    //     'food', 'fashion', 'technology', 'education',
    //     'health', 'beauty', 'sports', 'entertainment',
    //     'services', 'other',
    //   ],
    // },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    coverImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    contact: {
      phone: { type: String, default: null },
      email: { type: String, default: null },
      whatsapp: { type: String, default: null },
      address: { type: String, default: null },
    },
    socialLinks: {
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      twitter: { type: String, default: null },
      website: { type: String, default: null },
      youtube: { type: String, default: null },
    },
    location: {
      city: { type: String, default: null },
      area: { type: String, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    rejectionReason: { type: String, default: null },

    // Analytics
    totalViews: { type: Number, default: 0 },
    totalContactClicks: { type: Number, default: 0 },

    // Ratings
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Auto slug ─────────────────────────────────────────────────────────────────
businessSchema.pre('save', async function () {
  if (!this.isModified('name')) return;
  this.slug = slugify(this.name, { lower: true }) + '-' + Date.now();
});

// ── Calculate average rating ──────────────────────────────────────────────────
businessSchema.methods.calcAverageRating = function () {
  if (!this.ratings.length) {
    this.averageRating = 0;
    this.totalRatings = 0;
    return;
  }
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
  this.totalRatings = this.ratings.length;
};

module.exports = mongoose.model('Business', businessSchema);