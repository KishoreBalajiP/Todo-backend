const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  // NEW FIELD: premium unlock flag
  subscriptionActive: {
    type: Boolean,
    default: false,
  },

  // NEW FIELD: MFA enabled status
  mfaEnabled: {
    type: Boolean,
    default: false,
  },

  // NEW FIELD: Google Authenticator secret key (base32)
  mfaSecret: {
    type: String,
    default: null,
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);