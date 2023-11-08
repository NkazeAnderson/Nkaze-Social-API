let mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, maxLength: 50, required: true },
    last_name: { type: String, maxLength: 50, required: true },
    email: { type: String, maxLength: 50, required: true },
    street: { type: String, maxLength: 50 },
    city: { type: String, maxLength: 30 },
    state: { type: String, maxLength: 30 },
    country: { type: String, maxLength: 30 },
    zip_code: { type: String, maxLength: 10 },
    phone: { type: String, maxLength: 15, required: true },
    password: { type: String, required: true },
    profile_pic: { type: String, required: true, default: "/noProfilePic.png" },
    cover_pic: { type: String, required: true, default: "/noCoverPic.png" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isAdmin: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
