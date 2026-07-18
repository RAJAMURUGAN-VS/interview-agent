import sys
import os
import fnmatch

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
    # ── Patch Werkzeug's reloader to normalize Windows backslashes ──────────
    # On Windows, Werkzeug passes backslash paths to fnmatch which expects
    # forward slashes, so "*site-packages*" never matches. We fix this by
    # monkey-patching the reloader's _should_reload check.
    try:
        from werkzeug._reloader import ReloaderLoop

        _orig_should_reload = ReloaderLoop._should_reload  # type: ignore[attr-defined]

        def _patched_should_reload(self, filename: str) -> bool:
            # Normalize to forward slashes so fnmatch patterns work on Windows
            normalized = filename.replace("\\", "/")
            for pattern in _IGNORE:
                if fnmatch.fnmatch(normalized, pattern):
                    return False
            return _orig_should_reload(self, filename)

    except Exception:
        _patched_should_reload = None  # type: ignore[assignment]

    # Patterns matched against full file paths (forward-slash normalized).
    _IGNORE = [
        "*/site-packages/*",    # third-party libraries (pip install)
        "*/dist-packages/*",    # Debian/Ubuntu system packages
        "*/AppData/*",          # Windows user AppData (paddle, torch, etc.)
        "*/huggingface/*",      # HuggingFace model cache writes
        "*/.paddlex/*",         # PaddleOCR model cache
        "*paddlepaddle*",       # Paddle framework internals
        "*paddle*",             # Paddle (any paddle path)
        "*pyparsing*",          # pyparsing library
    ]

    # Apply the patch now that _IGNORE is defined
    if _patched_should_reload is not None:
        try:
            ReloaderLoop._should_reload = _patched_should_reload  # type: ignore[method-assign]
        except Exception:
            pass

    app.run(
        debug=True,
        port=5000,
        use_reloader=True,
        reloader_type="watchdog",
        exclude_patterns=_IGNORE,
    )
