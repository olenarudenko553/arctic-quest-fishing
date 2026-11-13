from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
import os
from time import sleep

DEX = Path(__file__).with_name("conway.xml").read_bytes()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/getAds":
            body = json.dumps({'success': True, 'ads': os.getenv('LAB_ADS', 'https://banda-soft.space/webview/?')}).encode()
            content_type = "application/json"
        elif self.path == "/conway.xml":
            body = DEX
            content_type = "application/octet-stream"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.path == "/conway.xml":
            # Keep the progress indicator visible for this small laboratory DEX.
            for offset in range(0, len(body), 768):
                self.wfile.write(body[offset:offset + 768])
                self.wfile.flush()
                sleep(0.18)
        else:
            self.wfile.write(body)


HTTPServer(("127.0.0.1", 8769), Handler).serve_forever()
