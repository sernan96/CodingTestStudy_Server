// ===================================================
// 백엔드 환경설정 관리 파일
// ===================================================

require("dotenv").config();

const config = {
  // 서버 설정
  server: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10),
    isDevelopment: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV,
  },

  // 데이터베이스 설정
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10),
    useMySQL: process.env.USE_MYSQL === "true",
  },

  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET || "default_secret_key",
    expiration: process.env.JWT_EXPIRATION || "7d",
  },

  // CORS 설정
  cors: {
    origin: process.env.CORS_ORIGIN,
  },

  // API 설정
  api: {
    joinCodeLength: parseInt(process.env.JOIN_CODE_LENGTH || "16", 10),
    defaultMonthlyVacation: parseInt(
      process.env.DEFAULT_MONTHLY_VACATION || "10",
      10
    ),
    earlyMorningStart: parseInt(process.env.EARLY_MORNING_START || "0", 10),
    earlyMorningEnd: parseInt(process.env.EARLY_MORNING_END || "6", 10),
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

// 설정 검증
function validateConfig() {
  if (config.database.useMySQL) {
    if (!config.database.host || !config.database.name) {
      throw new Error("❌ 데이터베이스 설정이 필요합니다");
    }
  }

  if (!config.jwt.secret || config.jwt.secret === "default_secret_key") {
    console.warn("⚠️  JWT_SECRET이 기본값입니다. 프로덕션에서는 변경하세요");
  }

  console.log(`✅ 환경설정 검증 완료 (${config.server.nodeEnv} 모드)`);
}

// 초기화 시 검증
if (require.main === module) {
  validateConfig();
}

module.exports = config;
module.exports.validateConfig = validateConfig;
