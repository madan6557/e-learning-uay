"""Export the Markdown guide from the same data used by the application."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    subprocess.run(["node", "--import", "tsx", "scripts/export-help-guide.mjs", *sys.argv[1:]], cwd=ROOT, check=True)
