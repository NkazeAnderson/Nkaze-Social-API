const router = require("express").Router();
const jwt = require("jsonwebtoken");
const userModel = require("../Models/Users");
const bcrypt = require("bcrypt");
const multer = require("multer");
const errorHandler = require("../ErrorHandler/index");
const AppError = require("../ErrorHandler/customError");

// middleware
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
const uploadImages = uploads.single("files");

const authenticated = async (req, res, next) => {
  try {
    if (!req.session.user) {
      throw new AppError(400, "Please log in");
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
};

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    if (req.session.user._id.toString() != req.params.id) {
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
const userNotExist = async (req, res, next) => {
  try {
    const user = await userModel.findOne({
      $or: [{ email: req.body.email }, { phone: req.body.phone }],
    });
    if (user) {
      throw new AppError(400, "User Already Exits");
    } else {
      req.user = user;
      next();
    }
  } catch (err) {
    next(err);
  }
};

const specialUpdate = async (req, res, next) => {
  try {
    if (req.body._id || req.body.password || req.body.email || req.body.phone) {
      if (req.body._id) {
        throw new AppError(403, "Can't change id");
      }
      if (req.body.password) {
        if (req.body.password.length < 8) {
          throw new AppError(400, "Password too short");
        }
        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        req.body.password = hash;
      }
      req.body.target_user = req.user._id.toString();
      const token = await jwt.sign(req.body, process.env.JWT_Key, {
        expiresIn: "3m",
      });
      req.token = token;
    }

    next();
  } catch (err) {
    next(err);
  }
};

const userExist = async (req, res, next) => {
  try {
    const idLength = req.params.id.toString().length;

    if (idLength != 24) {
      throw new AppError(400, "Invalid id");
    }
    const user = await userModel.findById(req.params.id);
    if (!user) {
      throw new AppError(400, "User does not exits");
    } else {
      const { password, createdAt, updatedAt, isAdmin, ...public } = user._doc;

      if (public.street && public.city && public.state && public.country) {
        public.full_address = `${public.street},${public.city},${public.state},${public.country} ${public.zip_code} `;
      }
      req.user = public;
      next();
    }
  } catch (err) {
    next(err);
  }
};

// create a user
router.post("/", userNotExist, async (req, res, next) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.password, salt);
    const userIns = new userModel({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone: req.body.phone,
      password: password,
    });

    const user = await userIns.save();
    res.status(201).json({ message: "User Created" });
  } catch (err) {
    next(err);
  }
});

// get a user
router.get("/:id", authenticated, userExist, (req, res) => {
  res.status(200).json(req.user);
});
// update a user
router.put(
  "/:id",
  authenticated,
  userExist,
  isOwnerOrAdmin,
  specialUpdate,
  async (req, res, next) => {
    try {
      if (req.token) {
        res.status(301).json({
          verify_link: `${process.env.Site_Url}:${process.env.Site_Port}/auth/verify/${req.token}`,
        });
      } else {
        await userModel.findByIdAndUpdate(req.user._id, req.body);
        if (!req.session.user.isAdmin) {
          req.session.user = await userModel.findById(req.user._id);
        }
        res.status(200).json({ message: "Update Successful" });
      }
    } catch (err) {
      next(err);
    }
  }
);
//update personal info
//update followings
router.put(
  "/:id/:pic",
  authenticated,
  userExist,
  isOwnerOrAdmin,
  (req, res, next) => {
    uploadImages(req, res, async (err) => {
      if (err) {
        return next(err);
      } else {
        let pic = req.params.pic;
        if (pic == "profile") {
          await userModel.findByIdAndUpdate(req.user._id.toString(), {
            profile_pic: req.file.filename,
          });
        } else {
          await userModel.findByIdAndUpdate(req.user._id.toString(), {
            cover_pic: req.file.filename,
          });
        }
        res.status(200).json({ message: "Successful" });
      }
    });
  }
);

router.put("/:id/follow", authenticated, userExist, async (req, res) => {
  const follower = await userModel.findById(req.session.user._id.toString());
  const toBeFollowed = await userModel.findOne({
    _id: req.user._id.toString(),
  });
  const isFollowing = follower.following.filter((value) => {
    return req.user._id.toString() == value;
  });
  if (isFollowing.length > 0) {
    let followerArray = follower.following.filter((value) => {
      return req.user._id.toString() != value;
    });
    let toBeFollowedArray = toBeFollowed.followers.filter((value) => {
      return req.session.user._id.toString() != value;
    });

    await userModel.findByIdAndUpdate(req.session.user._id.toString(), {
      following: followerArray,
    });
    await userModel.findByIdAndUpdate(req.user._id.toString(), {
      followers: toBeFollowedArray,
    });

    res.status(200).json({ message: "Successully Unfollowed" });
  } else {
    let followerArray = follower.following;
    let toBeFollowedArray = toBeFollowed.followers;

    followerArray.push(req.user._id.toString());
    toBeFollowedArray.push(req.session.user._id.toString());
    await userModel.findByIdAndUpdate(req.session.user._id.toString(), {
      following: followerArray,
    });
    await userModel.findByIdAndUpdate(req.user._id.toString(), {
      followers: toBeFollowedArray,
    });
    res.status(400).json({ message: "Successfully followed" });
  }
});
//delete a user
router.delete(
  "/:id",
  authenticated,
  userExist,
  isOwnerOrAdmin,
  async (req, res, next) => {
    try {
      await userModel.findByIdAndDelete(req.user._id);
      res.status(200).json({ message: "User  Deleted" });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);

router.use(errorHandler);

module.exports = router;
