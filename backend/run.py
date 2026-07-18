import sys
import os

# ── Pre-import libraries that write files to site-packages on first import ──
# cv2 writes cv2/config.py and cv2/config-3.py when first imported.
# Importing here ensures those writes happen BEFORE Werkzeug's file watcher
# starts — so they never appear as "source code changes" during an upload.
try:
    import cv2      # noqa: F401
except ImportError:
    pass
try:
    import numpy    # noqa: F401
except ImportError:
    pass

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Patterns matched against full file paths via fnmatch.
    # "*site-packages*" matches on both Windows (backslash) and Unix paths.
    # NOTE: do NOT add "*.pyc" here — Werkzeug already includes it internally
    # and adding it to excludes causes ValueError: conflicting patterns.
    _IGNORE = [
        "*site-packages*",      # third-party libraries
        "*dist-packages*",      # Debian/Ubuntu variant
        "*huggingface*",        # model cache writes
        "*.paddlex*",           # PaddleOCR model cache
    ]

    app.run(
        debug=True,
        port=5000,
        use_reloader=True,
        reloader_type="watchdog",
        exclude_patterns=_IGNORE,
    )
