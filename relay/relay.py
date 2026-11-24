#!/usr/bin/env python3
"""LetAiCode local relay.

Forwards pi requests to letaicode.cn main line via `curl` subprocess, because
the site's Cloudflare WAF blocks Node/Python TLS fingerprints on the /claude
route but allows curl's. Path-based routing:
  /v1/messages          -> https://letaicode.cn/claude/v1/messages
  everything else       -> https://letaicode.cn/codex<path>
Streams the response body (incl. SSE) back to the client in real time.
"""

import http.server
import re
import subprocess
import sys

LISTEN = ("127.0.0.1", 18080)
FORWARD_TIMEOUT = 900  # seconds, generous for long thinking ops

ROUTES = [
    (re.compile(r"^/v1/messages"), "https://letaicode.cn/claude"),
    (re.compile(r"^/"), "https://letaicode.cn/codex"),
]

SKIP_HEADERS = {"host", "content-length", "connection", "accept-encoding", "user-agent"}
# The site's WAF blocks Anthropic SDK fingerprints; send a browser-like UA.
FORWARD_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _read_body(self):
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            length = 0
        return self.rfile.read(length)

    def _route(self, path):
        for rx, base in ROUTES:
            if rx.match(path):
                return base + path
        return None

    def _handle(self):
        body = self._read_body()
        path = self.path.split("?", 1)[0]
        upstream = self._route(path)
        if upstream is None:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(b"no route")
            return

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
            upstream,
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

    do_POST = _handle

    def log_message(self, format, *args):  # noqa: A002 (base class signature)
        sys.stderr.write("[relay] %s\n" % (format % args))


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(LISTEN, Handler)
    print(f"LetAiCode relay listening on {LISTEN[0]}:{LISTEN[1]}", flush=True)
    srv.serve_forever()
