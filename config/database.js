const config = require("./env");
const mysql = require("mysql2/promise");

// MySQL 연결 풀 생성 (env.js 설정 사용)
const pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  // keepAliveInitialDelayMs was removed because mysql2 warns about unknown options.
});

// 연결 테스트
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ MySQL 데이터베이스 연결 성공");
    connection.release();
  })
  .catch((error) => {
    console.error("❌ MySQL 연결 실패:", error.message);
    process.exit(1);
  });

module.exports = pool;
