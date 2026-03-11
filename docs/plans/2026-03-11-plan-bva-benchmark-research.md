# BVA 벤치마크 데이터 및 컴플라이언스 조사 결과

> 작성일: 2026-03-11
> 태스크: T2 - 벤치마크 데이터 및 컴플라이언스 조사

## 1. 현재 모델 현황

data/models.json 기준 87개 모델 (38 상용 + 49 OSS), 21개 프로바이더.
현재 벤치마크 필드: `mmlu`, `gpqa`, `swe_bench`, `aime`, `hle`, `mgsm`

## 2. 신규 벤치마크 점수 조사

### 2.1 KMMLU (Korean Massive Multitask Language Understanding)

35,030개 한국어 전문 문항, 45개 과목. 영어 MMLU의 번역이 아닌 한국어 원문 기반 평가.

| 모델 | KMMLU (%) | 조건 | 출처 |
|------|-----------|------|------|
| GPT-5.1 | 83.65 | 0-shot | [daekeun-ml/evaluate-llm-on-korean-dataset](https://github.com/daekeun-ml/evaluate-llm-on-korean-dataset) |
| GPT-5-mini | 78.53 | 0-shot | 동일 |
| GPT-4o | ~70.57 | 0-shot | 동일 |
| GPT-4o Mini | N/A | - | 공개 데이터 없음 |
| GPT-4.5 | N/A | - | 공개 데이터 없음 |
| GPT-4 | 59.95 | 5-shot | [KMMLU 논문 (arXiv:2402.11548)](https://arxiv.org/html/2402.11548v2) |
| Claude 3.5 Sonnet | N/A | - | 공개 데이터 없음 |
| Claude 3.5 Haiku | N/A | - | 공개 데이터 없음 |
| Claude 3 Opus | N/A | - | 공개 데이터 없음 |
| Gemini Pro (1.0) | 50.18 | 5-shot | KMMLU 논문 |
| Gemini 2.0 Flash | N/A | - | 공개 데이터 없음 |
| Gemini 1.5 Pro | N/A | - | 공개 데이터 없음 |
| HyperCLOVA X THINK | 69.7 | - | [Naver CLOVA 보고서](https://clova.ai/cdn/media/2025/06/HyperCLOVA_X_THINK_Technical_Report.pdf) |
| HyperCLOVA X (HCX-L) | 53.40 | 5-shot | [HyperCLOVA X 기술 보고서 (arXiv:2404.01954)](https://arxiv.org/html/2404.01954v1) |
| SOLAR 10.7B | 41.65 | 5-shot | HyperCLOVA X 기술 보고서 |
| SOLAR Pro | N/A | - | 공개 데이터 없음 |
| EXAONE Deep | 53.6 | - | [The Investor](https://www.theinvestor.co.kr/article/10554458) |
| Qwen 72B | 50.83 | 5-shot | KMMLU 논문 |
| Qwen 2.5 72B | N/A | - | 공개 데이터 없음 |
| DeepSeek V3 | N/A | - | 공개 데이터 없음 |
| DeepSeek R1 | N/A | - | 공개 데이터 없음 |
| Mistral Large | N/A | - | 공개 데이터 없음 |
| Command R+ | N/A | - | 공개 데이터 없음 |

**참고**: KMMLU 논문은 2024년 초 발표로, GPT-4o 이후 모델 대부분은 공식 KMMLU 평가 결과가 공개되지 않음. Anthropic, Google, Mistral, DeepSeek, Cohere 등은 KMMLU를 공식 벤치마크로 채택하지 않아 자체 보고 데이터 부재. daekeun-ml 프로젝트에서 일부 모델 독립 평가 결과 존재.

### 2.2 KoBEST (Korean Balanced Evaluation of Significant Tasks)

한국어 NLU 평가: BoolQ, COPA, WiC, HellaSwag, SentiNeg 5개 태스크.

| 모델 | KoBEST | 출처 |
|------|--------|------|
| GPT-4o | N/A | 공개 데이터 없음 |
| GPT-4o Mini | N/A | 공개 데이터 없음 |
| Claude 3.5 Sonnet | N/A | 공개 데이터 없음 |
| Gemini 2.0 Flash | N/A | 공개 데이터 없음 |
| HyperCLOVA X | N/A | 공개 데이터 없음 (기술 보고서 미포함) |
| SOLAR Pro | N/A | 공개 데이터 없음 |
| DeepSeek V3 | N/A | 공개 데이터 없음 |
| Qwen 2.5 72B | N/A | 공개 데이터 없음 |
| Mistral Large | N/A | 공개 데이터 없음 |

**참고**: KoBEST는 주로 Open Ko-LLM Leaderboard (Upstage 주관)에서 오픈소스 모델 평가에 사용. 상용 모델(GPT, Claude, Gemini 등)의 KoBEST 점수는 프로바이더가 공식 보고하지 않으며, 독립 평가 데이터도 현재 확인 불가. 최신 SOTA LLM도 KoBEST HellaSwag에서는 여전히 개선 여지가 큼.

### 2.3 TruthfulQA

817개 질문, 38개 주제. MC1(단일 정답 정확도), MC2(다중 정답 확률 분배) 평가.

| 모델 | TruthfulQA (MC2) | 출처 |
|------|------------------|------|
| GPT-4 | N/A | 기술 보고서에 벤치마크 언급하나 구체 점수 미공개 |
| GPT-4o | N/A | 공개 데이터 없음 |
| GPT-4o Mini | N/A | 공개 데이터 없음 |
| Claude 3.5 Sonnet | N/A | 공개 데이터 없음 |
| Claude 3 Opus | N/A | 공개 데이터 없음 |
| Gemini 2.0 Flash | N/A | 공개 데이터 없음 |
| Gemini 1.5 Pro | N/A | 공개 데이터 없음 |
| DeepSeek V3 | N/A | 공개 데이터 없음 |
| DeepSeek R1 | N/A | 공개 데이터 없음 |
| Mistral Large | N/A | 공개 데이터 없음 |
| Qwen 2.5 72B | N/A | 공개 데이터 없음 |
| Command R+ | N/A | 공개 데이터 없음 |

**참고**: TruthfulQA는 주로 Open LLM Leaderboard v1(Hugging Face)에서 오픈소스 모델 평가에 사용되었으나, v2에서는 제외됨. 상용 모델 프로바이더(OpenAI, Anthropic, Google 등)는 TruthfulQA 점수를 공식 보고하지 않음. 원논문 기준 최고 모델 58%, 인간 94%.

### 2.4 HaluEval / 환각 평가

HaluEval 원본은 ChatGPT 대상 2023년 평가. 최신 환각 벤치마크로 Vectara Hallucination Leaderboard(2025 v2) 활용.

**Vectara Hallucination Leaderboard v2 (2026-03-10 기준)**
7,700개 문서, 최대 32K 토큰, 법률/의학/금융/기술/교육 분야.
수치는 **환각 비율** (낮을수록 좋음).

| 모델 | 환각 비율 (%) | 출처 |
|------|---------------|------|
| GPT-4o (2024-08-06) | 9.6 | [Vectara Leaderboard](https://github.com/vectara/hallucination-leaderboard) |
| GPT-4.1 (2025-04-14) | 5.6 | 동일 |
| GPT-5 High | 15.1 | 동일 |
| GPT-5 Mini | 12.9 | 동일 |
| Claude Sonnet 4 | 10.3 | 동일 |
| Claude Opus 4 | 12.0 | 동일 |
| Claude Haiku 4.5 | 9.8 | 동일 |
| Gemini 2.5 Pro | 7.0 | 동일 |
| Gemini 2.5 Flash | 7.8 | 동일 |
| Gemini 2.5 Flash Lite | 3.3 | 동일 |
| DeepSeek V3 | 6.1 | 동일 |
| DeepSeek V3.1 | 5.5 | 동일 |
| Mistral Large (2411) | 4.5 | 동일 |
| Mistral Small (2501) | 5.1 | 동일 |
| Command R+ (08-2024) | 6.9 | 동일 |
| Qwen 3 8B | 4.8 | 동일 |
| Qwen 3 14B | 5.4 | 동일 |
| Qwen 3 32B | 5.9 | 동일 |

**참고**: v2 벤치마크는 v1보다 난이도가 높아 전체적으로 환각 비율이 상승. "추론/사고" 모델(GPT-5, Claude Opus 등)은 오히려 환각 비율이 높은 경향. Vectara v1(간단한 요약 태스크)에서는 Gemini 2.0 Flash 0.7%, GPT-4o 1.5%, Claude 3.7 Sonnet 4.4%였음.

### 2.5 조사 결과 요약

| 벤치마크 | 데이터 가용성 | 비고 |
|----------|-------------|------|
| KMMLU | 부분적 (GPT 계열 + 한국 모델 일부) | Claude/Gemini/DeepSeek/Mistral 공식 점수 없음 |
| KoBEST | 거의 없음 | 상용 모델 공식 보고 없음, 오픈소스 모델 중심 |
| TruthfulQA | 거의 없음 | 상용 모델 미보고, Open LLM Leaderboard v2에서 제외 |
| HaluEval/Vectara | 양호 | Vectara v2 기준 주요 모델 대부분 커버 |

**권장사항**: BVA 기능에서 활용 가능한 벤치마크는 현실적으로 Vectara 환각 비율. KMMLU는 GPT 계열만 부분 활용 가능. KoBEST와 TruthfulQA는 데이터 부족으로 즉시 도입 어려움. 향후 자체 평가 파이프라인 구축 시 추가 가능.

---

## 3. 프로바이더별 컴플라이언스 조사

| 프로바이더 | SOC 2 | HIPAA | GDPR | 온프레미스 배포 | 데이터 학습 제외 | 출처 |
|-----------|-------|-------|------|----------------|-----------------|------|
| **OpenAI** | Yes (Type II) | Yes (BAA 제공) | Yes (ISO 27001/27701) | No (API/Cloud, Azure 가능) | Yes (API 기본 제외, ZDR 옵션) | [OpenAI Security](https://openai.com/security-and-privacy/), [Trust Portal](https://trust.openai.com/) |
| **Anthropic** | Yes (Type II) | Yes (BAA, Enterprise) | Yes | No (API/Cloud, AWS Bedrock/Vertex 가능) | Yes (상용 계약 기본 제외, ZDR 옵션) | [Anthropic Privacy](https://privacy.claude.com/), [Trust Center](https://trust.anthropic.com/) |
| **Google** | Yes (SOC 1/2/3) | Yes (BAA, FedRAMP High) | Yes (EU 데이터 레지던시) | Limited (Private Service Connect, Vertex AI) | Yes (Enterprise 데이터 미사용) | [GCP Compliance](https://docs.cloud.google.com/gemini/enterprise/docs/compliance-security-controls) |
| **Naver** | Yes (SOC 1/2/3) | Unknown | Yes (DPA 제공) | Yes (Neurocloud 하이브리드) | Yes (하이브리드/온프레미스) | [Naver Cloud GDPR](https://www.ncloud.com/intro/gdpr) |
| **Upstage** | Unknown | Unknown | Unknown | Yes (자체 호스팅, AWS Bedrock) | Unknown | [Upstage Solar Pro](https://www.upstage.ai/blog/en/solar-pro) |
| **Alibaba** | Yes (Type II, 반기 발행) | Unknown | Yes (GDPR Addendum, SCC) | Yes (오픈소스 모델 자체 호스팅) | N/A (자체 호스팅) / Unknown (API) | [Alibaba Trust Center](https://www.alibabacloud.com/en/trust-center/soc2) |
| **DeepSeek** | No (공개 인증 없음) | No | Under Investigation (이탈리아 DPA 조사) | Yes (오픈소스, MIT 라이선스, 완전 자체 호스팅) | Partial (설정에서 opt-out 가능, 자체 호스팅 시 해당 없음) | [DeepSeek Privacy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html) |
| **Mistral** | Yes (Type II) | Yes (BAA, 엔터프라이즈) | Yes (EU 기반 회사, 데이터 주권) | Yes (자체 호스팅, 엣지, VPC) | Yes (고객 데이터 경계 내 유지) | [Mistral Help Center](https://help.mistral.ai/en/articles/347638-do-you-have-soc2-or-iso27001-certification) |
| **Cohere** | Yes (Type II) | Partial (커스텀 모델 BAA만, SaaS 미적용) | Yes (ISO 27001) | Yes (VPC, 온프레미스 배포) | Yes (Enterprise 데이터 약속) | [Cohere Security](https://cohere.com/security), [Deployment](https://cohere.com/deployment-options) |
| **AI21** | Yes (SOC 2, ISO 27001/27017/27018) | Unknown | Yes | Yes (Jamba 프라이빗 배포) | Yes (엔터프라이즈 데이터 격리) | [AI21 SOC 2 보고](https://www.ai21.com/blog/soc-2-report/) |

### 컴플라이언스 요약

**엔터프라이즈 준비도 높음** (SOC2 + HIPAA + GDPR 모두 충족):
- OpenAI, Anthropic, Google, Mistral

**엔터프라이즈 준비도 중간** (일부 인증 보유):
- Naver (HIPAA 미확인), Cohere (HIPAA 부분), AI21 (HIPAA 미확인), Alibaba (HIPAA 미확인)

**엔터프라이즈 준비도 낮음** (주요 인증 미보유):
- DeepSeek (공식 인증 없음, 자체 호스팅으로 보완), Upstage (인증 정보 미공개)

**온프레미스 배포 가능**:
- Naver, Mistral, Cohere, AI21, DeepSeek (오픈소스), Alibaba/Qwen (오픈소스), Upstage

**온프레미스 불가** (클라우드 API만):
- OpenAI (Azure 경유 가능), Anthropic (AWS Bedrock/Vertex 경유 가능), Google (Private Service Connect)

---

## 부록: 조사 방법론 및 제약사항

1. **웹 검색 기반**: 공식 프로바이더 문서, 기술 보고서(arXiv), GitHub 리포지토리, 독립 벤치마크 사이트 활용
2. **N/A 기준**: 프로바이더 공식 보고서, 논문, 또는 신뢰할 수 있는 독립 평가에서 확인할 수 없는 점수는 N/A로 표기
3. **추정치 배제**: 모든 수치는 출처가 확인된 데이터만 포함. 추정이나 외삽 없음
4. **시점 제약**: KMMLU 논문(2024-02)은 GPT-4o 이전 모델만 포함. 최신 모델 KMMLU 점수는 독립 평가 프로젝트에서만 일부 확보
5. **벤치마크 버전 차이**: Vectara v1과 v2는 난이도가 크게 다르며 직접 비교 불가. 본 보고서는 v2(2026-03-10) 기준

### 주요 출처

- [KMMLU 논문 (arXiv:2402.11548)](https://arxiv.org/html/2402.11548v2)
- [HyperCLOVA X 기술 보고서 (arXiv:2404.01954)](https://arxiv.org/html/2404.01954v1)
- [daekeun-ml/evaluate-llm-on-korean-dataset](https://github.com/daekeun-ml/evaluate-llm-on-korean-dataset)
- [Vectara Hallucination Leaderboard](https://github.com/vectara/hallucination-leaderboard)
- [Open Ko-LLM Leaderboard (Upstage)](https://huggingface.co/spaces/upstage/open-ko-llm-leaderboard)
- [OpenAI Security & Privacy](https://openai.com/security-and-privacy/)
- [Anthropic Trust Center](https://trust.anthropic.com/)
- [Google Gemini Compliance](https://docs.cloud.google.com/gemini/enterprise/docs/compliance-security-controls)
- [Mistral Help Center](https://help.mistral.ai/en/collections/789670-regulatory-compliance-and-certification)
- [Cohere Security](https://cohere.com/security)
- [AI21 SOC 2](https://www.ai21.com/blog/soc-2-report/)
- [Alibaba Cloud Trust Center](https://www.alibabacloud.com/en/trust-center/soc2)
- [Naver Cloud GDPR](https://www.ncloud.com/intro/gdpr)
