const express = require("express");
const { authenticate } = require("../middleware/auth");
const { studies, studyMembers, problemRecords } = require("../db");

const router = express.Router();

/**
 * 스터디 목록 조회 API
 * GET /api/study/list
 * Response: { studies: [...] }
 */
router.get("/list", (req, res) => {
  try {
    res.json({
      studies: studies.map((study) => ({
        id: study.id,
        name: study.name,
        description: study.description,
        joinCode: study.joinCode,
        memberCount: study.members.length,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 상세 정보 조회 API
 * GET /api/study/:studyId
 * Response: { members, solved }
 */
router.get("/:studyId", authenticate, (req, res) => {
  try {
    const { studyId } = req.params;
    const study = studies.find((s) => s.id === parseInt(studyId));

    if (!study) {
      return res.status(404).json({ message: "스터디를 찾을 수 없습니다" });
    }

    // 스터디의 멤버 정보 조회
    const members = studyMembers[parseInt(studyId)] || [];

    // 해결한 문제들
    const solved = problemRecords[parseInt(studyId)] || {};

    res.json({
      studyId: study.id,
      studyName: study.name,
      joinCode: study.joinCode,
      members,
      solved,
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 가입코드 생성 함수 (16자리 랜덤 문자열)
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
 * 스터디 생성 API
 * POST /api/study
 * Body: { name, maxMembers }
 * Response: { study }
 */
router.post("/", authenticate, (req, res) => {
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

    // 중복되지 않는 가입코드 생성
    let joinCode;
    do {
      joinCode = generateJoinCode();
    } while (studies.some((s) => s.joinCode === joinCode));

    const newStudy = {
      id: Math.max(...studies.map((s) => s.id), 0) + 1,
      name,
      description: `최대 ${maxMembers}명 스터디`,
      joinCode,
      maxMembers,
      members: [req.userId],
      createdAt: new Date(),
    };

    studies.push(newStudy);

    res.status(201).json({
      message: "스터디가 생성되었습니다",
      study: {
        id: newStudy.id,
        name: newStudy.name,
        joinCode: newStudy.joinCode,
        maxMembers: newStudy.maxMembers,
        memberCount: newStudy.members.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 탈퇴 API
 * DELETE /api/study/:studyId
 * Response: { message }
 */
router.delete("/:studyId", authenticate, (req, res) => {
  try {
    const { studyId } = req.params;
    const study = studies.find((s) => s.id === parseInt(studyId));

    if (!study) {
      return res.status(404).json({ message: "스터디를 찾을 수 없습니다" });
    }

    // 유저를 스터디 멤버에서 제거
    study.members = study.members.filter((id) => id !== req.userId);

    res.json({ message: "스터디에서 탈퇴했습니다" });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

/**
 * 스터디 가입 API
 * POST /api/study/join
 * Body: { joinCode }
 * Response: { message, study }
 */
router.post("/join", authenticate, (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ message: "가입코드는 필수입니다" });
    }

    const study = studies.find((s) => s.joinCode === joinCode);

    if (!study) {
      return res.status(404).json({ message: "유효하지 않은 가입코드입니다" });
    }

    // 이미 멤버인지 확인
    if (study.members.includes(req.userId)) {
      return res.status(400).json({ message: "이미 가입한 스터디입니다" });
    }

    // 멤버 추가
    study.members.push(req.userId);

    res.json({
      message: "스터디에 가입했습니다",
      study: {
        id: study.id,
        name: study.name,
        description: study.description,
        memberCount: study.members.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 오류", error: error.message });
  }
});

module.exports = router;
