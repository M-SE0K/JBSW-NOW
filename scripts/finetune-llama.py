#!/usr/bin/env python3
"""
Llama 3.1 8B Fine-tuning 스크립트 (Unsloth 사용)

사용법:
  1. 연구실 PC에 환경 설정:
     pip install unsloth transformers datasets peft accelerate

  2. 학습 데이터 준비:
     data/training_data.jsonl 파일이 필요합니다.

  3. Fine-tuning 실행:
     python scripts/finetune-llama.py

  4. 학습 완료 후 GGUF 변환 및 Ollama 등록

요구사항:
  - NVIDIA GPU (12GB+ VRAM 권장)
  - CUDA 11.8+
  - Python 3.10+
"""

import os
import json
import torch
from datasets import Dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

# ============================================
# 설정
# ============================================

# 모델 설정
MODEL_NAME = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"  # 4bit 양자화 버전
MAX_SEQ_LENGTH = 2048
LOAD_IN_4BIT = True

# LoRA 설정
LORA_R = 16  # LoRA rank
LORA_ALPHA = 16
LORA_DROPOUT = 0
TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

# 학습 설정
BATCH_SIZE = 2
GRADIENT_ACCUMULATION_STEPS = 4
LEARNING_RATE = 2e-4
NUM_EPOCHS = 3
WARMUP_STEPS = 10
LOGGING_STEPS = 10
SAVE_STEPS = 100

# 경로 설정
DATA_PATH = "data/training_data.jsonl"
OUTPUT_DIR = "models/llama3.1-8b-jbsw-lora"
FINAL_MODEL_DIR = "models/llama3.1-8b-jbsw-merged"

# ============================================
# 데이터 로드
# ============================================

def load_training_data(path):
    """JSONL 파일에서 학습 데이터 로드"""
    print(f"📥 학습 데이터 로드: {path}")
    
    data = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    
    print(f"  ✅ {len(data)}건 로드 완료")
    return data

def format_prompt(instruction, input_text="", output=""):
    """Llama 3.1 Instruct 형식으로 프롬프트 포맷팅"""
    if input_text:
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

당신은 JBSW 통합 정보 플랫폼의 챗봇 어시스턴트입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.<|eot_id|><|start_header_id|>user<|end_header_id|>

{instruction}

입력: {input_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{output}<|eot_id|>"""
    else:
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

당신은 JBSW 통합 정보 플랫폼의 챗봇 어시스턴트입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.<|eot_id|><|start_header_id|>user<|end_header_id|>

{instruction}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{output}<|eot_id|>"""
    return prompt

def prepare_dataset(data):
    """데이터를 Hugging Face Dataset 형식으로 변환"""
    formatted = []
    for item in data:
        prompt = format_prompt(
            instruction=item.get("instruction", ""),
            input_text=item.get("input", ""),
            output=item.get("output", "")
        )
        formatted.append({"text": prompt})
    
    return Dataset.from_list(formatted)

# ============================================
# Fine-tuning
# ============================================

def main():
    print("🚀 Llama 3.1 8B Fine-tuning 시작\n")
    
    # GPU 확인
    if not torch.cuda.is_available():
        print("❌ CUDA GPU를 찾을 수 없습니다!")
        return
    
    print(f"🖥️  GPU: {torch.cuda.get_device_name(0)}")
    print(f"📊 VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB\n")
    
    # 데이터 로드
    raw_data = load_training_data(DATA_PATH)
    dataset = prepare_dataset(raw_data)
    print(f"📚 학습 데이터셋: {len(dataset)}건\n")
    
    # 모델 로드
    print("📦 모델 로드 중...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=LOAD_IN_4BIT,
        dtype=None,  # 자동 감지
    )
    print("  ✅ 모델 로드 완료\n")
    
    # LoRA 어댑터 적용
    print("🔧 LoRA 어댑터 적용 중...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    print("  ✅ LoRA 적용 완료\n")
    
    # 학습 설정
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        num_train_epochs=NUM_EPOCHS,
        warmup_steps=WARMUP_STEPS,
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        save_total_limit=3,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
        report_to="none",  # wandb 비활성화
    )
    
    # 트레이너 설정
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        args=training_args,
    )
    
    # 학습 시작
    print("🏋️ Fine-tuning 시작...")
    print(f"   - Epochs: {NUM_EPOCHS}")
    print(f"   - Batch size: {BATCH_SIZE}")
    print(f"   - Learning rate: {LEARNING_RATE}")
    print(f"   - LoRA rank: {LORA_R}\n")
    
    trainer.train()
    print("\n✅ Fine-tuning 완료!\n")
    
    # LoRA 어댑터 저장
    print("💾 LoRA 어댑터 저장 중...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"  ✅ 저장됨: {OUTPUT_DIR}\n")
    
    # 병합된 모델 저장 (선택사항)
    print("🔀 모델 병합 및 저장 중...")
    model.save_pretrained_merged(
        FINAL_MODEL_DIR,
        tokenizer,
        save_method="merged_16bit",  # 16bit로 저장
    )
    print(f"  ✅ 저장됨: {FINAL_MODEL_DIR}\n")
    
    print("=" * 50)
    print("🎉 Fine-tuning 완료!")
    print("=" * 50)
    print(f"\n다음 단계:")
    print(f"1. GGUF로 변환:")
    print(f"   python llama.cpp/convert_hf_to_gguf.py {FINAL_MODEL_DIR} --outtype q4_k_m")
    print(f"\n2. Ollama에 등록:")
    print(f"   ollama create jbsw-llama -f Modelfile")

if __name__ == "__main__":
    main()

