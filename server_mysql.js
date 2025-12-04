require("dotenv").config();
const express = require("express");
const cors = require("cors");

// MySQL 버전 라우트
const authRoutes = require("./routes/auth_mysql");
const studyRoutes = require("./routes/study_mysql");
const problemRoutes = require("./routes/problem_mysql");

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ========================================
// 보안 미들웨어
// ========================================

// 1. CORS 설정 (특정 도메인만 허용)
const corsOptions = {
  origin: process.env.CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,
};
app.use(cors(corsOptions));

// 2. Body Parser (크기 제한 설정)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

// 3. 보안 헤더 설정 (Helmet.js 대체)
app.use((req, res, next) => {
  // XSS 방지
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // HTTPS 강제 (배포 시)
  if (NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
});

// 4. Rate Limiting (간단한 구현)
const rateLimit = {};
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimit[ip]) {
    rateLimit[ip] = [];
  }

  // 15분 이내의 요청만 유지
  rateLimit[ip] = rateLimit[ip].filter((time) => now - time < 900000);

  const maxRequests = parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100",
    10
  );
  if (rateLimit[ip].length >= maxRequests) {
    return res.status(429).json({
      message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }

  rateLimit[ip].push(now);
  next();
});

// 5. 요청 로깅 (프로덕션에서 더 자세히)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = process.env.LOG_LEVEL || "info";
    if (logLevel === "debug") {
      console.log(
        `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    }
  });
  next();
});

// ========================================
// 라우트
// ========================================
app.use("/api/auth", authRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/problem", problemRoutes);

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: NODE_ENV,
  });
});

// ========================================
// 에러 핸들러
// ========================================

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    message: "요청한 엔드포인트를 찾을 수 없습니다.",
  });
});

// 에러 핸들러 (마지막)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // 프로덕션에서는 상세 에러 정보 숨기기
  const message =
    NODE_ENV === "production" ? "서버 오류가 발생했습니다" : err.message;

  console.error(`[ERROR] ${err.message}`, err.stack);

  res.status(statusCode).json({
    message,
    ...(NODE_ENV !== "production" && { error: err.message }),
  });
});

// ========================================
// 서버 시작
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중입니다 (${NODE_ENV})`);
  console.log(`📊 데이터베이스: ${process.env.DB_NAME || "study_platform"}`);
  console.log(`🔒 CORS: ${process.env.CORS_ORIGIN}`);

  if (NODE_ENV === "production") {
    console.log("⚠️ 프로덕션 모드에서 실행 중입니다");
    console.log("✅ HTTPS 사용을 권장합니다");
  }
});
