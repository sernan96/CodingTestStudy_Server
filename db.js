// 임시 더미 데이터베이스 (나중에 실제 DB로 변경)
const bcrypt = require("bcrypt");

// 초기 테스트용 유저: 비밀번호는 동기 해시 처리
const users = [
  {
    id: 1,
    email: "test@example.com",
    password: bcrypt.hashSync("test1234", 10),
    name: "테스트유저",
  },
  {
    id: 2,
    email: "admin@admin.com",
    password: bcrypt.hashSync("admin", 10),
    name: "관리자",
  },
];

// 스터디 데이터
const studies = [
  {
    id: 1,
    name: "React 스터디",
    description: "React를 배우는 스터디",
    joinCode: "REACT2025",
    members: [1, 2, 3, 4, 5],
    createdAt: new Date("2025-11-01"),
  },
  {
    id: 2,
    name: "JavaScript ES6+",
    description: "JavaScript ES6+ 심화 학습",
    joinCode: "JS6PLUS",
    members: [1, 2, 3],
    createdAt: new Date("2025-11-05"),
  },
  {
    id: 3,
    name: "Node.js 백엔드",
    description: "Node.js로 백엔드 개발 배우기",
    joinCode: "NODEJS88",
    members: [1, 4, 5],
    createdAt: new Date("2025-11-10"),
  },
  {
    id: 4,
    name: "데이터베이스 설계",
    description: "DB 설계 및 최적화",
    joinCode: "DB2025",
    members: [2, 3, 4],
    createdAt: new Date("2025-11-15"),
  },
  {
    id: 5,
    name: "클라우드 컴퓨팅",
    description: "AWS, Azure 클라우드 서비스 학습",
    joinCode: "CLOUD99",
    members: [1, 2, 3, 4, 5],
    createdAt: new Date("2025-11-20"),
  },
];

// 스터디 멤버 정보 (색상, 월차 등)
const studyMembers = {
  1: [
    {
      id: 1,
      name: "김철수",
      color: "#FF6B6B",
      monthlyVacation: 10,
      vacationUsed: 1,
    },
    {
      id: 2,
      name: "이영희",
      color: "#4ECDC4",
      monthlyVacation: 10,
      vacationUsed: 0,
    },
    {
      id: 3,
      name: "박민준",
      color: "#45B7D1",
      monthlyVacation: 10,
      vacationUsed: 2,
    },
    {
      id: 4,
      name: "최수진",
      color: "#F7DC6F",
      monthlyVacation: 10,
      vacationUsed: 0,
    },
    {
      id: 5,
      name: "정준호",
      color: "#BB8FCE",
      monthlyVacation: 10,
      vacationUsed: 1,
    },
  ],
};

// 문제 풀이 기록
const problemRecords = {
  1: {
    "2025-12-01": [1, 3],
    "2025-12-02": [2, 4, 5],
    "2025-12-03": [1, 2, 3, 4],
    "2025-12-04": [1, 5],
  },
};

// 문제 데이터
const problems = [
  {
    id: 1,
    studyId: 1,
    userId: 1,
    platform: "백준",
    problemNumber: "12345",
    tier: "Silver",
    level: "III",
    createdAt: new Date("2025-12-04"),
    vacationEarned: 0,
  },
];

module.exports = {
  users,
  studies,
  studyMembers,
  problemRecords,
  problems,
};
