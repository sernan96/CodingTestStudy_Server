/**
 * MySQL 데이터베이스 초기화 스크립트
 * init.sql 파일의 SQL 쿼리를 실행하여 테이블 및 테스트 데이터를 생성합니다.
 */

require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 3306,
};

async function initializeDatabase() {
  let connection = null;

  try {
    console.log("🔄 MySQL 데이터베이스 초기화를 시작합니다...\n");

    // 1. 기본 연결 (데이터베이스 없이)
    console.log(`📍 MySQL 서버에 연결 중 (${config.host}:${config.port})...`);
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      multipleStatements: true,
    });
    console.log("✅ MySQL 서버 연결 성공\n");

    // 2. init.sql 파일 읽기
    const sqlFilePath = path.join(__dirname, "sql", "init.sql");
    console.log(`📂 SQL 파일 읽는 중: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL 파일을 찾을 수 없습니다: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");
    console.log("✅ SQL 파일 읽기 성공\n");

    // 3. SQL 쿼리 실행
    console.log("🔨 SQL 쿼리 실행 중...");
    await connection.query(sqlContent);
    console.log("✅ SQL 쿼리 실행 성공\n");

    // 4. 데이터 확인
    console.log("📊 데이터 확인 중...\n");

    const [users] = await connection.query(
      "SELECT COUNT(*) as count FROM study_platform.users"
    );
    console.log(`📌 사용자: ${users[0].count}명`);

    const [studies] = await connection.query(
      "SELECT COUNT(*) as count FROM study_platform.studies"
    );
    console.log(`📌 스터디: ${studies[0].count}개`);

    const [members] = await connection.query(
      "SELECT COUNT(*) as count FROM study_platform.study_members"
    );
    console.log(`📌 스터디 멤버: ${members[0].count}명`);

    const [problems] = await connection.query(
      "SELECT COUNT(*) as count FROM study_platform.problems"
    );
    console.log(`📌 문제 기록: ${problems[0].count}개\n`);

    console.log("✨ 데이터베이스 초기화 완료! (study_platform)");
    console.log("\n🚀 다음 단계:");
    console.log("   1. 백엔드 서버 시작: npm start");
    console.log("   2. 프론트엔드 시작: npm start (front 디렉토리에서)");
  } catch (error) {
    console.error("\n❌ 오류 발생:");
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ 데이터베이스 연결 해제");
    }
  }
}

initializeDatabase();
