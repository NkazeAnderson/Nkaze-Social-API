let express = require("express");
let session = require("express-session");
const jwt = require("jsonwebtoken");
let morgan = require("morgan");
let mongoose = require("mongoose");
let mongodbSessionConnect = require("connect-mongodb-session")(session);
let userRoute = require("./Routes/Users");
let authRoute = require("./Routes/Auth");
let postRoute = require("./Routes/Post");
const commentRoute = require("./Routes/Comment");
const messageRoute = require("./Routes/Message");
const conversationRoute = require("./Routes/Conversation");
const AppError = require("./ErrorHandler/customError");
const errorHandler = require("./ErrorHandler");
const cors = require("cors")


require("dotenv").config();
let dbURl = process.env.MongoDB_Url;


mongoose
  .connect(dbURl)
  .then(console.log("connected to database"))
  .catch((err) => console.log("Error connecting to database"));
const session_Store = mongodbSessionConnect({
  uri: dbURl,
  collection: "Sessions",
});

mongoose.set("toJSON", { virtuals: true });

session_Store.on("error", (err) =>
  console.log("error connecting to session store")
);
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
function bodyTrimmer(req, res, next) {
  if (
    req.method === "POST" ||
    req.method === "PUT" ||
    req.method === "DELETE"
  ) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string") req.body[key] = value.trim();
    }
  }
  next();
}
app = express();
app.use(cors({
  origin: process.env.Front_End_Url,
  optionsSuccessStatus: 200,
  credentials:true
}))
app.use(express.json());
app.use(morgan("tiny"));
app.use(
  session({
    secret: process.env.Session_Secret,
    store: session_Store,
    saveUninitialized: false,
    resave: false,
    rolling: true,
    cookie: {
      maxAge: 155 * 60 * 1000,
    },
  })
);

app.use(bodyTrimmer);
app.use("/files",express.static('Uploads'));
app.use("/api/user", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/post", authenticated, postRoute);
app.use("/api/comment", authenticated, commentRoute);
app.use("/api/message", authenticated, messageRoute);
app.use("/api/conversation", authenticated, conversationRoute);
app.use(errorHandler);
app.get("/api/", (req, res) => {
  res.send("welcome to backend");
});
app.listen(process.env.Site_Port, () => {
  console.log(`Backend started on port ${process.env.Site_Port}`);
});
