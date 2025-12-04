require("dotenv").config();
const express = require("express");
const cors = require("cors");

// MySQL 데이터베이스 연결 초기화
const pool = require("./config/database");

// MySQL 라우트 불러오기
const authRoutes = require("./routes/auth_mysql");
const studyRoutes = require("./routes/study_mysql");
const problemRoutes = require("./routes/problem_mysql");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
// 미들웨어
app.use(express.json());

// 정기적 블랙리스트 정리 로직 로드
const { runCleanup } = require("./cleanup-revoked-tokens");

// 서버 시작 시 한 번 실행
runCleanup();
// 하루에 한 번 실행
setInterval(() => {
  runCleanup();
}, 24 * 60 * 60 * 1000);

// 라우트
app.use("/api/auth", authRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/problem", problemRoutes);

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "MySQL" });
});

app.listen(PORT, () => {
  console.log(`🚀 MySQL 데이터베이스 모드로 서버 시작됨 (포트: ${PORT})`);
});
