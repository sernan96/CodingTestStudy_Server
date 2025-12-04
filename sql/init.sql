-- =====================================================
-- 스터디 플랫폼 MySQL 데이터베이스 초기 설정
-- =====================================================

-- 기존 데이터베이스 삭제 및 재생성
DROP DATABASE IF EXISTS study_platform;

-- 데이터베이스 생성
CREATE DATABASE study_platform;
USE study_platform;

-- =====================================================
-- 테이블 생성
-- =====================================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '사용자 이메일',
  password VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시된 비밀번호',
  name VARCHAR(100) NOT NULL COMMENT '사용자 이름',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 스터디 테이블
CREATE TABLE IF NOT EXISTS studies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '스터디 이름',
  description TEXT COMMENT '스터디 설명',
  join_code VARCHAR(16) UNIQUE NOT NULL COMMENT '가입 코드 (16자 랜덤)',
  max_members INT DEFAULT 6 COMMENT '최대 인원 (1~6명)',
  created_by INT NOT NULL COMMENT '스터디 생성자 (user_id)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_join_code (join_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 스터디 멤버 테이블 (many-to-many 관계)
CREATE TABLE IF NOT EXISTS study_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_id INT NOT NULL COMMENT '스터디 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  color VARCHAR(7) NOT NULL COMMENT '멤버 칼라 (카일린더 표시용)',
  monthly_vacation INT DEFAULT 0 COMMENT '월별 휴가일수',
  vacation_used INT DEFAULT 0 COMMENT '사용한 휴가일수',
  stack INT DEFAULT 0 COMMENT '스택 (연속 미풀이 일수)',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_study_user (study_id, user_id),
  INDEX idx_study_id (study_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 문제 테이블
CREATE TABLE IF NOT EXISTS problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_id INT NOT NULL COMMENT '스터디 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  platform VARCHAR(50) NOT NULL COMMENT '플랫폼 (백준, 프로그래머스, SWEA)',
  problem_number VARCHAR(50) NOT NULL COMMENT '문제 번호',
  tier VARCHAR(50) COMMENT '백준 티어 (Bronze~Ruby)',
  level VARCHAR(50) COMMENT '난이도 (백준: V~I, 프로그래머스: 0~5)',
  vacation_earned INT DEFAULT 0 COMMENT '획득한 휴가일수 (0 또는 1)',
  record_date DATE NOT NULL COMMENT '기록되는 날짜 (어제 문제 등록 시 다른 날짜)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_study_date (study_id, record_date),
  INDEX idx_user_date (user_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 문제 풀이 기록 테이블 (성능 최적화용 캐시)
CREATE TABLE IF NOT EXISTS problem_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_id INT NOT NULL COMMENT '스터디 ID',
  record_date DATE NOT NULL COMMENT '풀이 날짜',
  user_id INT NOT NULL COMMENT '사용자 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_study_date_user (study_id, record_date, user_id),
  INDEX idx_study_date (study_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 폐기된 토큰 블랙리스트
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token TEXT NOT NULL,
  token_hash VARCHAR(64) DEFAULT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_revoked_token (token(255)),
  INDEX idx_revoked_hash (token_hash)
)
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 테스트 데이터 추가 (테스트용 더미 데이터 제거 - 사용자 직접 생성)
-- =====================================================
-- 초기 사용자는 없습니다. 회원가입하여 사용해주세요.

-- =====================================================
-- 유용한 쿼리들
-- =====================================================

-- 스터디별 일일 풀이 현황 조회
SELECT 
  s.name as study_name,
  pr.record_date,
  u.name as user_name,
  COUNT(*) as problem_count
FROM problem_records pr
JOIN studies s ON pr.study_id = s.id
JOIN users u ON pr.user_id = u.id
GROUP BY pr.study_id, pr.record_date, pr.user_id
ORDER BY pr.record_date DESC;

-- 스터디별 멤버 월차 현황
SELECT 
  s.name as study_name,
  u.name as user_name,
  sm.monthly_vacation,
  sm.vacation_used,
  (sm.monthly_vacation - sm.vacation_used) as remaining
FROM study_members sm
JOIN studies s ON sm.study_id = s.id
JOIN users u ON sm.user_id = u.id
ORDER BY s.id;
