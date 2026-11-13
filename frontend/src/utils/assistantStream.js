import api, { API_URL } from "../api.js";

/**
 * Calls POST /api/assistant/stream using Fetch ReadableStream so LLM tokens
 * appear live as they are generated. Ollama failures are passed back to the UI.
 */
export async function askAssistantStream({
  question,
  model = "ollama:llama3.2:latest",
  lang = "en",
  history = [],
  currentContext = {},
  onMeta,
  onToken,
  onDone,
}) {
  let tokenReceived = false;
  const askJson = async () => {
    try {
      const { data } = await api.post("/api/assistant/ask", {
        question,
        model,
        lang,
        history,
        currentContext,
      });
      onMeta?.({
        lang: data.lang,
        modelUsed: data.modelUsed,
        relatedSchemes: data.relatedSchemes || [],
        relatedBatch: data.relatedBatch || null,
        suggestedActions: data.suggestedActions || [],
        followUpQuestions: data.followUpQuestions || [],
      });
      if (data.answer) {
        tokenReceived = true;
        onToken?.(data.answer);
      }
      onDone?.({ answer: data.answer, modelUsed: data.modelUsed });
    } catch {
      throw new Error(err.response?.data?.error || err.message || "Could not reach Ollama.");
    }
  };

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}/api/assistant/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, model, lang, history, currentContext }),
    });
  } catch {
    return askJson();
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) detail = data.error;
    } catch { /* response body may not be JSON */ }
    throw new Error(detail);
  }

  if (!res.body) return askJson();
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    let next;
    try {
      next = await reader.read();
    } catch (err) {
      if (tokenReceived) throw new Error("The Ollama response stream was interrupted. Please retry your question.");
      return askJson();
    }
    const { value, done } = next;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const lines = block.split("\n");
      let eventName = "message";
      let dataStr = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataStr += line.slice(5).trim();
        }
      }

      if (!dataStr) continue;
      let parsed;
      try {
        parsed = JSON.parse(dataStr);
      } catch {
        continue;
      }
      if (eventName === "error") throw new Error(parsed.error || "Ollama request failed");
      if (eventName === "meta" && onMeta) onMeta(parsed);
      else if (eventName === "token" && onToken && parsed.token) {
        tokenReceived = true;
        onToken(parsed.token);
      } else if (eventName === "done" && onDone) onDone(parsed);
    }
  }
}
