const jwt = require("jsonwebtoken");
const { yumsDB } = require("../mongo");

const tokenVerif = async (req, res, next) => {
  try {
    const { session_token: sessionToken } = req.cookies;

    if (!sessionToken) {
      return next();
    }

    const { userId, time } = jwt.verify(
      sessionToken,
      process.env.JWT_SECRET_KEY
    );

    const collection = await yumsDB().collection("users");
    const user = await collection.findOne({ id: userId });

    if (!user) {
      return next();
    }

    req.user = user;

    return next();
  } catch (e) {
    next(e);
  }
};

module.exports = tokenVerif;
