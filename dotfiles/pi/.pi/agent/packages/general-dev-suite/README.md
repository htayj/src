# general-dev-suite

A generalized Pi package converted from `~/claude-plugin-marketplace.work`.

It keeps the useful development workflows and removes repo-specific assumptions:

- slash-command prompt templates for implementation, verification, tests, E2E, branch readiness, review-request/pipeline work, TODO pipelines, iterative autoimprove runs, and TypeScript references
- Agent Skill style skills for TDD, generic build/test procedures, REST endpoint work, frontend design, Git workflows, device simulators, and Pi skill authoring
- Pi extension helpers for safe bash nudges, changed-file tracking, notes tools, generic HTTP API calls, and ComfyUI/Civitai workflow tooling; the durable dependency-aware task graph now lives in the standalone `pi-task-graph` package
- Pi subagent definitions in `~/.pi/agent/agents/general-dev/` for implementation, verification, unit/API/E2E/perf testing, code review, and UX review
- Pi subagent chains in `~/.pi/agent/chains/general-dev/` such as `general-dev-do`, `general-dev-plan`, `general-dev-verify`, and test/review chains

Loaded globally from `~/.pi/agent/settings.json` as a local Pi package. Subagent agents/chains are installed in Pi's user-level subagents directories because `pi-subagents` discovers those separately from Pi packages.

## Task graph workflow

The task graph extension now lives in its own package/repository:

- Local development checkout: `/home/tay/src/pi-task-graph`
- GitHub remote: `git@github.com:htayj/pi-task-graph.git`
- Pi package source: `git:git@github.com:htayj/pi-task-graph`

This package intentionally excludes `extensions/task-graph/` from its active Pi extension manifest to avoid duplicate `task_graph_*` and `todo` tools. The old source tree is still preserved here for reference while the standalone package is the canonical active source.

See the standalone repo README for task graph tools, settings paths, validation commands, and extraction provenance.

## ComfyUI and Civitai tools

The `comfyui.ts` extension targets a local ComfyUI server, defaulting to `http://127.0.0.1:8188` (`PI_COMFYUI_URL`/`COMFYUI_URL` override). It is not limited to image generation: `comfyui_api` can call arbitrary ComfyUI HTTP endpoints for queue/history/settings/jobs/userdata/custom-node APIs, while specialized tools cover status, node schemas, model files, workflow files, workflow queueing, history, image upload/download, and Civitai metadata/downloads.

Local workflow JSON files are stored in `~/.pi/comfyui/workflows` by default (`PI_COMFYUI_WORKFLOW_DIR` override). Civitai downloads use public metadata/download endpoints unless `CIVITAI_API_TOKEN` is already present in the environment; tokens must not be stored in dotfiles or prompts. Download filenames are sanitized and direct download URLs are restricted to `https://*.civitai.com`; image uploads refuse non-local ComfyUI URLs unless explicitly overridden.
