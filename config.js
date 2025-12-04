require("dotenv").config();

const SECRET_KEY =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

module.exports = {
  SECRET_KEY,
};
