const router = require("express").Router();
const errorHandler = require("../ErrorHandler/index");
const messageModel = require("../Models/Message");
const conversationModel = require("../Models/Conversation");
const userModel = require("../Models/Users");
const multer = require("multer");
const AppError = require("../ErrorHandler/customError");
const fs = require("fs");

const store = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads");
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + "." + file.mimetype.split("/")[1]);
  },
});
const uploads = multer({
  storage: store,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "video/mp4" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/png"
    ) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Invalid mimeType"), false);
    }
  },
});

const userExist = async (req, res, next) => {
  try {
    const idLength = req.body.reciever.toString().length;

    if (idLength != 24) {
      throw new AppError(400, "Invalid id");
    }

    const user = await userModel.findById(req.body.reciever);

    if (!user) {
      throw new AppError(400, "User does not exits");
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
};

const isPartOrAdmin = async (req, res, next) => {
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

const postExist = async (req, res, next) => {
  try {
    const idLength = req.params.id.toString().length;

    if (idLength != 24) {
      throw new AppError(400, "Invalid id");
    }

    const post = await postModel
      .findById(req.params.id)
      .populate("owner", "_id first_name last_name profile_pic")
      .populate("like_by", "_ id first_name last_name profile_pic");

    if (!post) {
      throw new AppError(400, "Post does not exits");
    } else {
      req.post = post;
      next();
    }
  } catch (err) {
    next(err);
  }
};
const uploadImages = uploads.array("files", 5);

router.post("/", async (req, res, next) => {
  try {
    uploadImages(req, res, async (err) => {
      try{
        const idLength = req.body.reciever.toString().length;

      if (idLength != 24) {
        throw new AppError(400, "Invalid id");
      }

      const user = await userModel.findById(req.body.reciever);

      if (!user) {
        throw new AppError(400, "User does not exits");
      }

      if (err) {
        throw new Error("Can't Upload");
      }
      const files = req.files;
      const filesPath = [];
      if (files) {
        files.map((file) => {
          filesPath.push(file.filename);
        });
      }
      if (!files && !req.body.message) {
        throw new AppError(400, "Add text or files to the message");
      }
      const conversation = await new conversationModel({
        sender: req.session.user._id.toString(),
        reciever: req.body.reciever,
      });
      const checkConversation = await conversationModel.findOne({
        $or: [
          {
            sender: req.session.user._id.toString(),
            reciever: req.body.reciever,
          },
          {
            reciever: req.session.user._id.toString(),
            sender: req.body.reciever,
          },
        ],
      });

      if (!checkConversation) {
        await conversation.save();
      }

      const message = await new messageModel({
        conversation_id: checkConversation
          ? checkConversation._id.toString()
          : conversation._id.toString(),
        message: req.body.message,
        media: filesPath,
        sender: req.session.user._id
      });
      await message.save();
      !checkConversation

        ? res
            .status(200)
            .json({ conversation_id: message.conversation_id.toString() })
        : res.status(200).json({ message: "message sent" });
      return;
      }
      catch(err){
        next(err);
      }
      
    });
  } 
  catch (err) {
    next(err);
  }
});
router.get("/", (req, res) => {
  res.send("welcome to messages");
});
router.use(errorHandler);
module.exports = router;
