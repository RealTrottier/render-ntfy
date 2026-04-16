const http = require("http");

const HOST = "0.0.0.0";
const PORT = 8787;

const NTFY_TOPIC = "detection_bureau";
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk.toString("utf8");
      // garde-fou
      if (data.length > 10_000) {
        reject(new Error("Body trop gros"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function envoyerVersNtfy(message) {
  const response = await fetch(NTFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "Detection bureau",
      "Priority": "default",
      "Tags": "warning,eyes"
    },
    body: message
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, service: "relay-ntfy" }));
      return;
    }

    if (req.method === "POST" && req.url === "/ntfy") {
      const body = await readRequestBody(req);
      const now = new Date();

const date = now.toLocaleDateString("fr-CA", {
  timeZone: "America/Toronto"
});

const time = now.toLocaleTimeString("fr-CA", {
  timeZone: "America/Toronto"
});

const message = `${body.trim() || "Mouvement detecte"} a ${time} le ${date}`;

      console.log(`[${new Date().toISOString()}] Message Arduino: ${message}`);

      const result = await envoyerVersNtfy(message);

      console.log(`[${new Date().toISOString()}] ntfy status=${result.status}`);

      if (!result.ok) {
        res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Erreur ntfy: ${result.status}\n${result.text}`);
        return;
      }

      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("OK ntfy");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (err) {
    console.error("Erreur serveur:", err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Erreur serveur: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Relais ntfy actif sur http://${HOST}:${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
