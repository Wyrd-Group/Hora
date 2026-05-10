"""
Simple HTTP server for the Quadratic Terminal dashboard.
Serves the single-page React app on port 3000.
"""
import http.server
import os
import sys

PORT = int(os.environ.get("TERMINAL_PORT", 4000))
DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(DIR)

handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map.update({
    ".js": "application/javascript",
    ".html": "text/html",
    ".css": "text/css",
    ".json": "application/json",
})

with http.server.HTTPServer(("0.0.0.0", PORT), handler) as httpd:
    print(f"\n  Quadratic Terminal → http://localhost:{PORT}\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nTerminal server stopped.")
        sys.exit(0)
