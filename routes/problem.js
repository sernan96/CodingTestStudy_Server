const express = require("express");
const { authenticate } = require("../middleware/auth");
const { problems, problemRecords, studyMembers } = require("../db");

const router = express.Router();

// 휴가 판정 로직
const calculateVacation = (platform, tier, level) => {
  const BAEKJOON_VACATION_TIERS = ["Gold", "Platinum", "Diamond", "Ruby"];
  const PROGRAMMERS_VACATION_LEVELS = [3, 4, 5];

  if (platform === "백준") {
    if (BAEKJOON_VACATION_TIERS.includes(tier)) {
      return 1;
    }
  } else if (platform === "프로그래머스") {
    if (PROGRAMMERS_VACATION_LEVELS.includes(parseInt(level))) {
      return 1;
    }
  }
  // SWEA는 휴가 없음

  return 0;
};
// 한국 시간 기준 날짜 반환 함수
const getKoreaDate = (date = new Date()) => {
  const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = koreaTime.getFullYear();
  const m = String(koreaTime.getMonth() + 1).padStart(2, "0");
  const d = String(koreaTime.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * 문제 등록 API
 * POST /api/problem
 * Body: { studyId, platform, problemNumber, tier, level }
 * Response: { message, vacationEarned }
 */
router.post("/", authenticate, (req, res) => {
  try {
    const { studyId, platform, problemNumber, tier, level, targetDate } =
      req.body;

    if (!studyId || !platform || !problemNumber) {
      return res.status(400).json({ message: "필수 항목이 누락되었습니다" });
    }

    const vacationEarned = calculateVacation(platform, tier, level);

    // 문제 기록을 저장할 날짜 결정 (targetDate가 있으면 그 날짜 사용, 아니면 오늘)
    const recordDate = targetDate || getKoreaDate();

    // 문제 기록 저장
    const newProblem = {
      id: Math.max(...problems.map((p) => p.id), 0) + 1,
      studyId: parseInt(studyId),
      userId: req.userId,
      platform,
      problemNumber,
      tier: tier || null,
      level: level || null,
      createdAt: new Date(),
      recordDate, // 실제 기록되는 날짜
      vacationEarned,
    };

    problems.push(newProblem);

    // 지정된 날짜의 풀이 기록 업데이트
    if (!problemRecords[parseInt(studyId)]) {
      problemRecords[parseInt(studyId)] = {};
    }
    if (!problemRecords[parseInt(studyId)][recordDate]) {
      problemRecords[parseInt(studyId)][recordDate] = [];
    }
    if (!problemRecords[parseInt(studyId)][recordDate].includes(req.userId)) {
      problemRecords[parseInt(studyId)][recordDate].push(req.userId);
    }

    // 휴가 적립시 멤버 정보 업데이트
    if (vacationEarned) {
      const members = studyMembers[parseInt(studyId)];
      const member = members.find((m) => m.userId === req.userId);
      if (member) {
        member.vacationUsed += vacationEarned;
      }
    }

    res.status(201).json({
      message: vacationEarned
        ? "휴가 1일이 적립되었습니다!"
        : "문제를 등록했습니다",
      vacationEarned,
      problem: newProblem,
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디별 오늘 문제 조회 API
 * GET /api/problem/study/:studyId/today
 * Response: { todayProblems: [...] }
 */
router.get("/study/:studyId/today", authenticate, (req, res) => {
  try {
    const { studyId } = req.params;
    const today = getKoreaDate();

    const todayProblems = problems.filter(
      (p) => p.studyId === parseInt(studyId) && p.recordDate === today
    );

    res.json({ todayProblems });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 사용자의 특정 날짜 문제 조회 API
 * GET /api/problem/user/:userId/date/:date
 * Response: { problems: [...] }
 */
router.get("/user/:userId/date/:date", authenticate, (req, res) => {
  try {
    const { userId, date } = req.params;

    const userProblems = problems.filter(
      (p) => p.userId === parseInt(userId) && p.recordDate === date
    );

    res.json({ problems: userProblems });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 월차 사용 API
 * POST /api/vacation/use
 * Body: { studyId, targetDate }
 * Response: { message, vacationUsed }
 */
router.post("/vacation/use", authenticate, (req, res) => {
  try {
    const { studyId, targetDate } = req.body;

    if (!studyId || !targetDate) {
      return res.status(400).json({ message: "필수 항목이 누락되었습니다" });
    }

    const recordDate = targetDate;

    // 이미 문제를 풀었는지 확인
    if (problemRecords[parseInt(studyId)]?.[recordDate]?.includes(req.userId)) {
      return res.status(400).json({ message: "이미 문제를 푸셨습니다." });
    }

    // 멤버 정보에서 월차 차감
    const members = studyMembers[parseInt(studyId)];
    const member = members.find((m) => m.id === req.userId);

    if (!member) {
      return res.status(404).json({ message: "멤버를 찾을 수 없습니다" });
    }

    const remainingVacation = member.monthlyVacation - member.vacationUsed;
    if (remainingVacation <= 0) {
      return res.status(400).json({ message: "사용 가능한 월차가 없습니다" });
    }

    // 월차 사용 처리
    member.vacationUsed += 1;

    // 해당 날짜 풀이 기록에 사용자 추가
    if (!problemRecords[parseInt(studyId)]) {
      problemRecords[parseInt(studyId)] = {};
    }
    if (!problemRecords[parseInt(studyId)][recordDate]) {
      problemRecords[parseInt(studyId)][recordDate] = [];
    }
    problemRecords[parseInt(studyId)][recordDate].push(req.userId);

    res.status(200).json({
      message: "월차를 사용했습니다",
      vacationUsed: member.vacationUsed,
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
