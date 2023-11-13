const AppError = require("./customError");
const errorHandler = async (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.code).json({ message: err.message });
  } else {
    console.log(err);
    return res.status(500).json({ type: "server", message: err.message });
  }
};

module.exports = errorHandler;
