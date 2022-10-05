const { uuid } = require("uuidv4");
const { yumsDB } = require("../mongo");

const isUniqueEmail = async (email) => {
  const collection = await yumsDB().collection("users");
  const existingEmail = await collection.find({ email }).toArray();
  if (existingEmail.length > 0) {
    return false;
  }
  return true;
};

const isUniqueUser = async (username) => {
  const collection = await yumsDB().collection("users");
  const existingUser = await collection.find({ username }).toArray();
  if (existingUser.length > 0) {
    return false;
  }
  return true;
};

const isValidPass = (password) => {
  if (
    !/\d/.test(password) ||
    !/[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password) ||
    !/[a-zA-Z]/.test(password) ||
    password.length < 8 ||
    password.includes(" ")
  )
    return false;
  return true;
};

const createUser = async (username, email, password) => {
  try {
    const collection = await yumsDB().collection("users");
    const user = {
      id: uuid(),
      username,
      email,
      password,
      restaurantList: [],
    };
    collection.insertOne(user);
    return user.id;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const checkDetails = async (username, email, password) => {
  if (username.length < 5) {
    return {
      message: "Username must be at least 5 characters long.",
      success: false,
    };
  }
  const uniqueUser = await isUniqueUser(username);
  if (!uniqueUser) {
    return { message: "Username not available.", success: false };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      message: "Enter a valid email.",
      success: false,
    };
  }
  const uniqueEmail = await isUniqueEmail(email);
  if (!uniqueEmail) {
    return {
      message: "This email address already has an existing account.",
      success: false,
    };
  }
  const valid = isValidPass(password);
  if (!valid) {
    return {
      message:
        "Password must be at least 8 characters long, must not include spaces and must include at least 1 letter, number and special character.",
      success: false,
    };
  }
  return { success: true };
};

module.exports = { checkDetails, createUser };
