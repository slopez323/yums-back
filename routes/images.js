var express = require("express");
var router = express.Router();
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.delete("/delete", async function (req, res, next) {
  try {
    const id = req.body.id;

    await cloudinary.v2.uploader.destroy(id, function (error, result) {
      if (!error) {
        res.json({ success: true, message: "image deleted" });
      } else {
        res.json({ success: false, message: error });
      }
    });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
});

module.exports = router;
