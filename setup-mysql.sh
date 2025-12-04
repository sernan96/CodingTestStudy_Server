#!/bin/bash
# MySQL 데이터베이스 자동 설정 및 연동 스크립트 (Linux/Mac용)
# Windows 사용자는 아래의 PowerShell 버전을 사용하세요.

echo "🔄 MySQL 데이터베이스 연동을 시작합니다..."
echo ""

# MySQL이 설치되어 있는지 확인
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL이 설치되지 않았습니다."
    echo "   macOS: brew install mysql"
    echo "   Linux: sudo apt-get install mysql-server"
    exit 1
fi

echo "✅ MySQL 클라이언트 확인됨"
echo ""

# MySQL 서버 연결 테스트
if mysql -u root -e "SELECT 1" &> /dev/null; then
    echo "✅ MySQL 서버 연결 성공 (암호 없음)"
    echo ""
    echo "📝 backend/.env 파일을 확인하고 필요시 수정합니다..."
    cd backend
    npm run init-db
else
    echo "⚠️ MySQL 암호가 필요합니다."
    echo "   backend/.env 파일의 DB_PASSWORD 값을 설정해주세요."
    exit 1
fi
