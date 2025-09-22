export const runtime = "edge";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) return jsonResponse(500, { error: "Missing XAI_API_KEY (or GROK_API_KEY)" });

    const { question, system, model, history } = (await req.json().catch(() => ({}))) as {
      question?: string;
      system?: string;
      model?: string;
      history?: Array<{ role?: string; content?: string }>;
    };
    if (!question || typeof question !== "string") {
      return jsonResponse(400, { error: "Missing question" });
    }

    const chosenModel = model || process.env.XAI_MODEL || "grok-2-latest";

    const systemMessage =
      system ||
      "You are an experienced interview coach speaking naturally with the candidate. Keep answers concise, but conversational and human, using everyday language and positive encouragement. Avoid generic corporate tone or bullet lists unless requested.";

    const historyMessages = Array.isArray(history)
      ? history
          .filter((m) => m && typeof m === "object" && typeof m.content === "string" && typeof m.role === "string")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }))
      : [];

    const payload = {
      model: chosenModel,
      stream: true,
      messages: [
        { role: "system", content: systemMessage },
        ...historyMessages,
        { role: "user", content: question },
      ],
    };

    const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok || !upstream.body) {
      const raw = await upstream.text().catch(() => "");
      return jsonResponse(upstream.status || 502, { error: "xAI Grok upstream error", details: raw || upstream.statusText });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = upstream.body.getReader();

    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) await writer.write(value);
        }
      } catch {
        // swallow
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const msg = (e as Error).message || "Server error";
    return jsonResponse(500, { error: msg });
  }
}
