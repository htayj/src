#!/usr/bin/env python3
"""Run a small UI/UX VLM baseline across one or more Hugging Face models.

Designed for quick triage: "are these models trash for our synthetic UI checks?"
The scoring is intentionally simple yes/no extraction plus optional offset hints.
"""

from __future__ import annotations

import argparse
import gc
import json
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "manifest.jsonl"
RESULTS_DIR = ROOT / "results"

SYSTEM_HINT = (
    "You are a meticulous UI/UX visual inspection assistant. "
    "Answer only the question asked. Inspect geometry, alignment, spacing, texture seams, "
    "icon centering, and state consistency carefully."
)

CALIBRATED_HINT = (
    "\nCalibration rules: focus only on the target components named in the question. "
    "Do not infer defects from badges, labels, shadows, decorative texture, perspective, or filename-like cues. "
    "Answer no only when the target discrepancy is clearly visible above small pixel-level tolerance; "
    "if the target appears aligned/consistent, answer yes rather than guessing a defect."
)

ANSWER_FORMAT = (
    "\n\nReturn a compact JSON object only, with keys: "
    '"answer" ("yes" or "no"), "confidence" (0 to 1), "evidence" (short), '
    'and "offset_px" (number or null).'
)


@dataclass(frozen=True)
class ModelSpec:
    name: str
    model_id: str
    loader: str
    load_in_4bit: bool = False
    max_pixels: int | None = None
    extra: dict[str, Any] | None = None


MODEL_SPECS: dict[str, ModelSpec] = {
    "qwen3vl-4b": ModelSpec("qwen3vl-4b", "Qwen/Qwen3-VL-4B-Instruct", "qwen3", load_in_4bit=True, max_pixels=1280 * 32 * 32),
    "qwen3vl-8b": ModelSpec("qwen3vl-8b", "Qwen/Qwen3-VL-8B-Instruct", "qwen3", load_in_4bit=True, max_pixels=1280 * 32 * 32),
    "qwen25vl-3b": ModelSpec("qwen25vl-3b", "Qwen/Qwen2.5-VL-3B-Instruct", "qwen25", load_in_4bit=True, max_pixels=1280 * 28 * 28),
    "qwen25vl-7b": ModelSpec("qwen25vl-7b", "Qwen/Qwen2.5-VL-7B-Instruct", "qwen25", load_in_4bit=True, max_pixels=1280 * 28 * 28),
    "uivenus-8b": ModelSpec("uivenus-8b", "inclusionAI/UI-Venus-1.5-8B", "qwen3", load_in_4bit=True, max_pixels=1280 * 32 * 32),
    "maiui-8b": ModelSpec("maiui-8b", "Tongyi-MAI/MAI-UI-8B", "qwen3", load_in_4bit=True, max_pixels=1280 * 32 * 32),
    "minicpm-v45": ModelSpec("minicpm-v45", "openbmb/MiniCPM-V-4_5", "minicpm", load_in_4bit=False),
    "molmo-7b": ModelSpec("molmo-7b", "allenai/Molmo-7B-D-0924", "molmo", load_in_4bit=True),
    "llava-onevision-7b": ModelSpec("llava-onevision-7b", "llava-hf/llava-onevision-qwen2-7b-ov-hf", "llava_ov", load_in_4bit=True),
    "infigui-3b": ModelSpec("infigui-3b", "InfiX-ai/InfiGUI-G1-3B", "qwen25", load_in_4bit=True, max_pixels=1280 * 28 * 28),
}


def read_manifest(limit: int | None = None) -> list[dict[str, Any]]:
    rows = []
    with MANIFEST.open("r", encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
            if limit is not None and len(rows) >= limit:
                break
    return rows


def resolve_image_path(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


def image_paths_for_row(row: dict[str, Any]) -> list[str]:
    mode = str(row.get("_input_mode", "full"))
    if mode == "manifest":
        if isinstance(row.get("images"), list):
            return [str(item["path"] if isinstance(item, dict) else item) for item in row["images"]]
        return [str(row["image"])]
    if mode == "full":
        return [str(row["image"])]
    if mode == "crop":
        if not row.get("crop_image"):
            raise ValueError(f"row {row.get('id')} has no crop_image for --input-mode crop")
        return [str(row["crop_image"])]
    if mode == "paired":
        if isinstance(row.get("images"), list):
            return [str(item["path"] if isinstance(item, dict) else item) for item in row["images"]]
        if not row.get("crop_image"):
            raise ValueError(f"row {row.get('id')} has no crop_image/images for --input-mode paired")
        return [str(row["image"]), str(row["crop_image"])]
    raise ValueError(f"unknown input mode: {mode}")


def load_images(row: dict[str, Any]) -> list[Image.Image]:
    return [Image.open(resolve_image_path(p)).convert("RGB") for p in image_paths_for_row(row)]


def image_path(row: dict[str, Any]) -> Path:
    return resolve_image_path(image_paths_for_row(row)[0])


def require_single_image(row: dict[str, Any], loader_name: str) -> None:
    paths = image_paths_for_row(row)
    if len(paths) != 1:
        raise ValueError(f"{loader_name} runner supports only one image, got {len(paths)} for input mode {row.get('_input_mode')}")


def build_prompt(row: dict[str, Any]) -> str:
    variant = str(row.get("_prompt_variant", "default"))
    hint = SYSTEM_HINT + (CALIBRATED_HINT if variant == "calibrated" else "")
    image_note = ""
    if len(image_paths_for_row(row)) > 1:
        image_note = "\nYou receive two images: first the full screenshot, then a crop of the target region. Use both; rely on the crop for fine pixel judgments."
    return f"{hint}{image_note}\nQuestion: {row['question']}{ANSWER_FORMAT}"


def quant_config(load_in_4bit: bool):
    if not load_in_4bit:
        return None
    from transformers import BitsAndBytesConfig

    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )


def load_qwen3(spec: ModelSpec):
    from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

    kwargs: dict[str, Any] = {
        "dtype": torch.bfloat16,
        "device_map": "auto",
        "low_cpu_mem_usage": True,
    }
    qc = quant_config(spec.load_in_4bit)
    if qc is not None:
        kwargs["quantization_config"] = qc
    try:
        kwargs["attn_implementation"] = "sdpa"
    except Exception:
        pass
    model = Qwen3VLForConditionalGeneration.from_pretrained(spec.model_id, **kwargs).eval()
    processor_kwargs: dict[str, Any] = {}
    if spec.max_pixels is not None:
        # Qwen3 processor accepts setting after load more reliably across versions.
        pass
    processor = AutoProcessor.from_pretrained(spec.model_id, trust_remote_code=True)
    if spec.max_pixels is not None and hasattr(processor, "image_processor"):
        # Token budget: max visual tokens * 32 * 32 pixels for Qwen3.
        try:
            processor.image_processor.size = {"longest_edge": spec.max_pixels, "shortest_edge": 256 * 32 * 32}
        except Exception:
            pass
    return model, processor


def generate_qwen3(model, processor, row: dict[str, Any], max_new_tokens: int) -> str:
    images = load_images(row)
    content = [{"type": "image", "image": image} for image in images]
    content.append({"type": "text", "text": build_prompt(row)})
    messages = [
        {"role": "user", "content": content},
    ]
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt",
    )
    inputs = inputs.to(model.device)
    with torch.inference_mode():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    trimmed = [o[len(i) :] for i, o in zip(inputs.input_ids, out)]
    return processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]


def load_qwen25(spec: ModelSpec):
    from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration

    kwargs: dict[str, Any] = {
        "torch_dtype": torch.bfloat16,
        "device_map": "auto",
        "low_cpu_mem_usage": True,
    }
    qc = quant_config(spec.load_in_4bit)
    if qc is not None:
        kwargs["quantization_config"] = qc
    kwargs["attn_implementation"] = "sdpa"
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(spec.model_id, **kwargs).eval()
    processor_kwargs: dict[str, Any] = {}
    if spec.max_pixels is not None:
        processor_kwargs.update({"min_pixels": 256 * 28 * 28, "max_pixels": spec.max_pixels})
    processor = AutoProcessor.from_pretrained(spec.model_id, **processor_kwargs)
    return model, processor


def generate_qwen25(model, processor, row: dict[str, Any], max_new_tokens: int) -> str:
    from qwen_vl_utils import process_vision_info

    images = load_images(row)
    content = [{"type": "image", "image": image} for image in images]
    content.append({"type": "text", "text": build_prompt(row)})
    messages = [
        {"role": "user", "content": content},
    ]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(text=[text], images=image_inputs, videos=video_inputs, padding=True, return_tensors="pt").to("cuda")
    with torch.inference_mode():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    trimmed = [o[len(i) :] for i, o in zip(inputs.input_ids, out)]
    return processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]


def load_minicpm(spec: ModelSpec):
    # MiniCPM-V 4.5 remote code currently misses this attr under newer Transformers;
    # patch the base class before from_pretrained finalizes meta-device loading.
    import transformers.modeling_utils as modeling_utils
    modeling_utils.PreTrainedModel.all_tied_weights_keys = {}
    from transformers import AutoModel, AutoProcessor, AutoTokenizer

    # MiniCPM custom code does not reliably support BNB in all releases; bf16 should fit 24GB for 8B-ish.
    model = AutoModel.from_pretrained(
        spec.model_id,
        trust_remote_code=True,
        attn_implementation="sdpa",
        torch_dtype=torch.bfloat16,
        low_cpu_mem_usage=True,
    ).eval().cuda()
    tokenizer = AutoTokenizer.from_pretrained(spec.model_id, trust_remote_code=True)
    processor = AutoProcessor.from_pretrained(spec.model_id, trust_remote_code=True)

    def patch_minicpm_tokenizer(tok):
        # Remote processor expects MiniCPM tokenizer convenience attrs that are absent
        # when loaded through newer generic TokenizersBackend.
        attrs = {
            "bos_id": tok.bos_token_id,
            "eos_id": tok.eos_token_id,
            "im_start_id": tok.convert_tokens_to_ids("<image>"),
            "im_end_id": tok.convert_tokens_to_ids("</image>"),
            "slice_start_id": tok.convert_tokens_to_ids("<slice>"),
            "slice_end_id": tok.convert_tokens_to_ids("</slice>"),
        }
        for k, v in attrs.items():
            try:
                setattr(tok, k, v)
            except Exception:
                pass
        return tok

    tokenizer = patch_minicpm_tokenizer(tokenizer)
    processor.tokenizer = patch_minicpm_tokenizer(processor.tokenizer)
    return model, tokenizer, processor


def generate_minicpm(model, tokenizer, processor, row: dict[str, Any], max_new_tokens: int) -> str:
    require_single_image(row, "MiniCPM")
    image = Image.open(image_path(row)).convert("RGB")
    msgs = [{"role": "user", "content": [image, build_prompt(row)]}]
    with torch.inference_mode():
        ans = model.chat(
            msgs=msgs,
            tokenizer=tokenizer,
            processor=processor,
            max_new_tokens=max_new_tokens,
            stream=False,
            enable_thinking=False,
            sampling=False,
        )
    return str(ans)


def load_molmo(spec: ModelSpec):
    from transformers import AutoModelForCausalLM, AutoProcessor

    kwargs: dict[str, Any] = {
        "trust_remote_code": True,
        "torch_dtype": "auto",
        "device_map": "auto",
        "low_cpu_mem_usage": True,
    }
    qc = quant_config(spec.load_in_4bit)
    if qc is not None:
        kwargs["quantization_config"] = qc
    processor = AutoProcessor.from_pretrained(spec.model_id, trust_remote_code=True, torch_dtype="auto", device_map="auto")
    model = AutoModelForCausalLM.from_pretrained(spec.model_id, **kwargs).eval()
    return model, processor


def generate_molmo(model, processor, row: dict[str, Any], max_new_tokens: int) -> str:
    from transformers import GenerationConfig

    require_single_image(row, "Molmo")
    image = Image.open(image_path(row)).convert("RGB")
    inputs = processor.process(images=[image], text=build_prompt(row))
    inputs = {k: v.to(model.device).unsqueeze(0) for k, v in inputs.items()}
    if "images" in inputs and hasattr(model, "dtype"):
        try:
            inputs["images"] = inputs["images"].to(model.dtype)
        except Exception:
            pass
    with torch.inference_mode():
        out = model.generate_from_batch(
            inputs,
            GenerationConfig(max_new_tokens=max_new_tokens, stop_strings="<|endoftext|>"),
            tokenizer=processor.tokenizer,
        )
    gen = out[0, inputs["input_ids"].size(1) :]
    return processor.tokenizer.decode(gen, skip_special_tokens=True)


def load_llava_ov(spec: ModelSpec):
    from transformers import AutoProcessor, LlavaOnevisionForConditionalGeneration

    kwargs: dict[str, Any] = {
        "torch_dtype": torch.float16,
        "device_map": "auto",
        "low_cpu_mem_usage": True,
    }
    qc = quant_config(spec.load_in_4bit)
    if qc is not None:
        kwargs["quantization_config"] = qc
    model = LlavaOnevisionForConditionalGeneration.from_pretrained(spec.model_id, **kwargs).eval()
    processor = AutoProcessor.from_pretrained(spec.model_id)
    return model, processor


def generate_llava_ov(model, processor, row: dict[str, Any], max_new_tokens: int) -> str:
    require_single_image(row, "LLaVA-OneVision")
    image = Image.open(image_path(row)).convert("RGB")
    conversation = [
        {"role": "user", "content": [{"type": "text", "text": build_prompt(row)}, {"type": "image"}]},
    ]
    prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = processor(images=image, text=prompt, return_tensors="pt").to(model.device, torch.float16)
    with torch.inference_mode():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    # Some LLaVA processors include prompt in decode; trim by input length if possible.
    trimmed = out[:, inputs["input_ids"].shape[-1] :]
    return processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]


def load_model(spec: ModelSpec):
    if spec.loader == "qwen3":
        return load_qwen3(spec), generate_qwen3
    if spec.loader == "qwen25":
        return load_qwen25(spec), generate_qwen25
    if spec.loader == "minicpm":
        return load_minicpm(spec), generate_minicpm
    if spec.loader == "molmo":
        return load_molmo(spec), generate_molmo
    if spec.loader == "llava_ov":
        return load_llava_ov(spec), generate_llava_ov
    raise ValueError(spec.loader)


def extract_jsonish(text: str) -> dict[str, Any] | None:
    candidates = []
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S)
    if m:
        candidates.append(m.group(1))
    m = re.search(r"(\{.*\})", text, flags=re.S)
    if m:
        candidates.append(m.group(1))
    for c in candidates:
        try:
            return json.loads(c)
        except Exception:
            pass
    return None


def normalize_yes_no(text: str) -> str | None:
    data = extract_jsonish(text)
    if isinstance(data, dict):
        ans = str(data.get("answer", "")).strip().lower()
        if ans in {"yes", "no"}:
            return ans
    low = text.lower()
    # Prefer explicit JSON-like answer if present
    m = re.search(r'"?answer"?\s*[:=]\s*"?(yes|no)"?', low)
    if m:
        return m.group(1)
    # Then first standalone yes/no near start
    m = re.search(r"\b(yes|no)\b", low[:300])
    if m:
        return m.group(1)
    return None


def score(row: dict[str, Any], text: str) -> dict[str, Any]:
    pred = normalize_yes_no(text)
    expected = row["expected_answer"]
    ok = pred == expected
    return {"pred_answer": pred, "expected_answer": expected, "correct": bool(ok)}


def gpu_info() -> dict[str, Any]:
    info: dict[str, Any] = {}
    if torch.cuda.is_available():
        info["torch_peak_allocated_mb"] = round(torch.cuda.max_memory_allocated() / 1024 / 1024, 1)
        info["torch_peak_reserved_mb"] = round(torch.cuda.max_memory_reserved() / 1024 / 1024, 1)
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used,memory.free", "--format=csv,noheader,nounits"], text=True
        ).strip()
        used, free = [int(x.strip()) for x in out.splitlines()[0].split(",")[:2]]
        info["nvidia_smi_used_mb"] = used
        info["nvidia_smi_free_mb"] = free
    except Exception:
        pass
    return info


def unload(obj: Any | None = None) -> None:
    if obj is not None:
        try:
            del obj
        except Exception:
            pass
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()


def main() -> None:
    global MANIFEST
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=["qwen25vl-3b"], help=f"Model keys: {', '.join(MODEL_SPECS)}")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--case", action="append", help="Run only case id (can repeat)")
    parser.add_argument("--max-new-tokens", type=int, default=160)
    parser.add_argument("--manifest", default=str(MANIFEST), help="JSONL manifest path")
    parser.add_argument("--input-mode", choices=["full", "crop", "paired", "manifest"], default="full")
    parser.add_argument("--prompt-variant", choices=["default", "calibrated"], default="default")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    MANIFEST = Path(args.manifest)
    cases = read_manifest(args.limit)
    if args.case:
        keep = set(args.case)
        cases = [c for c in cases if c["id"] in keep]
    for row in cases:
        row["_input_mode"] = args.input_mode
        row["_prompt_variant"] = args.prompt_variant
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    all_results: list[dict[str, Any]] = []
    for key in args.models:
        spec = MODEL_SPECS[key]
        print(f"\n=== Loading {spec.name}: {spec.model_id} ===", flush=True)
        t_load = time.time()
        model_tuple = None
        try:
            model_tuple, gen_fn = load_model(spec)
            load_seconds = time.time() - t_load
            print(f"Loaded {spec.name} in {load_seconds:.1f}s; {gpu_info()}", flush=True)
            for row in cases:
                t0 = time.time()
                try:
                    text = gen_fn(*model_tuple, row, args.max_new_tokens)
                    latency = time.time() - t0
                    sc = score(row, text)
                    rec = {
                        "model_key": key,
                        "model_id": spec.model_id,
                        "run_key": f"{key}/{args.input_mode}/{args.prompt_variant}",
                        "input_mode": args.input_mode,
                        "prompt_variant": args.prompt_variant,
                        "image_paths": image_paths_for_row(row),
                        "case_id": row["id"],
                        "category": row["category"],
                        "question": row["question"],
                        "expected_answer": row["expected_answer"],
                        "response": text,
                        "latency_seconds": round(latency, 2),
                        **sc,
                    }
                    print(f"{key} {row['id']}: pred={sc['pred_answer']} exp={sc['expected_answer']} ok={sc['correct']} ({latency:.1f}s)", flush=True)
                except Exception as e:
                    rec = {
                        "model_key": key,
                        "model_id": spec.model_id,
                        "run_key": f"{key}/{args.input_mode}/{args.prompt_variant}",
                        "input_mode": args.input_mode,
                        "prompt_variant": args.prompt_variant,
                        "case_id": row["id"],
                        "category": row["category"],
                        "question": row["question"],
                        "expected_answer": row["expected_answer"],
                        "error": f"{type(e).__name__}: {e}",
                        "correct": False,
                    }
                    print(f"{key} {row['id']}: ERROR {rec['error']}", flush=True)
                all_results.append(rec)
        except Exception as e:
            rec = {
                "model_key": key,
                "model_id": spec.model_id,
                "run_key": f"{key}/{args.input_mode}/{args.prompt_variant}",
                "input_mode": args.input_mode,
                "prompt_variant": args.prompt_variant,
                "load_error": f"{type(e).__name__}: {e}",
                "correct": False,
                **gpu_info(),
            }
            all_results.append(rec)
            print(f"LOAD ERROR {key}: {rec['load_error']}", flush=True)
        finally:
            model_tuple = None
            unload()

    out = Path(args.out) if args.out else RESULTS_DIR / f"baseline-{time.strftime('%Y%m%d-%H%M%S')}.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for r in all_results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"\nWrote {out}")

    # Summary
    by_model: dict[str, list[dict[str, Any]]] = {}
    for r in all_results:
        if "case_id" in r:
            by_model.setdefault(r["model_key"], []).append(r)
    for model_key, rows in by_model.items():
        n = len(rows)
        c = sum(1 for r in rows if r.get("correct"))
        print(f"SUMMARY {model_key}: {c}/{n} = {c/n:.1%}")
        cats: dict[str, list[dict[str, Any]]] = {}
        for r in rows:
            cats.setdefault(r.get("category", "?"), []).append(r)
        for cat, cr in sorted(cats.items()):
            cc = sum(1 for r in cr if r.get("correct"))
            print(f"  {cat}: {cc}/{len(cr)}")


if __name__ == "__main__":
    main()
