var userModel = require("../Models/Users");
let router = require("express").Router();
const jwt = require("jsonwebtoken");
const errorHandler = require("../ErrorHandler/index");
const AppError = require("../ErrorHandler/customError");

router.post("/login", async (req, res, next) => {
  try {
    const phone = req.body.phone;
    const email = req.body.email;
    const password = req.body.password;
    if (!phone && !email) {
      throw new AppError(400, "Phone or email required");
    }
    const user = await userModel.findOne({
      $or: [{ email: email }, { phone: phone }],
    });
    if (!user) {
      throw new AppError(404, "User not found");
    } else {
      const bcrypt = require("bcrypt");
      var validatePassword = await bcrypt.compare(password, user.password);
      if (!validatePassword) {
        throw new AppError(400, "Invalid password");
      }
    }

    //need send otp
    req.session.user = user;
    res.status(200).json({ message: "Successful log in" });
  } catch (err) {
    next(err);
  }
});
router.get("/logout", async (req, res, next) => {
  try {
    if (!req.session.user) {
      throw new AppError(403, "Already Logged out");
    } else {
      await req.session.destroy(req.session._id);
      res.status(200).json({ message: "Successful log out" });
    }
  } catch (err) {
    next(err);
  }
});
router.get("/verify/:token", async (req, res, next) => {
  try {
    if (!req.params.token) {
      throw new AppError(400, "Token required");
    } else {
      const token = req.params.token;
      await jwt.verify(token, process.env.JWT_Key, async (err, body) => {
        if (err) {
          throw new AppError(403, "Invalid token");
        } else {
          await userModel.findByIdAndUpdate(body.target_user, body);
          if (!req.session.user.isAdmin) {
            req.session.user = await userModel.findById(body.target_user);
          }
          res.status(200).json({ message: "Successful" });
        }
      });
    }
  } catch (err) {
    next(err);
  }
});
router.use(errorHandler);
module.exports = router;
