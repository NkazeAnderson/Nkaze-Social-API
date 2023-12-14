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
      .populate("reciever", "_ id first_name last_name profile_pic")
      .populate({path: "messages", select: "message -_id media -conversation_id", options:{sort: "-createdAt", limit: 1}})
      .populate({path: "unread", match: {viewed: false, sender: {$ne: req.session.user._id}}, select: "_id -conversation_id"});
    
    return res.status(200).json({ conversations: conversations });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", conversationExist, async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const unread = await messageModel.updateMany({viewed:false, sender: {$ne: req.session.user._id}},{viewed: true})
   // console.log(req.session.user._id)
   // const unread = await messageModel.find({viewed:false, sender: {$ne: req.session.user._id}})
    // console.log(unread)
    const messages = await messageModel
      .find({
        conversation_id: conversation._id.toString(),
      })
      .populate({path: "conversation_id", populate: {path: "sender", select: "_id first_name last_name profile_pic"}})
      .populate({path: "conversation_id", populate: {path: "reciever", select: "_id first_name last_name profile_pic"}});
    return res.status(200).json({ messages: messages });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/viewed", conversationExist, async (req, res, next)=>{
  try{
    messageModel.updateMany({conversation_id: req.params.id, viewed: false}, {viewed:true}).then((res)=>{
      conversationModel.findByIdAndUpdate(req.params.id, {unread: 0})
      return res.status(200).json({viewed: res.viewed})
    })
    .then((r)>{

    })
    .catch((err)=>{
      new AppError(400, "Bad Request")
    })
  } catch(err){
    next(err)
  }
  
})
router.use(errorHandler);
module.exports = router;
