var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
require("dotenv").config();
const tokenVerif = require("./helpers/tokenVerif");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var imagesRouter = require("./routes/images");

var app = express();

const cors = require("cors");
// app.use(cors());

app.use(
  cors({
    credentials: true,
    origin: process.env.ORIGIN,
  })
);
app.options("*", cors());

var { mongoConnect } = require("./mongo.js");
const req = require("express/lib/request");
mongoConnect();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(tokenVerif);

app.use("/api/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/api/images", imagesRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
