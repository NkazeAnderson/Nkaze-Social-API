const mongoose = require("mongoose");
const messageModel = require("../Models/Message");

const ConversationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reciever: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  { timestamps: true,
  }
);

ConversationSchema.virtual("unread",{
  ref: "Message",
  localField: "_id",
  foreignField: "conversation_id",
  match:{viewed:false}
})

ConversationSchema.virtual("messages",{
  ref: "Message",
  localField: "_id",
  foreignField: "conversation_id",
})



module.exports = mongoose.model("Conversation", ConversationSchema);
