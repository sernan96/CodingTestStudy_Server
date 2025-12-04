# Study Group Backend API

Express.js 기반 API 서버

## 폴더 구조

```
backend/
├── server.js              # 메인 서버 파일
├── config.js              # 설정 (JWT, 포트 등)
├── db.js                  # 더미 데이터 (나중에 실제 DB로 변경)
├── package.json           # 의존성
├── middleware/
│   └── auth.js            # 인증 관련 미들웨어
└── routes/
    ├── auth.js            # 로그인/회원가입 API
    ├── study.js           # 스터디 관련 API
    └── problem.js         # 문제 등록 API
```

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 모드 실행 (nodemon 사용)
npm run dev

# 또는 일반 실행
npm start
```

## API 엔드포인트

### 인증 (Auth)

- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입

### 스터디 (Study)

- `GET /api/study/list` - 스터디 목록 조회
- `GET /api/study/:studyId` - 스터디 상세 조회
- `POST /api/study` - 스터디 생성
- `DELETE /api/study/:studyId` - 스터디 탈퇴

### 문제 (Problem)

- `POST /api/problem` - 문제 등록
- `GET /api/problem/study/:studyId` - 스터디별 문제 목록
- `GET /api/problem/user/today` - 오늘 등록한 문제

## 데이터 변경

현재는 `db.js`에 더미 데이터가 저장되어 있습니다.
나중에 실제 데이터베이스(MongoDB, MySQL 등)로 변경할 때:

1. `routes/` 폴더의 각 라우트 파일에서 데이터 조회/저장 로직 수정
2. `db.js` 삭제 후 DB 연결 코드 추가
3. 각 라우트에서 DB 쿼리 적용

## 토큰 인증

일부 API는 JWT 토큰이 필요합니다.
Request 헤더에 다음과 같이 포함:

```
Authorization: Bearer YOUR_JWT_TOKEN
```
