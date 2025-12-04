const pool = require("./config/database");
const config = require("./config/env");

function parseExpirationToDays(exp) {
  // exp examples: '7d', '168h', '7' (days)
  if (!exp) return 7;
  const s = String(exp).trim();
  const dMatch = s.match(/^([0-9]+)d$/i);
  if (dMatch) return parseInt(dMatch[1], 10);
  const hMatch = s.match(/^([0-9]+)h$/i);
  if (hMatch) return Math.ceil(parseInt(hMatch[1], 10) / 24);
  const nMatch = s.match(/^([0-9]+)$/);
  if (nMatch) return parseInt(nMatch[1], 10);
  // fallback: try to parse ISO duration days number
  const num = parseInt(s, 10);
  if (!isNaN(num)) return num;
  return 7;
}

async function runCleanup() {
  const days = parseExpirationToDays(config.jwt.expiration);
  try {
    const connection = await pool.getConnection();

    // Ensure table exists (in case init.sql wasn't applied)
    const createSql = `
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token TEXT NOT NULL,
        token_hash VARCHAR(64) DEFAULT NULL,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_revoked_token ((LEFT(token,255))),
        INDEX idx_revoked_hash (token_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.query(createSql);

    const query = `DELETE FROM revoked_tokens WHERE revoked_at < DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
    const [result] = await connection.query(query);
    connection.release();
    console.log(
      `✅ revoked_tokens cleanup completed. Removed ${result.affectedRows} rows older than ${days} days.`
    );
  } catch (err) {
    console.error("❌ revoked_tokens cleanup error:", err.message);
  }
}

if (require.main === module) {
  runCleanup().then(() => process.exit(0));
}

module.exports = { runCleanup };
