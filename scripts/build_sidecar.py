#!/usr/bin/env python3
"""
PyInstaller 打包脚本：将 sidecar_main.py 打包为 Tauri sidecar 可执行文件。

用法:
    python3 scripts/build_sidecar.py

输出:
    app/src-tauri/binaries/python-sidecar-{target_triple}
"""

import platform
import subprocess
import sys
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "app" / "src-tauri" / "binaries"
ENTRY_SCRIPT = SCRIPT_DIR / "sidecar_main.py"


def get_target_triple() -> str:
    """返回当前平台的 Tauri target triple。"""
    machine = platform.machine().lower()
    system = platform.system().lower()

    if system == "darwin":
        arch = "aarch64" if machine in ("arm64", "aarch64") else "x86_64"
        return f"{arch}-apple-darwin"
    elif system == "windows":
        arch = "x86_64" if machine in ("amd64", "x86_64") else "aarch64"
        return f"{arch}-pc-windows-msvc"
    elif system == "linux":
        arch = "x86_64" if machine in ("x86_64", "amd64") else "aarch64"
        return f"{arch}-unknown-linux-gnu"
    else:
        raise RuntimeError(f"不支持的平台: {system} {machine}")


def build():
    target_triple = get_target_triple()
    exe_name = f"python-sidecar-{target_triple}"
    print(f"[build_sidecar] 目标平台: {target_triple}")
    print(f"[build_sidecar] 输出文件: {exe_name}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 收集 scripts/ 下所有 .py 模块作为 hidden imports
    hidden_imports = []
    for py_file in SCRIPT_DIR.glob("*.py"):
        mod_name = py_file.stem
        if mod_name.startswith("__") or mod_name == "build_sidecar":
            continue
        hidden_imports.extend(["--hidden-import", mod_name])

    # 第三方库 hidden imports
    third_party = [
        "requests", "PIL", "PIL.Image", "PIL.ImageDraw", "PIL.ImageFont",
        "youtube_transcript_api", "json", "re", "hashlib",
    ]
    for mod in third_party:
        hidden_imports.extend(["--hidden-import", mod])

    # 数据文件：prompts/ 和 assets/ 目录
    # Windows 用 ; 分隔，macOS/Linux 用 :
    sep = ";" if platform.system().lower() == "windows" else ":"
    datas = []
    prompts_dir = PROJECT_ROOT / "prompts"
    assets_dir = PROJECT_ROOT / "assets"
    if prompts_dir.exists():
        datas.extend(["--add-data", f"{prompts_dir}{sep}prompts"])
    if assets_dir.exists():
        datas.extend(["--add-data", f"{assets_dir}{sep}assets"])

    # 将 scripts/ 下的 .py 文件作为数据文件（供动态 import 使用）
    for py_file in SCRIPT_DIR.glob("*.py"):
        if py_file.stem != "build_sidecar":
            datas.extend(["--add-data", f"{py_file}{sep}scripts"])

    # Windows 下隐藏控制台窗口（sidecar 通过 stdin/stdout 管道通信，不需要控制台）
    noconsole = ["--noconsole"] if platform.system().lower() == "windows" else []

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        *noconsole,
        "--name", exe_name,
        "--distpath", str(OUTPUT_DIR),
        "--workpath", str(PROJECT_ROOT / "build" / "pyinstaller"),
        "--specpath", str(PROJECT_ROOT / "build"),
        "--clean",
        "--noconfirm",
        # scripts/ 目录作为额外搜索路径
        "--paths", str(SCRIPT_DIR),
        *hidden_imports,
        *datas,
        str(ENTRY_SCRIPT),
    ]

    print(f"[build_sidecar] 执行: {' '.join(cmd[:6])} ...")
    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))

    if result.returncode != 0:
        print("[build_sidecar] 打包失败！", file=sys.stderr)
        sys.exit(1)

    output_path = OUTPUT_DIR / exe_name
    if output_path.exists():
        print(f"[build_sidecar] 打包成功: {output_path}")
        print(f"[build_sidecar] 文件大小: {output_path.stat().st_size / 1024 / 1024:.1f} MB")
    else:
        print("[build_sidecar] 输出文件未找到！", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    build()
