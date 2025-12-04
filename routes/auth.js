const express = require("express");
const bcrypt = require("bcrypt");
const { generateToken } = require("../middleware/auth");
const { users } = require("../db");

const router = express.Router();

/**
 * 로그인 API
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, user }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "이메일과 비밀번호는 필수입니다" });
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 틀렸습니다" });
    }

    // 비밀번호 비교
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 틀렸습니다" });
    }

    // 토큰 생성
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 회원가입 API
 * POST /api/auth/signup
 * Body: { email, password, name }
 * Response: { token, user }
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
        .json({ message: "비밀번호는 최소 6자 이상이어야 합니다" });
    }

    // 중복 확인
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: "이미 가입된 이메일입니다" });
    }

    // 비밀번호 해싱
    const hashed = await bcrypt.hash(password, 10);

    // 새 사용자 추가 (실제로는 DB에 저장)
    const newUser = {
      id: users.length + 1,
      email,
      password: hashed,
      name,
    };
    users.push(newUser);

    // 토큰 생성
    const token = generateToken(newUser.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
