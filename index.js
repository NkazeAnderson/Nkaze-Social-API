let express = require("express");
let session = require("express-session");
const jwt = require("jsonwebtoken");
let morgan = require("morgan");
let mongoose = require("mongoose");
let mongodbSessionConnect = require("connect-mongodb-session")(session);
let userRoute = require("./Routes/Users");
let authRoute = require("./Routes/Auth");

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
session_Store.on("error", (err) =>
  console.log("error connecting to session store")
);

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
app.use(express.json());
app.use(morgan("tiny"));
app.use(
  session({
    secret: process.env.Session_Secret,
    store: session_Store,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(bodyTrimmer);

app.use("/user", userRoute);
app.use("/auth", authRoute);

app.get("/", (req, res) => {
  res.send("welcome to backend");
});
app.listen(5000, () => {
  console.log("Backend started on port 5000");
});
