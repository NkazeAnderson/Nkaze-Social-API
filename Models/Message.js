const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    media: Array,
    sender: String,
    viewed: {type: Boolean, default: false}
  },

  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
