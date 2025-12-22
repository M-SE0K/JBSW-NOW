#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

async function main() {
  const projectRoot = process.cwd();

  // 1) Lock 파일 정리 (npm 사용 고정)
  for (const lock of ['pnpm-lock.yaml', 'yarn.lock']) {
    const p = path.join(projectRoot, lock);
    if (existsSync(p)) {
      await fs.rm(p, { force: true });
      console.log(`Removed ${lock}`);
    }
  }

  // 2) 의존성 설치 (lock이 있으면 ci, 없으면 install)
  // npm ci가 실패하면 (동기화 문제) npm install로 fallback
  if (existsSync(path.join(projectRoot, 'package-lock.json'))) {
    try {
      run('npm ci');
    } catch (e) {
      console.warn('\n⚠️  npm ci failed (likely lock file out of sync). Falling back to npm install...');
      run('npm install');
    }
  } else {
    run('npm install');
  }

  // 3) .env 생성 (없으면)
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) {
    const content = `# API Base URL
EXPO_PUBLIC_API_BASE_URL=

# Firebase Configuration (Firebase 콘솔에서 가져오세요)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Ollama Configuration (선택사항 - 챗봇 기능 사용 시)
OLLAMA_URL=http://localhost:11434
EXPO_PUBLIC_OLLAMA_MODEL=llama3.2
EXPO_PUBLIC_PROXY_URL=http://localhost:4000
`;
    await fs.writeFile(envPath, content, 'utf8');
    console.log('Created .env (Firebase 환경 변수를 설정해주세요)');
  }

  // 4) express 의존성 보증 설치 (누락 시 추가)
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkgRaw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const needExpress = !allDeps['express'];
    const needTypesExpress = !allDeps['@types/express'];
    const toInstall = [];
    if (needExpress) toInstall.push('express@^5.1.0');
    if (needTypesExpress) toInstall.push('@types/express@^4.17.21');
    if (toInstall.length > 0) {
      run(`npm install ${toInstall.join(' ')}`);
    }
  } catch (e) {
    console.warn('Failed to verify/install express deps:', e?.message || e);
  }

  // 5) Watchman 설치 및 재인덱싱 (macOS)
  const isMac = process.platform === 'darwin';
  if (isMac) {
    const hasWatchman = spawnSync('which', ['watchman']).status === 0;
    if (!hasWatchman) {
      // Watchman이 없으면 Homebrew로 설치 시도
      const hasBrew = spawnSync('which', ['brew']).status === 0;
      if (hasBrew) {
        try {
          console.log('\n📦 Installing watchman (for file watching optimization)...');
          run('brew install watchman');
          console.log('✅ Watchman installed successfully');
        } catch (e) {
          console.warn('⚠️  Failed to install watchman:', e?.message || e);
          console.warn('   You can install it manually: brew install watchman');
        }
      } else {
        console.warn('⚠️  Watchman not found. Install Homebrew first, then run: brew install watchman');
      }
    } else {
      // Watchman이 있으면 재인덱싱
      try {
        const parent = path.dirname(projectRoot);
        run(`watchman watch-del '${parent}' || true`);
        run(`watchman watch-project '${parent}'`);
        console.log('✅ Watchman reindexed');
      } catch (e) {
        console.warn('⚠️  Failed to reindex watchman:', e?.message || e);
      }
    }
  }

  
  // 6) expo-doctor로 상태 점검 (있으면 진행)
  try {
    run('npx --yes expo-doctor');
  } catch {
    console.warn('\nexpo-doctor reported issues. You can rerun it later.');
  }

  console.log('\n✅ Setup complete. Next:');
  console.log('- Start dev server: npx expo start -c');
  console.log('- iOS: npx expo run:ios');
  console.log('- Android: npx expo run:android');
  console.log('- Proxy server: npm run proxy');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


