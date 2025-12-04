const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateToken } = require("../middleware/auth");
const pool = require("../config/database");

const router = express.Router();

/**
 * 로그아웃(토큰 폐기) API
 * POST /api/auth/logout
 */
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "토큰이 필요합니다" });
    }

    const connection = await pool.getConnection();

    // 토큰 해시 생성
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 이미 폐기되었는지 확인 (해시 또는 원문)
    const [existing] = await connection.query(
      "SELECT id FROM revoked_tokens WHERE token_hash = ? OR token = ? LIMIT 1",
      [tokenHash, token]
    );

    if (existing && existing.length > 0) {
      connection.release();
      return res.json({ message: "이미 로그아웃 처리된 토큰입니다" });
    }

    await connection.query(
      "INSERT INTO revoked_tokens (token, token_hash) VALUES (?, ?)",
      [token, tokenHash]
    );

    connection.release();

    res.json({ message: "로그아웃 처리 완료" });
  } catch (error) {
    console.error("로그아웃 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 로그인 API
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "이메일과 비밀번호는 필수입니다" });
    }

    const connection = await pool.getConnection();

    // 사용자 조회
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }

    const user = users[0];

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      connection.release();
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }

    connection.release();

    // 토큰 생성
    const token = generateToken(user.id);

    res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 회원가입 API
 * POST /api/auth/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "모든 필드는 필수입니다" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "비밀번호는 6자 이상이어야 합니다" });
    }

    const connection = await pool.getConnection();

    // 중복 이메일 확인
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ message: "이미 존재하는 이메일입니다" });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const [insertResult] = await connection.query(
      "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
      [email, hashedPassword, name]
    );

    const userId = insertResult.insertId;
    connection.release();

    // 토큰 생성 후 응답 (자동 로그인)
    const token = generateToken(userId);

    res.status(201).json({
      message: "회원가입 성공",
      token,
      user: {
        id: userId,
        email,
        name,
      },
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
