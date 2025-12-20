#!/bin/bash

# GPU 모드 활성화 및 모델 설정 스크립트
# RTX 5070 12GB + 32GB RAM 환경용

MODEL=${1:-"llama3.2:3b"}

echo "============================================================"
echo "🚀 GPU 모드 활성화 및 모델 설정"
echo "============================================================"
echo ""

# 1. GPU 확인
echo "🎮 GPU 확인 중..."
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    if [ -n "$GPU_NAME" ]; then
        echo "   ✅ GPU 감지: $GPU_NAME"
    else
        echo "   ❌ GPU를 찾을 수 없습니다."
        exit 1
    fi
else
    echo "   ⚠️  nvidia-smi를 찾을 수 없습니다."
    exit 1
fi

# 2. 모델 확인 및 다운로드
echo ""
echo "📦 모델 확인: $MODEL"
if ollama list | grep -q "$MODEL"; then
    echo "   ✅ 모델이 이미 설치되어 있습니다."
else
    echo "   📥 모델 다운로드 중..."
    ollama pull "$MODEL"
    if [ $? -eq 0 ]; then
        echo "   ✅ 다운로드 완료"
    else
        echo "   ❌ 다운로드 실패"
        exit 1
    fi
fi

# 3. 환경 변수 설정
echo ""
echo "🔧 환경 변수 설정 중..."

# 현재 셸에 적용
export CUDA_VISIBLE_DEVICES=0

# 모델 크기에 따라 GPU 레이어 조정
if [[ "$MODEL" == *"14b"* ]] || [[ "$MODEL" == *"mixtral"* ]]; then
    export OLLAMA_GPU_LAYERS=45
    echo "   - OLLAMA_GPU_LAYERS=45 (대형 모델용, 양자화 권장)"
elif [[ "$MODEL" == *"7b"* ]] || [[ "$MODEL" == *"8b"* ]]; then
    export OLLAMA_GPU_LAYERS=40
    echo "   - OLLAMA_GPU_LAYERS=40 (큰 모델용)"
else
    export OLLAMA_GPU_LAYERS=35
    echo "   - OLLAMA_GPU_LAYERS=35 (중간 모델용)"
fi

export CUDA_VISIBLE_DEVICES=0
echo "   - CUDA_VISIBLE_DEVICES=0"

# ~/.bashrc에 추가 (영구 설정)
if ! grep -q "CUDA_VISIBLE_DEVICES=0" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Ollama GPU 설정" >> ~/.bashrc
    echo "export CUDA_VISIBLE_DEVICES=0" >> ~/.bashrc
    echo "export OLLAMA_GPU_LAYERS=$OLLAMA_GPU_LAYERS" >> ~/.bashrc
    echo "   ✅ ~/.bashrc에 환경 변수 추가됨"
else
    echo "   ℹ️  환경 변수가 이미 설정되어 있습니다."
fi

# 4. Ollama 재시작
echo ""
echo "🔄 Ollama 재시작 중..."
pkill ollama 2>/dev/null
sleep 2

# GPU 모드로 Ollama 시작
ollama serve > /dev/null 2>&1 &
OLLAMA_PID=$!
sleep 3

# Ollama 서버 확인
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama 서버 실행 중"
else
    echo "   ⚠️  Ollama 서버 시작 확인 중..."
    sleep 2
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "   ✅ Ollama 서버 실행 중"
    else
        echo "   ❌ Ollama 서버 시작 실패"
        exit 1
    fi
fi

# 5. GPU 모드 테스트
echo ""
echo "🧪 GPU 모드 테스트 중..."
bash scripts/test-gpu-simple.sh "$MODEL" 2>/dev/null | grep -A 5 "테스트 결과"

# 6. .env 파일 업데이트
echo ""
echo "📝 프로젝트 설정 업데이트 중..."
cd ~/hackathon 2>/dev/null || cd "$(dirname "$0")/.."

if [ -f .env ]; then
    # .env 파일에 모델 설정 추가/수정
    if grep -q "EXPO_PUBLIC_OLLAMA_MODEL" .env; then
        sed -i "s/EXPO_PUBLIC_OLLAMA_MODEL=.*/EXPO_PUBLIC_OLLAMA_MODEL=$MODEL/" .env
    else
        echo "" >> .env
        echo "EXPO_PUBLIC_OLLAMA_MODEL=$MODEL" >> .env
    fi
    echo "   ✅ .env 파일 업데이트됨"
else
    echo "EXPO_PUBLIC_OLLAMA_MODEL=$MODEL" > .env
    echo "   ✅ .env 파일 생성됨"
fi

# 7. 결과 요약
echo ""
echo "============================================================"
echo "✅ 설정 완료!"
echo "============================================================"
echo ""
echo "📋 설정 요약:"
echo "   - 모델: $MODEL"
echo "   - GPU 모드: 활성화됨"
echo "   - 환경 변수: ~/.bashrc에 추가됨"
echo ""
echo "🚀 다음 단계:"
echo "   1. 프록시 서버 재시작:"
echo "      cd ~/hackathon"
echo "      npm run proxy"
echo ""
echo "   2. 성능 확인:"
echo "      npm run benchmark:chat 20"
echo ""
echo "   3. GPU 모드 확인:"
echo "      ollama run $MODEL 'test'"
echo "      ollama ps"
echo ""
echo "============================================================"
echo ""

