const express = require("express");
const { authenticate } = require("../middleware/auth");
const pool = require("../config/database");

const router = express.Router();

// 휴가 판정 로직
const calculateVacation = (platform, tier, level) => {
  const BAEKJOON_VACATION_TIERS = ["Gold", "Platinum", "Diamond", "Ruby"];
  const PROGRAMMERS_VACATION_LEVELS = [3, 4, 5];

  if (platform === "백준") {
    return BAEKJOON_VACATION_TIERS.includes(tier) ? 1 : 0;
  } else if (platform === "프로그래머스") {
    return PROGRAMMERS_VACATION_LEVELS.includes(parseInt(level)) ? 1 : 0;
  }
  return 0;
};

/**
 * 문제 등록
 * POST /api/problem
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { studyId, platform, problemNumber, tier, level, targetDate } =
      req.body;

    if (!studyId || !platform || !problemNumber) {
      return res.status(400).json({ message: "필수 항목이 누락되었습니다" });
    }

    // 서버에서 어제 날짜 등록 허용 시간(0시~6시) 검증
    if (targetDate) {
      const now = new Date();
      const hour = now.getHours();

      // 계산용 날짜 문자열
      const todayStr = new Date(now).toISOString().split("T")[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (targetDate === yesterdayStr && !(hour >= 0 && hour < 6)) {
        return res
          .status(400)
          .json({ message: "어제 문제 등록은 0시~6시에만 가능합니다" });
      }
    }

    const vacationEarned = calculateVacation(platform, tier, level);
    const recordDate = targetDate || new Date().toISOString().split("T")[0];

    const connection = await pool.getConnection();

    // 이미 해당 날짜에 문제를 풀었는지 확인
    const [existingRecord] = await connection.query(
      `SELECT id FROM problem_records 
       WHERE study_id = ? AND record_date = ? AND user_id = ?`,
      [parseInt(studyId), recordDate, req.userId]
    );

    if (existingRecord.length > 0) {
      connection.release();
      return res
        .status(400)
        .json({ message: "이미 이 날짜에 문제를 풀었습니다" });
    }

    // 문제 기록 저장
    await connection.query(
      `INSERT INTO problems (study_id, user_id, platform, problem_number, tier, level, vacation_earned, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(studyId),
        req.userId,
        platform,
        problemNumber,
        tier || null,
        level || null,
        vacationEarned,
        recordDate,
      ]
    );

    // 풀이 기록 추가
    await connection.query(
      `INSERT INTO problem_records (study_id, record_date, user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id=id`,
      [parseInt(studyId), recordDate, req.userId]
    );

    // 휴가 적립시 멤버 정보 업데이트
    if (vacationEarned) {
      await connection.query(
        `UPDATE study_members 
         SET monthly_vacation = monthly_vacation + ?
         WHERE study_id = ? AND user_id = ?`,
        [vacationEarned, parseInt(studyId), req.userId]
      );
    }

    connection.release();

    res.status(201).json({
      message: vacationEarned
        ? "휴가 1일이 적립되었습니다!"
        : "문제를 등록했습니다",
      vacationEarned,
    });
  } catch (error) {
    console.error("문제 등록 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 월차 사용
 * POST /api/problem/vacation/use
 */
router.post("/vacation/use", authenticate, async (req, res) => {
  try {
    const { studyId, targetDate } = req.body;

    if (!studyId || !targetDate) {
      return res.status(400).json({ message: "필수 항목이 누락되었습니다" });
    }

    const connection = await pool.getConnection();

    // 1. 해당 날짜에 이미 문제를 풀었는지 확인
    const [existingRecord] = await connection.query(
      `SELECT id FROM problem_records 
       WHERE study_id = ? AND record_date = ? AND user_id = ?`,
      [parseInt(studyId), targetDate, req.userId]
    );

    if (existingRecord.length > 0) {
      connection.release();
      return res.status(400).json({ message: "이미 문제를 푸셨습니다" });
    }

    // 2. 멤버 정보 조회
    const [members] = await connection.query(
      `SELECT monthly_vacation, vacation_used FROM study_members 
       WHERE study_id = ? AND user_id = ?`,
      [parseInt(studyId), req.userId]
    );

    if (members.length === 0) {
      connection.release();
      return res.status(404).json({ message: "멤버를 찾을 수 없습니다" });
    }

    const member = members[0];
    const remainingVacation = member.monthly_vacation - member.vacation_used;

    // 3. 남은 월차가 0 이하면 사용 불가
    if (remainingVacation <= 0) {
      connection.release();
      return res.status(400).json({ message: "사용 가능한 월차가 없습니다" });
    }

    // 4. 월차 사용 처리
    await connection.query(
      `UPDATE study_members 
       SET vacation_used = vacation_used + 1
       WHERE study_id = ? AND user_id = ?`,
      [parseInt(studyId), req.userId]
    );

    // 5. 풀이 기록에 추가 (해당 날짜로 저장됨)
    await connection.query(
      `INSERT INTO problem_records (study_id, record_date, user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id=id`,
      [parseInt(studyId), targetDate, req.userId]
    );

    connection.release();

    res.status(200).json({
      message: "월차를 사용했습니다",
      vacationUsed: member.vacation_used + 1,
    });
  } catch (error) {
    console.error("월차 사용 오류:", error);
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
