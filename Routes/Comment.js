const router = require("express").Router();
const AppError = require("../ErrorHandler/customError");
const commentModel = require("../Models/Comment");
const errorHandler = require("../ErrorHandler/index");

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    if (req.session.user._id.toString() != req.comment.owner._id.toString()) {
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

    const post = await commentModel.findById(req.params.id);

    if (!post) {
      throw new AppError(400, "Comment does not exits");
    } else {
      req.comment = post;
      next();
    }
  } catch (err) {
    next(err);
  }
};
router.put("/:id", postExist, isOwnerOrAdmin, async (req, res, next) => {
  try {
    if (req.body.text) {
      await commentModel.findByIdAndUpdate(req.params.id, {
        text: req.body.text,
      });

      res.status(200).json({ message: "Comment edited" });
    } else {
      throw new AppError(400, "Text required");
    }
  } catch (err) {
    next(err);
  }
});

router.put("/:id/like", postExist, async (req, res, next) => {
  try {
    const post = await commentModel.findById(req.params.id);
    const likes = post.like_by;

    const user_id = req.session.user._id.toString();

    const isLiked = likes.filter((id) => {
      return id.toString() == req.session.user._id.toString();
    });
    if (isLiked.length <= 0) {
      likes.push(user_id);
      await commentModel.findByIdAndUpdate(req.comment._id.toString(), {
        like_by: likes,
      });
      return res.status(200).json({ message: "Liked" });
    } else {
      let undoLiked = likes.filter((id) => {
        return id.toString() != req.session.user._id;
      });
      await commentModel.findByIdAndUpdate(req.comment._id, {
        like_by: undoLiked,
      });
      return res.status(200).json({ message: "Unliked" });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", postExist, isOwnerOrAdmin, async (req, res, next) => {
  try {
    await commentModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "comment deleted" });
  } catch (err) {
    next(err);
  }
});
router.use(errorHandler);
module.exports = router;
