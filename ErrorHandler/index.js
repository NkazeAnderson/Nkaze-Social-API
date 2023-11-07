const AppError = require("./customError");
const errorHandler = async (err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.code).json({ message: err.message });
  } else {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = errorHandler;
