"""
Transform models.json from old schema to new schema.
Also generates model-benchmarks.json and model-pricing.json.

Run: python3 scripts/migrate-models.py
"""
import json
import re
from datetime import datetime

PROVIDER_ID_MAP = {
    "OpenAI": "OPENAI",
    "Anthropic": "ANTHROPIC",
    "Google": "GOOGLE",
    "xAI": "XAI",
    "Alibaba": "ALIBABA",
    "DeepSeek": "DEEPSEEK",
    "Zhipu AI": "ZHIPU",
    "Moonshot AI": "MOONSHOT",
}

TIER_MAP = {
    "flagship": "flagship",
    "mid": "mid",
    "small": "light",
    "mini": "light",
    "micro": "light",
}

# Family extraction rules: (slug_prefix, family, variant_regex)
FAMILY_RULES = [
    # OpenAI
    (r"^gpt-5-4-pro$", "GPT-5", "5.4 Pro"),
    (r"^gpt-5-4$", "GPT-5", "5.4"),
    (r"^gpt-4o$", "GPT-4o", None),
    (r"^gpt-4o-mini$", "GPT-4o", "Mini"),
    (r"^gpt-4-1$", "GPT-4.1", None),
    (r"^gpt-4-1-mini$", "GPT-4.1", "Mini"),
    (r"^gpt-4-1-nano$", "GPT-4.1", "Nano"),
    (r"^o4-mini$", "o4", "Mini"),
    (r"^o3-pro$", "o3", "Pro"),
    (r"^gpt-oss-120b$", "GPT-OSS", "120B"),
    (r"^gpt-oss-20b$", "GPT-OSS", "20B"),
    # Anthropic
    (r"^claude-4-opus$", "Claude 4", "Opus"),
    (r"^claude-sonnet-4$", "Claude 4", "Sonnet"),
    (r"^claude-haiku-4-5$", "Claude 4", "Haiku 4.5"),
    (r"^claude-opus-4-6$", "Claude 4", "Opus 4.6"),
    (r"^claude-sonnet-4-6$", "Claude 4", "Sonnet 4.6"),
    # Google
    (r"^gemini-3-1-pro$", "Gemini 3", "3.1 Pro"),
    (r"^gemini-3-pro$", "Gemini 3", "Pro"),
    (r"^gemini-3-flash$", "Gemini 3", "Flash"),
    (r"^gemini-3-1-flash-lite$", "Gemini 3", "3.1 Flash-Lite"),
    (r"^gemini-2-5-pro$", "Gemini 2.5", "Pro"),
    (r"^gemini-2-5-flash$", "Gemini 2.5", "Flash"),
    (r"^gemini-2-5-flash-lite$", "Gemini 2.5", "Flash-Lite"),
    (r"^gemini-2-0-flash$", "Gemini 2.0", "Flash"),
    (r"^gemini-2-0-flash-lite$", "Gemini 2.0", "Flash Lite"),
    (r"^gemma-3-27b$", "Gemma 3", "27B"),
    (r"^gemma-3-12b$", "Gemma 3", "12B"),
    (r"^gemma-3-4b$", "Gemma 3", "4B"),
    (r"^gemma-3-1b$", "Gemma 3", "1B"),
    (r"^gemma-3n-e4b$", "Gemma 3n", "E4B"),
    # xAI
    (r"^grok-4-1$", "Grok 4", "4.1"),
    (r"^grok-4-1-fast$", "Grok 4", "4.1 Fast"),
    (r"^grok-4$", "Grok 4", None),
    (r"^grok-4-fast$", "Grok 4", "Fast"),
    (r"^grok-3$", "Grok 3", None),
    (r"^grok-3-mini$", "Grok 3", "Mini"),
    (r"^grok-3-fast$", "Grok 3", "Fast"),
    (r"^grok-2$", "Grok 2", None),
    (r"^grok-2-vision$", "Grok 2", "Vision"),
    (r"^grok-2-mini$", "Grok 2", "Mini"),
    # Alibaba
    (r"^qwen-3-5-397b-a17b$", "Qwen 3.5", "397B-A17B"),
    (r"^qwen-3-5-122b-a10b$", "Qwen 3.5", "122B-A10B"),
    (r"^qwen-3-5-35b-a3b$", "Qwen 3.5", "35B-A3B"),
    (r"^qwen-3-5-27b$", "Qwen 3.5", "27B"),
    (r"^qwen-3-5-9b$", "Qwen 3.5", "9B"),
    (r"^qwen-3-5-4b$", "Qwen 3.5", "4B"),
    (r"^qwen-3-5-2b$", "Qwen 3.5", "2B"),
    (r"^qwen-3-5-0-8b$", "Qwen 3.5", "0.8B"),
    (r"^qwen-3-235b-a22b$", "Qwen 3", "235B-A22B"),
    (r"^qwen-3-30b-a3b$", "Qwen 3", "30B-A3B"),
    (r"^qwen-3-32b$", "Qwen 3", "32B"),
    (r"^qwen-3-14b$", "Qwen 3", "14B"),
    (r"^qwen-3-8b$", "Qwen 3", "8B"),
    (r"^qwen-3-4b$", "Qwen 3", "4B"),
    (r"^qwen-3-1-7b$", "Qwen 3", "1.7B"),
    (r"^qwen-3-0-6b$", "Qwen 3", "0.6B"),
    # DeepSeek
    (r"^deepseek-r1$", "DeepSeek R1", None),
    (r"^deepseek-r1-0528$", "DeepSeek R1", "0528"),
    (r"^deepseek-r1-70b$", "DeepSeek R1", "70B"),
    (r"^deepseek-r1-32b$", "DeepSeek R1", "32B"),
    (r"^deepseek-r1-14b$", "DeepSeek R1", "14B"),
    (r"^deepseek-r1-8b$", "DeepSeek R1", "8B"),
    (r"^deepseek-r1-7b$", "DeepSeek R1", "7B"),
    (r"^deepseek-r1-1-5b$", "DeepSeek R1", "1.5B"),
    (r"^deepseek-v3$", "DeepSeek V3", None),
    (r"^deepseek-v3-0324$", "DeepSeek V3", "0324"),
    (r"^deepseek-v3-2$", "DeepSeek V3", "V3.2"),
    (r"^deepseek-r1-distill-qwen-32b$", "DeepSeek R1 Distill", "Qwen 32B"),
    (r"^deepseek-r1-distill-llama-70b$", "DeepSeek R1 Distill", "Llama 70B"),
    (r"^deepseek-r1-distill-qwen-14b$", "DeepSeek R1 Distill", "Qwen 14B"),
    (r"^deepseek-r1-distill-qwen-7b$", "DeepSeek R1 Distill", "Qwen 7B"),
    # Zhipu AI
    (r"^glm-5$", "GLM-5", None),
    (r"^glm-4-7$", "GLM-4", "4.7"),
    (r"^glm-4-7-flash$", "GLM-4", "4.7 Flash"),
    (r"^glm-4-plus$", "GLM-4", "Plus"),
    (r"^glm-4-flash$", "GLM-4", "Flash"),
    (r"^glm-4-air$", "GLM-4", "Air"),
    # Moonshot AI
    (r"^kimi-k2-5$", "Kimi", "K2.5"),
    (r"^kimi-k2$", "Kimi", "K2"),
    (r"^moonshot-v1-128k$", "Moonshot", "V1 128K"),
]

# Models known to have vision capabilities
VISION_SLUGS = {
    "gpt-5-4-pro", "gpt-5-4", "gpt-4o", "gpt-4o-mini", "gpt-4-1", "gpt-4-1-mini",
    "claude-4-opus", "claude-sonnet-4", "claude-opus-4-6", "claude-sonnet-4-6",
    "gemini-3-1-pro", "gemini-3-pro", "gemini-3-flash", "gemini-3-1-flash-lite",
    "gemini-2-5-pro", "gemini-2-5-flash", "gemini-2-5-flash-lite",
    "gemini-2-0-flash", "gemini-2-0-flash-lite",
    "gemma-3-27b", "gemma-3-12b", "gemma-3-4b",
    "grok-4-1", "grok-4", "grok-2-vision",
    "qwen-3-5-397b-a17b", "qwen-3-5-122b-a10b", "qwen-3-235b-a22b", "qwen-3-30b-a3b",
}

# Reasoning models (thinkingMode=true)
REASONING_SLUGS = {
    "gpt-5-4-pro", "o4-mini", "o3-pro",
    "deepseek-r1", "deepseek-r1-0528",
    "deepseek-r1-70b", "deepseek-r1-32b", "deepseek-r1-14b",
    "deepseek-r1-8b", "deepseek-r1-7b", "deepseek-r1-1-5b",
    "deepseek-r1-distill-qwen-32b", "deepseek-r1-distill-llama-70b",
    "deepseek-r1-distill-qwen-14b", "deepseek-r1-distill-qwen-7b",
    "qwen-3-5-397b-a17b", "qwen-3-5-122b-a10b", "qwen-3-5-35b-a3b",
    "qwen-3-5-27b", "qwen-3-5-9b", "qwen-3-5-4b", "qwen-3-5-2b", "qwen-3-5-0-8b",
    "qwen-3-235b-a22b", "qwen-3-30b-a3b", "qwen-3-32b", "qwen-3-14b",
    "qwen-3-8b", "qwen-3-4b", "qwen-3-1-7b", "qwen-3-0-6b",
}

# Models with function calling support
FUNC_CALLING_SLUGS = {
    "gpt-5-4-pro", "gpt-5-4", "gpt-4o", "gpt-4o-mini", "gpt-4-1", "gpt-4-1-mini", "gpt-4-1-nano",
    "o4-mini", "o3-pro",
    "claude-4-opus", "claude-sonnet-4", "claude-haiku-4-5",
    "claude-opus-4-6", "claude-sonnet-4-6",
    "gemini-3-1-pro", "gemini-3-pro", "gemini-3-flash", "gemini-3-1-flash-lite",
    "gemini-2-5-pro", "gemini-2-5-flash", "gemini-2-5-flash-lite",
    "gemini-2-0-flash", "gemini-2-0-flash-lite",
    "grok-4-1", "grok-4-1-fast", "grok-4", "grok-4-fast",
    "grok-3", "grok-3-mini", "grok-3-fast", "grok-2",
    "qwen-3-5-397b-a17b", "qwen-3-5-122b-a10b", "qwen-3-5-35b-a3b",
    "qwen-3-235b-a22b", "qwen-3-30b-a3b", "qwen-3-32b", "qwen-3-14b", "qwen-3-8b",
    "deepseek-r1-0528", "deepseek-v3", "deepseek-v3-0324", "deepseek-v3-2",
    "glm-5", "glm-4-7", "glm-4-7-flash", "glm-4-plus", "glm-4-flash", "glm-4-air",
    "kimi-k2", "kimi-k2-5",
}

# Models that support fine-tuning
FINE_TUNING_SLUGS = {
    "gpt-4o", "gpt-4o-mini", "gpt-4-1", "gpt-4-1-mini", "gpt-4-1-nano",
}

# Models that support batch API
BATCH_API_SLUGS = {
    "gpt-5-4-pro", "gpt-5-4", "gpt-4o", "gpt-4o-mini", "gpt-4-1", "gpt-4-1-mini", "gpt-4-1-nano",
    "claude-4-opus", "claude-sonnet-4", "claude-haiku-4-5",
    "claude-opus-4-6", "claude-sonnet-4-6",
}

# Korean language support (known to support Korean well)
KOREAN_SUPPORT_SLUGS = {
    "gpt-5-4-pro", "gpt-5-4", "gpt-4o", "gpt-4o-mini", "gpt-4-1", "gpt-4-1-mini",
    "claude-4-opus", "claude-sonnet-4", "claude-haiku-4-5",
    "claude-opus-4-6", "claude-sonnet-4-6",
    "gemini-3-1-pro", "gemini-3-pro", "gemini-3-flash",
    "gemini-2-5-pro", "gemini-2-5-flash",
    "qwen-3-5-397b-a17b", "qwen-3-5-122b-a10b", "qwen-3-5-35b-a3b", "qwen-3-5-27b",
    "qwen-3-235b-a22b", "qwen-3-30b-a3b", "qwen-3-32b", "qwen-3-14b", "qwen-3-8b",
    "deepseek-r1", "deepseek-r1-0528", "deepseek-v3", "deepseek-v3-0324", "deepseek-v3-2",
    "glm-5", "glm-4-7", "glm-4-plus", "glm-4-flash",
    "kimi-k2", "kimi-k2-5",
}


def get_family_variant(slug):
    for pattern, family, variant in FAMILY_RULES:
        if re.match(pattern, slug):
            return family, variant
    return None, None


def get_tags(model):
    tags = []
    slug = model["slug"]

    if slug in REASONING_SLUGS:
        tags.append("reasoning")

    bm = model.get("benchmarks", {})
    swe = bm.get("swe_bench")
    if swe and swe >= 40:
        tags.append("coding")

    if slug in VISION_SLUGS:
        tags.append("vision")

    if model.get("contextWindow", 0) >= 200000:
        tags.append("long-context")

    if model["type"] == "open-source":
        ps = model.get("parameterSize")
        if ps and ps <= 10:
            tags.append("lightweight")
        elif ps and ps >= 100:
            tags.append("large")

    return tags


def get_capabilities(slug):
    return {
        "functionCalling": slug in FUNC_CALLING_SLUGS,
        "structuredOutput": slug in FUNC_CALLING_SLUGS,  # generally same set
        "streaming": True,
        "systemPrompt": True,
        "vision": slug in VISION_SLUGS,
        "toolUse": slug in FUNC_CALLING_SLUGS,
        "fineTuning": slug in FINE_TUNING_SLUGS,
        "batchApi": slug in BATCH_API_SLUGS,
        "thinkingMode": slug in REASONING_SLUGS,
    }


def get_languages(slug):
    if slug in KOREAN_SUPPORT_SLUGS:
        return ["en", "ko", "multi"]
    return ["en"]


def get_modality_input(slug):
    if slug in VISION_SLUGS:
        return ["text", "image"]
    return ["text"]


def transform_model(old):
    slug = old["slug"]
    provider_id = PROVIDER_ID_MAP.get(old["provider"], old["provider"].upper())
    family, variant = get_family_variant(slug)

    pricing = old.get("pricing", {})
    new_pricing = {
        "inputPer1m": pricing.get("input"),
        "outputPer1m": pricing.get("output"),
        "pricingType": "api"
    }
    if old["type"] == "open-source" and pricing.get("input") == 0 and pricing.get("output") == 0:
        new_pricing["pricingType"] = "self-hosted"

    # Keep existing benchmarks, add null for new ones
    benchmarks = dict(old.get("benchmarks", {}))
    for key in ["truthfulqa", "bfcl", "ifeval", "ruler"]:
        if key not in benchmarks:
            benchmarks[key] = None

    new_model = {
        "name": old["name"],
        "slug": slug,
        "providerId": provider_id,
        "family": family,
        "variant": variant,
        "type": old["type"],
        "tier": TIER_MAP.get(old["tier"], "light"),
        "tags": get_tags(old),
        "releaseDate": old.get("releaseDate"),
        "license": old.get("license", "Proprietary"),
        "isOpensource": old["type"] == "open-source",
        "status": "active",
        "deprecationDate": None,
        "parameterSize": old.get("parameterSize"),
        "activeParameters": old.get("activeParameters"),
        "architecture": old.get("architecture", "dense"),
        "contextWindow": old.get("contextWindow", 0),
        "maxOutput": old.get("maxOutput", 4096),
        "trainingCutoff": None,
        "languages": get_languages(slug),
        "modalityInput": get_modality_input(slug),
        "modalityOutput": ["text"],
        "capabilities": get_capabilities(slug),
        "pricing": new_pricing,
        "compliance": old.get("compliance", {
            "soc2": False, "hipaa": False, "gdpr": False,
            "onPremise": False, "dataExclusion": False
        }),
        "benchmarks": benchmarks,
        "avgTps": None,
        "ttftMs": None,
        "regions": None,
        "infrastructure": old.get("infrastructure"),
        "openRouterModelId": old.get("openRouterModelId"),
        "memo": old.get("memo", ""),
        "sourceUrls": old.get("sourceUrls", []),
        "lastVerifiedAt": old.get("lastVerifiedAt", "2026-03-11"),
    }

    return new_model


def extract_benchmarks(models):
    """Extract benchmarks to long format."""
    records = []
    for model in models:
        benchmarks = model.get("benchmarks", {})
        for key, score in benchmarks.items():
            if score is not None:
                records.append({
                    "modelId": model["slug"],
                    "benchmarkId": key,
                    "score": score,
                    "source": f"{model.get('provider', 'Unknown')} official",
                    "measuredDate": "2026-03-01"
                })
    return records


def extract_pricing(models):
    """Extract pricing to separate collection."""
    records = []
    for model in models:
        pricing = model.get("pricing", {})
        inp = pricing.get("input")
        out = pricing.get("output")

        if inp is None and out is None:
            continue

        pricing_type = "api"
        if model["type"] == "open-source" and inp == 0 and out == 0:
            pricing_type = "self-hosted"

        record = {
            "modelId": model["slug"],
            "pricingType": pricing_type,
            "currency": "USD",
            "effectiveFrom": "2026-03-01",
            "effectiveTo": None,
            "inputPer1m": inp,
            "outputPer1m": out,
        }

        # Calculate cached/batch from discounts
        caching_discount = pricing.get("cachingDiscount", 0)
        batch_discount = pricing.get("batchDiscount", 0)

        if caching_discount > 0 and inp:
            record["cachedInput"] = round(inp * (1 - caching_discount), 4)
        else:
            record["cachedInput"] = None

        if batch_discount > 0:
            record["batchInput"] = round(inp * (1 - batch_discount), 4) if inp else None
            record["batchOutput"] = round(out * (1 - batch_discount), 4) if out else None
        else:
            record["batchInput"] = None
            record["batchOutput"] = None

        record["gpuRequirement"] = None
        record["costPerHour"] = None
        record["notes"] = None

        records.append(record)

    return records


def transform_presets(presets):
    """Add 4 new weight keys to presets, redistributing from existing weights."""
    new_presets = []
    for p in presets:
        old_weights = p["weights"]
        # Current total should be ~1.0
        # Allocate small amounts to new dimensions from existing budget
        # Take proportionally from existing weights
        old_total = sum(old_weights.values())
        if old_total == 0:
            old_total = 1

        # New dimensions get 20% of total, existing get 80%
        scale = 0.80
        new_weights = {
            "reasoning": round(old_weights.get("reasoning", 0) * scale, 3),
            "korean": round(old_weights.get("korean", 0) * scale, 3),
            "coding": round(old_weights.get("coding", 0) * scale, 3),
            "knowledge": round(old_weights.get("knowledge", 0) * scale, 3),
            "cost": round(old_weights.get("cost", 0) * scale, 3),
            "reliability": 0.05,
            "toolUse": 0.05,
            "instruction": 0.05,
            "longContext": 0.05,
        }

        new_preset = dict(p)
        new_preset["weights"] = new_weights
        new_presets.append(new_preset)

    return new_presets


def main():
    # Load old data
    with open("data/models.json") as f:
        old_models = json.load(f)

    with open("data/industry-presets.json") as f:
        old_presets = json.load(f)

    # Transform models
    new_models = [transform_model(m) for m in old_models]

    # Extract long-format data from OLD models (before transformation)
    model_benchmarks = extract_benchmarks(old_models)
    model_pricing = extract_pricing(old_models)

    # Transform presets
    new_presets = transform_presets(old_presets)

    # Write output files
    with open("data/models.json", "w") as f:
        json.dump(new_models, f, indent=2, ensure_ascii=False)
    print(f"models.json: {len(new_models)} models transformed")

    with open("data/model-benchmarks.json", "w") as f:
        json.dump(model_benchmarks, f, indent=2, ensure_ascii=False)
    print(f"model-benchmarks.json: {len(model_benchmarks)} records")

    with open("data/model-pricing.json", "w") as f:
        json.dump(model_pricing, f, indent=2, ensure_ascii=False)
    print(f"model-pricing.json: {len(model_pricing)} records")

    with open("data/bva-presets.json", "w") as f:
        json.dump(new_presets, f, indent=2, ensure_ascii=False)
    print(f"bva-presets.json: {len(new_presets)} presets")

    # Validate
    missing_family = [m["slug"] for m in new_models if m["family"] is None]
    if missing_family:
        print(f"\nWARNING: {len(missing_family)} models missing family:")
        for s in missing_family:
            print(f"  - {s}")

    print("\nDone!")


if __name__ == "__main__":
    main()
