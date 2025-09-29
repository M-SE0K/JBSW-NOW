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
  if (existsSync(path.join(projectRoot, 'package-lock.json'))) {
    run('npm ci');
  } else {
    run('npm install');
  }

  // 3) .env 생성 (없으면)
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) {
    const content = 'EXPO_PUBLIC_API_BASE_URL=\n';
    await fs.writeFile(envPath, content, 'utf8');
    console.log('Created .env');
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

  // 5) Watchman 재인덱싱 (macOS + watchman 존재 시)
  const isMac = process.platform === 'darwin';
  const hasWatchman = spawnSync('which', ['watchman']).status === 0;
  if (isMac && hasWatchman) {
    try {
      const parent = path.dirname(projectRoot);
      run(`watchman watch-del '${parent}' || true`);
      run(`watchman watch-project '${parent}'`);
    } catch {}
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


