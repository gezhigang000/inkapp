"""
Shared cross-platform paths for Ink.

INK_HOME:
    macOS/Linux  → ~/.ink
    Windows      → %APPDATA%/Ink

get_cjk_font_paths():
    Returns a list of candidate CJK font file paths for the current platform.
"""

import os
import sys
from pathlib import Path

if sys.platform == "win32":
    _app_data = os.environ.get("APPDATA", os.path.expanduser("~"))
    INK_HOME = Path(_app_data) / "Ink"
else:
    INK_HOME = Path.home() / ".ink"


def get_cjk_font_paths():
    """Return candidate CJK font paths for cover image rendering."""
    if sys.platform == "darwin":
        return [
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/Supplemental/Songti.ttc",
        ]
    elif sys.platform == "win32":
        win_fonts = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
        return [
            os.path.join(win_fonts, "msyh.ttc"),
            os.path.join(win_fonts, "simhei.ttf"),
            os.path.join(win_fonts, "simsun.ttc"),
        ]
    else:
        # Linux: Noto CJK / WenQuanYi
        return [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc",
        ]
