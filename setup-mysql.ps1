# MySQL 데이터베이스 자동 설정 및 연동 스크립트 (Windows PowerShell용)
# 실행: powershell -ExecutionPolicy Bypass -File setup-mysql.ps1

Write-Host "🔄 MySQL 데이터베이스 연동을 시작합니다...`n"

# 환경변수 로드 (.env 파일)
$env_file = ".env"

if (-not (Test-Path $env_file)) {
    Write-Host "❌ .env 파일을 찾을 수 없습니다."
    Write-Host "   먼저 'npm run setup:env' 를 실행해주세요."
    exit 1
}

Write-Host "✅ .env 파일 확인됨`n"

# .env 파일에서 값 읽기
$envContent = Get-Content $env_file -Raw
$DB_HOST = $envContent | Select-String 'DB_HOST=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value }
$DB_USER = $envContent | Select-String 'DB_USER=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value }
$DB_PASSWORD = $envContent | Select-String 'DB_PASSWORD=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value }

Write-Host "📋 MySQL 연결 정보:"
Write-Host "   호스트: $DB_HOST"
Write-Host "   사용자: $DB_USER"
Write-Host "   암호: $(if ($DB_PASSWORD) { '설정됨' } else { '미설정' })`n"

if (-not $DB_PASSWORD) {
    Write-Host "⚠️ MySQL 암호가 설정되지 않았습니다."
    Write-Host ""
    Write-Host "📝 다음 중 하나를 선택해주세요:"
    Write-Host ""
    Write-Host "Option 1: MySQL 암호 설정"
    Write-Host "   1. MySQL Command Line을 열고 다음 명령 실행:"
    Write-Host "      mysql -u root"
    Write-Host "   2. MySQL 프롬프트에서:"
    Write-Host "      ALTER USER 'root'@'localhost' IDENTIFIED BY 'password123';"
    Write-Host "      FLUSH PRIVILEGES;"
    Write-Host "      EXIT;"
    Write-Host "   3. .env 파일의 DB_PASSWORD를 'password123'으로 변경"
    Write-Host ""
    Write-Host "Option 2: 암호 없이 진행 (개발 환경만 권장)"
    Write-Host "   MySQL이 암호 없이 설정되어 있다면 그대로 진행"
    Write-Host ""
    Read-Host "위 설정을 완료했으면 Enter를 눌러주세요"
}

Write-Host "`n🔄 데이터베이스 초기화 스크립트를 실행합니다...`n"

npm run init-db

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✨ MySQL 데이터베이스 연동 완료!"
    Write-Host ""
    Write-Host "🚀 다음 단계:"
    Write-Host "   1. 백엔드 서버 시작: npm start"
    Write-Host "   2. 프론트엔드 시작: npm start (front 디렉토리에서)"
} else {
    Write-Host "`n❌ 오류가 발생했습니다. 위의 메시지를 확인해주세요."
    exit 1
}
