const jwt = require("jsonwebtoken");
const config = require("../config/env");
const pool = require("../config/database");
const crypto = require("crypto");

// JWT 토큰 생성
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiration || "7d",
  });
};

// JWT 토큰 검증
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

// 인증 미들웨어
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "토큰이 필요합니다" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다" });
  }

  try {
    // 체크: 토큰이 폐기(블랙리스트) 되었는지 확인
    const connection = await pool.getConnection();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows] = await connection.query(
      "SELECT id FROM revoked_tokens WHERE token_hash = ? OR token = ? LIMIT 1",
      [tokenHash, token]
    );
    connection.release();

    if (rows && rows.length > 0) {
      return res.status(401).json({ message: "유효하지 않은 토큰입니다" });
    }
  } catch (err) {
    console.error("토큰 블랙리스트 확인 오류:", err.message);
    // DB 오류 시에도 진행하지 않음 — 보안상 거부
    return res.status(500).json({ message: "서버 오류" });
  }

  req.userId = decoded.userId;
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
};
