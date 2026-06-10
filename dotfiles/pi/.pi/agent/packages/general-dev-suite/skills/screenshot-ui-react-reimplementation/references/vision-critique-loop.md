# Vision Critique Loop

Use this loop when a screenshot-to-React implementation needs visual fidelity improvements and static checks are not enough.

## 1. Capture candidate screenshot

Use a browser at the canonical viewport. Example Playwright script shape:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'validation/candidate.png', fullPage: false });
await browser.close();
```

## 2. Ask a vision-capable model

Attach both images. Do not merely mention local paths: remote models cannot read local files unless the tool uploads them or the agent attaches them as images.

Prompt template:

```text
Compare these screenshots for React reimplementation fidelity.
Image A is the reference. Image B is the candidate.
The goal is NOT to make B prettier or better UX in general; the goal is to make B look more like A.
Score 0-100 and identify the highest-impact differences where B diverges from A.
Focus on: layout, background/texture, ornate borders, panels, typography, colors, proportions, missing/incorrect UI elements.
Return: score, prioritized findings, and the smallest CSS/React fixes that make B closer to A. Avoid suggestions that add plausible decoration not visible in A.
```

Suitable routes:

- A vision subagent with image attachments, if configured.
- Oracle/ChatGPT browser with actual image/file attachments.
- Any local multimodal model/tool that accepts the two images.

## 3. Convert critique into edits

For each finding:

1. Map it to a component or CSS selector.
2. Prefer the smallest fix that improves reference fidelity without breaking layout.
3. Reject or revert changes that look more polished but less like the reference.
4. Rebuild/capture again.
4. Ask the vision model the same structured question.
5. Stop when the score improves enough or changes become subjective.

## 4. Record the loop

Save:

- reference image path
- candidate screenshot path
- vision prompt/model/tool used
- critique text
- edits made
- next capture path
- score movement

## Lessons learned

- Static build/typecheck can pass while CSS renders broken in Chromium.
- Browser screenshot capture is mandatory for texture/border work.
- Vision critique is most useful when asked targeted reference-matching questions, not generic “does this look good?”.
- If a critique suggests generic embellishment, verify the embellishment is actually present in the reference before implementing it.
