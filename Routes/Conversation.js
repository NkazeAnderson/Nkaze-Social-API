const router = require("express").Router();
const errorHandler = require("../ErrorHandler/index");
const messageModel = require("../Models/Message");
const conversationModel = require("../Models/Conversation");
const multer = require("multer");
const AppError = require("../ErrorHandler/customError");
const fs = require("fs");

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    if (req.session.user._id.toString() != req.post.owner._id.toString()) {
      if (req.session.user.isAdmin) {
        return next();
      }
      throw new AppError(403, "Unauthorized");
    } else {
      return next();
    }
  } catch (err) {
    next(err);
  }
};

const conversationExist = async (req, res, next) => {
  try {
    const idLength = req.params.id.toString().length;

    if (idLength != 24) {
      throw new AppError(400, "Invalid id");
    }

    const conversation = await conversationModel
      .findById(req.params.id)
      .populate("sender", "_id first_name last_name profile_pic")
      .populate("reciever", "_ id first_name last_name profile_pic");

    if (!conversation) {
      throw new AppError(400, "conversation does not exits");
    } else {
      req.conversation = conversation;
      next();
    }
  } catch (err) {
    next(err);
  }
};

router.get("/", async (req, res, next) => {
  try {
    const conversations = await conversationModel
      .find({
        $or: [
          {
            sender: req.session.user._id.toString(),
          },
          {
            reciever: req.session.user._id.toString(),
          },
        ],
      })
      .populate("sender", "_id first_name last_name profile_pic")
      .populate("reciever", "_ id first_name last_name profile_pic");

    return res.status(200).json({ conversations: conversations });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", conversationExist, async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const messages = await messageModel
      .find({
        conversation_id: conversation._id.toString(),
      })
      .populate("conversation_id");
    return res.status(200).json({ messages: messages });
  } catch (err) {
    next(err);
  }
});
router.use(errorHandler);
module.exports = router;
