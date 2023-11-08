const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: String,
    photos: Array,
    like_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        default: [],
      },
    ],
    comments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: true },
    ],
  },
  {
    timestamps: true,
    virtuals: {
      like_count: {
        get() {
          return this.like_by.length;
        },
      },
      comment_count: {
        get() {
          return this.comments.length;
        },
      },
    },
  }
);

module.exports = mongoose.model("Post", postSchema);
