import { Router, type IRouter } from "express";
import { ParseMenuImageBody, ParseMenuImageResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const DAILY_IMPORT_LIMIT = 30;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

let importWindowStartedAt = Date.now();
let importsInWindow = 0;

router.post("/menu/parse", async (req, res): Promise<void> => {
  const parsed = ParseMenuImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid image request." });
    return;
  }

  const { mimeType, imageBase64 } = parsed.data;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    res.status(400).json({ error: "The uploaded image is not valid base64." });
    return;
  }

  const now = Date.now();
  if (now - importWindowStartedAt >= RATE_WINDOW_MS) {
    importWindowStartedAt = now;
    importsInWindow = 0;
  }
  if (importsInWindow >= DAILY_IMPORT_LIMIT) {
    res.status(429).json({ error: "Daily menu import limit reached. Try again tomorrow." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Menu image extraction is not configured." });
    return;
  }

  importsInWindow += 1;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this restaurant menu image. Return a JSON object with an items array and sourceLanguage. Each item must contain name, category, price as a number, and description as a string or null. Preserve the menu's language and currency values as printed, do not guess unreadable prices, and omit items that cannot be read confidently. Return an empty items array if no menu entries are legible.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    req.log.error({ status: response.status }, "Menu image extraction failed");
    res.status(502).json({ error: "Could not read this menu image. Please try a clearer image." });
    return;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    res.status(502).json({ error: "The menu reader returned no results." });
    return;
  }

  let extraction: unknown;
  try {
    extraction = JSON.parse(content);
  } catch {
    res.status(502).json({ error: "The menu reader returned an unreadable response." });
    return;
  }

  const result = ParseMenuImageResponse.safeParse(extraction);
  if (!result.success) {
    req.log.warn({ error: result.error.message }, "Menu extraction response failed validation");
    res.status(502).json({ error: "The extracted menu could not be validated." });
    return;
  }

  res.json(result.data);
});

export default router;
