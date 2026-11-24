#!/usr/bin/env python3
"""LetAiCode local relay (bundled with pi-letaicode).

Forwards requests to https://letaicode.cn/codex via `curl` subprocess, because
the site's Cloudflare WAF blocks Node/Python TLS fingerprints on the API
routes but allows curl's. Every model this extension registers speaks the
OpenAI Chat Completions format on the /codex base, so this is a single-target
passthrough.

GET /healthz answers {"ok": true} so the extension can check liveness.
Streams the response body (incl. SSE) back to the client in real time.

Usage: relay.py [port]   (default 18081)
"""

import http.server
import json
import subprocess
import sys

FORWARD_TIMEOUT = 900  # seconds, generous for long thinking ops
UPSTREAM = "https://letaicode.cn/codex"
SKIP_HEADERS = {"host", "content-length", "connection", "accept-encoding", "user-agent"}
# The site's WAF blocks non-browser TLS fingerprints; send a browser-like UA.
FORWARD_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/healthz":
            body = json.dumps({"ok": True}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def _read_body(self):
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            length = 0
        return self.rfile.read(length)

    def _forward(self):
        body = self._read_body()
        cmd = [
            "curl",
            "-sS",
            "-i",
            "-N",
            "--max-time",
            str(FORWARD_TIMEOUT),
            "-A",
            FORWARD_UA,
            "-X",
            self.command,
            UPSTREAM + self.path,
            "--data-binary",
            "@-",
        ]
        for key, value in self.headers.items():
            if key.lower() in SKIP_HEADERS:
                continue
            cmd += ["-H", f"{key}: {value}"]

        try:
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
        except OSError as exc:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(f"relay error: {exc}".encode())
            return

        if proc.stdin is None or proc.stdout is None:
            proc.kill()
            self.send_response(502)
            self.end_headers()
            self.wfile.write(b"relay error: no stdio pipes")
            return

        stdin, stdout = proc.stdin, proc.stdout

        try:
            if body:
                stdin.write(body)
            stdin.close()
        except BrokenPipeError:
            pass  # curl died early; read whatever it printed below

        # Read upstream headers incrementally until the blank line.
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = stdout.read(256)
            if not chunk:
                break
            buf += chunk

        head, _, rest = buf.partition(b"\r\n\r\n")
        if not rest:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(buf[:400])
            return

        status = 502
        lines = head.split(b"\r\n")
        if lines:
            parts = lines[0].decode("latin1").split(" ")
            if len(parts) >= 2:
                try:
                    status = int(parts[1])
                except ValueError:
                    status = 502

        self.send_response(status)
        for line in lines[1:]:
            if b":" in line:
                key, _, value = line.partition(b":")
                if key.lower() not in (
                    b"transfer-encoding",
                    b"connection",
                    b"content-length",
                ):
                    self.send_header(
                        key.decode("latin1"), value.strip().decode("latin1")
                    )
        self.send_header("Connection", "close")
        self.end_headers()

        # Stream the body (SSE chunks) as they arrive.
        self.wfile.write(rest)
        self.wfile.flush()
        while True:
            chunk = stdout.read(8192)
            if not chunk:
                break
            self.wfile.write(chunk)
            self.wfile.flush()

    do_POST = _forward

    def log_message(self, format, *args):  # noqa: A002 (base class signature)
        sys.stderr.write("[relay] %s\n" % (format % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 18081
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"LetAiCode relay listening on 127.0.0.1:{port}", flush=True)
    srv.serve_forever()
