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

    // const userType = username === "admin" ? "admin" : "user";
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    const userId = await createUser(username, email, hash);

    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const data = {
      time: new Date(),
      userId,
    };
    const token = jwt.sign(data, jwtSecretKey, { expiresIn: "24h" });

    if (userId) {
      res.json({ success: true, token });
      return;
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e, success: false });
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
    const token = jwt.sign(data, jwtSecretKey, { expiresIn: "24h" });

    if (match) {
      res.json({ success: true, token });
      return;
    } else {
      res.json({ message: "Incorrect Password.", success: false });
      return;
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e, success: false });
  }
});

router.get("/validate-token", function (req, res, next) {
  try {
    const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
    const jwtSecretKey = process.env.JWT_SECRET_KEY;

    const token = req.header(tokenHeaderKey);
    const verified = jwt.verify(token, jwtSecretKey);

    if (verified) {
      return res.json({
        success: true,
        message: verified.userId,
      });
    }
    return res.json({ success: false });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

router.get("/user", async function (req, res, next) {
  try {
    const id = req.query.id;

    const collection = await yumsDB().collection("users");
    const user = await collection.findOne(
      { id },
      { projection: { password: 0 } }
    );

    res.json({ success: true, message: user });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

router.put("/create-album", async function (req, res, next) {
  try {
    const {
      userId,
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

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

router.put("/edit-album", async function (req, res, next) {
  try {
    const {
      userId,
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

    res.json({ success: true, message: "Album updated" });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

router.delete("/delete-album", async function (req, res, next) {
  try {
    const id = req.body.userId;
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
    console.error(e);
    res.json({ success: false });
  }
});

module.exports = router;
