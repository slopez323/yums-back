var express = require("express");
var router = express.Router();
const { yumsDB } = require("../mongo");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { checkDetails, createUser } = require("../helpers/authHelpers");
const { uuid } = require("uuidv4");

router.post("/register", async function (req, res, next) {
  try {
    const username = req.body.username.toLowerCase();
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const check = await checkDetails(username, email, password);
    if (!check.success) {
      res.json(check);
      return;
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    const userId = await createUser(username, email, hash);

    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const data = {
      time: new Date(),
      userId,
    };
    const token = jwt.sign(data, jwtSecretKey);

    if (userId) {
      res.cookie("session_token", token, {
        httpOnly: true,
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, token });
      return;
    }
  } catch (e) {
    res.json({
      success: false,
      message: "Unable to create account.  Try again.",
    });
    next(e);
  }
});

router.post("/login", async function (req, res, next) {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const collection = await yumsDB().collection("users");
    const user = await collection.findOne({ email });
    if (!user) {
      res.json({ message: "User does not exist.", success: false });
      return;
    }

    const match = await bcrypt.compare(password, user.password);

    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const data = {
      time: new Date(),
      userId: user.id,
    };
    const token = jwt.sign(data, jwtSecretKey);

    if (match) {
      res.cookie("session_token", token, {
        httpOnly: true,
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, token });
      return;
    } else {
      res.json({ message: "Incorrect Password.", success: false });
      return;
    }
  } catch (e) {
    res.json({
      success: false,
      message: "Unable to log in.  Try again.",
    });
    next(e);
  }
});

router.get("/check-login", async function (req, res, next) {
  try {
    if (!req.user) {
      res.json({ success: false });
      next();
      return;
    }
    res.json({ success: true, user: req.user.id });
  } catch (e) {
    next(e);
  }
});

router.get("/logout", function (req, res, next) {
  try {
    res.clearCookie("session_token");
    res.json({ success: true, message: "Successfully logged out." });
  } catch (e) {
    res.json({
      success: false,
      message: "Unable to sign out.  Try again.",
    });
    next(e);
  }
});

router.delete("/delete-account", async function (req, res, next) {
  try {
    const id = req.user.id;
    const collection = await yumsDB().collection("users");
    await collection.deleteOne({ id });

    res.clearCookie("session_token");
    res.json({ success: true, message: "Successfully deleted account." });
  } catch (e) {
    res.json({
      success: false,
      message: "Unable to delete account.  Try again.",
    });
    next(e);
  }
});

router.get("/user-data", async function (req, res, next) {
  try {
    const id = req.user.id;

    const collection = await yumsDB().collection("users");
    const user = await collection.findOne(
      { id },
      { projection: { password: 0 } }
    );

    res.json({ success: true, message: user });
  } catch (e) {
    res.json({ success: false });
    next(e);
  }
});

router.put("/create-album", async function (req, res, next) {
  try {
    const userId = req.user.id;
    const {
      name,
      location,
      coverPhoto,
      date,
      rating,
      dishes,
      otherImages,
      notes,
    } = req.body;

    const albumId = uuid();
    const dishList = dishes.map((dish) => {
      const dishId = uuid();
      return { ...dish, dishId };
    });

    const newAlbum = {
      name,
      albumId,
      coverPhoto,
      rating,
      location,
      date,
      dishList,
      otherImages,
      notes,
    };

    const collection = await yumsDB().collection("users");
    await collection.updateOne(
      { id: userId },
      {
        $push: {
          restaurantList: newAlbum,
        },
      }
    );
    res.json({ success: true, message: newAlbum });
  } catch (e) {
    res.json({ success: false });
    next(e);
  }
});

router.put("/edit-album", async function (req, res, next) {
  try {
    const userId = req.user.id;
    const {
      albumId,
      name,
      location,
      coverPhoto,
      date,
      rating,
      dishes,
      otherImages,
      notes,
    } = req.body;

    const dishList = dishes.map((dish) => {
      const dishId = uuid();
      return { ...dish, dishId };
    });

    const newAlbumId = uuid();
    const updatedAlbum = {
      name,
      albumId: newAlbumId,
      coverPhoto,
      rating,
      location,
      date,
      dishList,
      otherImages,
      notes,
    };

    const collection = await yumsDB().collection("users");
    await collection.updateOne(
      { id: userId },
      {
        $pull: { restaurantList: { albumId } },
      }
    );
    await collection.updateOne(
      { id: userId },
      {
        $push: {
          restaurantList: updatedAlbum,
        },
      }
    );

    res.json({ success: true, message: updatedAlbum });
  } catch (e) {
    res.json({ success: false });
    next(e);
  }
});

router.delete("/delete-album", async function (req, res, next) {
  try {
    const id = req.user.id;
    const albumId = req.body.albumId;

    const collection = await yumsDB().collection("users");
    await collection.updateOne(
      { id },
      {
        $pull: { restaurantList: { albumId } },
      }
    );

    res.json({ success: true, message: "Album Deleted." });
  } catch (e) {
    res.json({ success: false });
    next(e);
  }
});

module.exports = router;
