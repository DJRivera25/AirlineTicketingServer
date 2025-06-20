const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: function () {
        return !this.isOAuthUser;
      },
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
    },
    password: {
      type: String,
      required: function () {
        return !this.isOAuthUser;
      },
    },
    mobileNo: {
      type: String,
      required: function () {
        return !this.isOAuthUser;
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },

    /*=============GOOGLE LOGIN SECTION===============  */
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple nulls
    },
    profilePicture: String,
    displayName: String,
    isOAuthUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
