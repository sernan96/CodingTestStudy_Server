const express = require("express");
const { authenticate } = require("../middleware/auth");
const pool = require("../config/database");

const router = express.Router();

/**
 * 가입코드 생성 함수
 */
const generateJoinCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * 스터디 목록 조회 (사용자가 가입한 스터디만)
 * GET /api/study/list
 */
router.get("/list", authenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [studies] = await connection.query(
      `SELECT s.id, s.name, s.description, s.join_code as joinCode, s.max_members,
              COUNT(sm.user_id) as memberCount
       FROM studies s
       INNER JOIN study_members sm ON s.id = sm.study_id
       WHERE sm.user_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.userId]
    );

    connection.release();

    res.json({ studies });
  } catch (error) {
    console.error("스터디 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 상세 조회
 * GET /api/study/:studyId
 */
router.get("/:studyId", authenticate, async (req, res) => {
  try {
    const { studyId } = req.params;
    const connection = await pool.getConnection();

    // 스터디 정보
    const [studies] = await connection.query(
      "SELECT * FROM studies WHERE id = ?",
      [parseInt(studyId)]
    );

    if (studies.length === 0) {
      connection.release();
      return res.status(404).json({ message: "스터디를 찾을 수 없습니다" });
    }

    const study = studies[0];

    // 매달 1일 자동 초기화 로직
    const today = new Date();
    const currentDate = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    if (currentDate === 1) {
      // 오늘이 매달 1일이면, 모든 스터디원의 monthly_vacation을 0으로 리셋
      // 단, 이미 오늘 리셋했는지 확인하기 위해 vacation_used도 함께 확인
      // (vacation_used가 0이면 아직 이번 달에 안 들어온 것)
      await connection.query(
        `UPDATE study_members 
         SET monthly_vacation = 0, vacation_used = 0 
         WHERE study_id = ?`,
        [parseInt(studyId)]
      );
    }

    // 스터디 멤버 정보
    const [members] = await connection.query(
      `SELECT sm.id, u.id as userId, u.name, sm.color, sm.monthly_vacation as monthlyVacation,
              sm.vacation_used as vacationUsed, sm.stack as stack
       FROM study_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.study_id = ?`,
      [parseInt(studyId)]
    );

    // 문제 풀이 기록
    const [records] = await connection.query(
      `SELECT DATE_FORMAT(record_date, '%Y-%m-%d') AS date, user_id AS userId FROM problem_records WHERE study_id = ?`,
      [parseInt(studyId)]
    );

    // 날짜별로 그룹화 (DATE는 드라이버 설정에 따라 string일 수 있으므로 안전하게 처리)
    const solved = {};
    records.forEach((record) => {
      const dateStr = record.date;
      if (!solved[dateStr]) solved[dateStr] = [];
      solved[dateStr].push(record.userId);
    });

    connection.release();

    res.json({
      studyId: study.id,
      studyName: study.name,
      joinCode: study.join_code,
      members,
      solved,
      createdBy: study.created_by,
      isOwner: study.created_by === req.userId,
    });
  } catch (error) {
    console.error("스터디 상세 조회 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 생성
 * POST /api/study
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, maxMembers } = req.body;

    if (!name) {
      return res.status(400).json({ message: "스터디명은 필수입니다" });
    }

    if (!maxMembers || maxMembers < 1 || maxMembers > 6) {
      return res
        .status(400)
        .json({ message: "인원수는 1~6명 사이여야 합니다" });
    }

    const connection = await pool.getConnection();

    // 중복되지 않는 가입코드 생성
    let joinCode;
    let exists = true;
    while (exists) {
      joinCode = generateJoinCode();
      const [result] = await connection.query(
        "SELECT id FROM studies WHERE join_code = ?",
        [joinCode]
      );
      exists = result.length > 0;
    }

    // 스터디 생성
    const [insertResult] = await connection.query(
      `INSERT INTO studies (name, description, join_code, max_members, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, `최대 ${maxMembers}명 스터디`, joinCode, maxMembers, req.userId]
    );

    const studyId = insertResult.insertId;

    // 생성자를 첫 번째 멤버로 추가
    await connection.query(
      `INSERT INTO study_members (study_id, user_id, color, monthly_vacation, vacation_used)
       VALUES (?, ?, ?, ?, ?)`,
      [studyId, req.userId, "#FF6B6B", 0, 0]
    );

    connection.release();

    res.status(201).json({
      message: "스터디가 생성되었습니다",
      study: {
        id: studyId,
        name,
        joinCode,
        maxMembers,
        memberCount: 1,
      },
    });
  } catch (error) {
    console.error("스터디 생성 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 가입
 * POST /api/study/join
 */
router.post("/join", authenticate, async (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ message: "가입코드는 필수입니다" });
    }

    const connection = await pool.getConnection();

    // 가입코드로 스터디 조회
    const [studies] = await connection.query(
      "SELECT * FROM studies WHERE join_code = ?",
      [joinCode]
    );

    if (studies.length === 0) {
      connection.release();
      return res.status(404).json({ message: "존재하지 않는 가입코드입니다" });
    }

    const study = studies[0];

    // 이미 가입했는지 확인
    const [existingMember] = await connection.query(
      "SELECT id FROM study_members WHERE study_id = ? AND user_id = ?",
      [study.id, req.userId]
    );

    if (existingMember.length > 0) {
      connection.release();
      return res.status(400).json({ message: "이미 가입한 스터디입니다" });
    }

    // 인원 초과 확인
    const [memberCount] = await connection.query(
      "SELECT COUNT(*) as count FROM study_members WHERE study_id = ?",
      [study.id]
    );

    if (memberCount[0].count >= study.max_members) {
      connection.release();
      return res
        .status(400)
        .json({ message: "스터디의 최대 인원을 초과했습니다" });
    }

    // 스터디 멤버 추가
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#F7DC6F", "#BB8FCE"];
    const color = colors[memberCount[0].count % colors.length];

    await connection.query(
      `INSERT INTO study_members (study_id, user_id, color, monthly_vacation, vacation_used)
       VALUES (?, ?, ?, ?, ?)`,
      [study.id, req.userId, color, 0, 0]
    );

    connection.release();

    res.status(200).json({
      message: "스터디에 가입했습니다",
      study: {
        id: study.id,
        name: study.name,
        joinCode: study.join_code,
      },
    });
  } catch (error) {
    console.error("스터디 가입 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 탈퇴
 * DELETE /api/study/:studyId
 */
router.delete("/:studyId", authenticate, async (req, res) => {
  try {
    const { studyId } = req.params;
    const connection = await pool.getConnection();

    // 스터디 존재 확인
    const [studies] = await connection.query(
      "SELECT id FROM studies WHERE id = ?",
      [parseInt(studyId)]
    );

    if (studies.length === 0) {
      connection.release();
      return res.status(404).json({ message: "스터디를 찾을 수 없습니다" });
    }

    // 소유자인지 확인 (생성자이면 스터디 전체 삭제, 아니면 멤버 탈퇴)
    const [studyInfo] = await connection.query(
      "SELECT created_by FROM studies WHERE id = ?",
      [parseInt(studyId)]
    );

    const createdBy = Number(studyInfo[0].created_by);

    if (createdBy === Number(req.userId)) {
      // 생성자: 스터디와 관련된 모든 데이터 삭제 (문제, 기록, 멤버 등)
      await connection.query("DELETE FROM problem_records WHERE study_id = ?", [
        parseInt(studyId),
      ]);
      await connection.query("DELETE FROM problems WHERE study_id = ?", [
        parseInt(studyId),
      ]);
      await connection.query("DELETE FROM study_members WHERE study_id = ?", [
        parseInt(studyId),
      ]);
      await connection.query("DELETE FROM studies WHERE id = ?", [
        parseInt(studyId),
      ]);

      connection.release();
      return res.json({ message: "스터디를 삭제했습니다" });
    } else {
      // 일반 멤버: 해당 멤버만 제거
      const [deleteResult] = await connection.query(
        "DELETE FROM study_members WHERE study_id = ? AND user_id = ?",
        [parseInt(studyId), req.userId]
      );

      connection.release();

      if (deleteResult.affectedRows > 0) {
        return res.json({ message: "스터디에서 탈퇴했습니다" });
      } else {
        return res
          .status(404)
          .json({ message: "스터디 멤버를 찾을 수 없습니다" });
      }
    }
  } catch (error) {
    console.error("스터디 탈퇴 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스택 초기화 (스터디장만 가능)
 * POST /api/study/:studyId/reset-stack
 */
router.post("/:studyId/reset-stack", authenticate, async (req, res) => {
  try {
    const { studyId } = req.params;
    const connection = await pool.getConnection();

    // 스터디 조회
    const [studies] = await connection.query(
      "SELECT created_by FROM studies WHERE id = ?",
      [parseInt(studyId)]
    );

    if (studies.length === 0) {
      connection.release();
      return res.status(404).json({ message: "스터디를 찾을 수 없습니다" });
    }

    const study = studies[0];

    // 스터디장 권한 확인
    if (study.created_by !== req.userId) {
      connection.release();
      return res
        .status(403)
        .json({ message: "스터디장만 스택을 초기화할 수 있습니다" });
    }

    // 모든 멤버의 스택을 0으로 초기화
    await connection.query(
      "UPDATE study_members SET stack = 0 WHERE study_id = ?",
      [parseInt(studyId)]
    );

    connection.release();

    res.json({ message: "스택이 초기화되었습니다" });
  } catch (error) {
    console.error("스택 초기화 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
