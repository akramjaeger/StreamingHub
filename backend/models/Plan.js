const mongoose = require("mongoose")

const planSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    price: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    stripePriceId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model("Plan", planSchema)
