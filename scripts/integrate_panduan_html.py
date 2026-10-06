"""Compatibility entry point for exporting the application guide.

To re-import panduan.html, use scripts/import-help-guide.mjs first and review
its output. This command exports the reviewed application content only.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    subprocess.run(["node", "--import", "tsx", "scripts/export-help-guide.mjs", *sys.argv[1:]], cwd=ROOT, check=True)
