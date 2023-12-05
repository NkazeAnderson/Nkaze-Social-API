const router = require("express").Router();
const errorHandler = require("../ErrorHandler/index");
const postModel = require("../Models/Post");
const commentModel = require("../Models/Comment");
const multer = require("multer");
const AppError = require("../ErrorHandler/customError");
const { json } = require("express");
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

const postExist = async (req, res, next) => {
  try {
    const idLength = req.params.id.toString().length;

    if (idLength != 24) {
      throw new AppError(400, "Invalid id");
    }

    const post = await postModel
      .findById(req.params.id)
      .populate("owner", "_id first_name last_name profile_pic")
      .populate("like_by", "_ id first_name last_name profile_pic")
      .populate({
        path: "comments",
        populate: {
          path: "owner",
          select: "first_name last_name profile_pic",
          options: {sort:{"createdAt": -1}}
        },
        options: {sort:{"createdAt": -1}},
      });

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
      if (err) {
        console.log(err)
        throw new Error("Can't Upload");
      }
      const files = req.files;
      const filesPath = [];
      if (files) {
        files.map((file) => {
          filesPath.push(file.filename);
        });
      }
      if (!files && !req.body.text) {
        throw new AppError(400, "Add text or files to the post");
      }
      const post = new postModel({
        owner: req.session.user._id,
        text: req.body.text,
        photos: filesPath,
      });
      await post.save();
      res.status(200).json({ message: "Post Added" });
    });
  } catch (err) {
    next(err);
  }
});

router.get("/trending", async (req, res, next) => {
  try {
    const trending = await postModel
      .find({})
      .sort("-count_like -comment_count -createdAt")
      .limit(10)
      .populate({
        path: "owner",
        select: "first_name last_name profile_pic",
      })
      .populate({
        path: "comments",
        populate: {
          path: "owner",
          select: "first_name last_name profile_pic",
        },
        options: {sort:{"createdAt": -1}}
      })
      .populate("like_by", "_ id first_name last_name profile_pic")
    return res.status(200).json(trending);
  } catch (err) {
    next(err);
  }
});
router.get("/timeline/:id", async (req, res, next) => {
  try {
    const trending = await postModel
      .find({owner: req.params.id})
      .sort("-createdAt")
      .populate({
        path: "owner",
        select: "first_name last_name profile_pic",
      })
      .populate({
        path: "comments",
        populate: {
          path: "owner",
          select: "first_name last_name profile_pic",
        },
        options: {sort:{"createdAt": -1}}
      })
      .populate("like_by", "_ id first_name last_name profile_pic")
    return res.status(200).json(trending);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", postExist, async (req, res) => {
  return res.status(200).json(req.post);
});

router.put("/:id", postExist, isOwnerOrAdmin, async (req, res, next) => {
  try {
    uploadImages(req, res, async (err) => {
      if (err) {
        throw new Error("Can't Upload");
      }
      if (req.body.like_by || req.body.owner || req.body.comments) {
        throw new Error("Invalid properties added");
      }
      var old = req.post.photos;
      const remove = req.body.remove;
      const files = req.files;
      let filesPath = [];

      if (remove) {
        let strings = remove.split(",");

        strings.map(async (string) => {
          const name = string.trim();

          let filtered = old.filter((n) => {
            return n != name;
          });
          old = filtered;

          if (fs.existsSync(`./Uploads/${name}`)) {
            fs.unlink(`./Uploads/${name}`, async (err) => {
              try {
                if (err) {
                  throw new Error("File does not exits on server");
                }
              } catch (err) {
                next(err);
              }
            });
          }
        });
      }
      filesPath = [...old];

      if (files) {
        files.map((file) => {
          filesPath.push(file.filename);
        });
      }
      if (!files && !req.body.text) {
        throw new AppError(400, "Add text or files to the post");
      }
      if (!req.body.text) {
        req.body.text = req.post.text;
      }

      await postModel.findByIdAndUpdate(req.post._id.toString(), {
        text: req.body.text,
        photos: filesPath,
      });
      res.status(200).json({ message: "Post Updated" });
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/comment", postExist, async (req, res, next) => {
  try {
    const comments = req.post.comments;
    if (!req.body.text) {
      throw new AppError(400, "Text Required");
    }
    const newComment = await new commentModel({
      post: req.params.id,
      text: req.body.text,
      owner: req.session.user._id,
    });
    const savedComment = await newComment.save();
    comments.push(savedComment._id);

    await postModel.findByIdAndUpdate(req.post._id, { comments: comments });
    return res.status(200).json({ message: "comment added" });
  } catch (err) {
    next(err);
  }
});
router.put("/:id/like", postExist, async (req, res, next) => {
  try {
    const post = await postModel.findById(req.params.id);
    const likes = post.like_by;

    const user_id = req.session.user._id.toString();

    const isLiked = likes.filter((id) => {
      return id.toString() == req.session.user._id.toString();
    });
    if (isLiked.length <= 0) {
      likes.push(user_id);
      await postModel.findByIdAndUpdate(req.post._id.toString(), {
        like_by: likes,
      });
      return res.status(200).json({ message: "Liked" });
    } else {
      let undoLiked = likes.filter((id) => {
        return id.toString() != req.session.user._id;
      });
      await postModel.findByIdAndUpdate(req.post._id, { like_by: undoLiked });
      return res.status(200).json({ message: "Unliked" });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", postExist, isOwnerOrAdmin, async (req, res, next) => {
  try {
    await postModel.findByIdAndDelete(req.post._id);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

router.use(errorHandler);

module.exports = router;
