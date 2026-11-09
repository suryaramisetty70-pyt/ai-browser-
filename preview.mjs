import http from "node:http";
import app from "./dist/server/index.js";

const portFlag = process.argv.indexOf("--port");
const port = Number(process.env.PORT || (portFlag >= 0 ? process.argv[portFlag + 1] : 5173));
http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 128000) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const origin = process.env.DESKPA_PUBLIC_ORIGIN || "http://" + req.headers.host;
    const url = new URL(origin);
    const target = new URL(req.url, url);
    if (target.origin !== url.origin) { res.writeHead(400).end(); return; }
    const request = new Request(target, {
      method: req.method, headers: req.headers,
      ...(chunks.length ? {body:Buffer.concat(chunks)} : {})
    });
    const response = await app.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500).end("Server error"); }
}).listen(port, "0.0.0.0");
