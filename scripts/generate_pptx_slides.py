"""Compatibility entry point. Slides are authored with Codex Artifact Tool.
Set UAY_ARTIFACT_NODE_MODULES and pass a private absolute output directory.
Validate the candidate with the presentation skill before publishing.
"""
from pathlib import Path
import os, subprocess, sys
root=Path(__file__).resolve().parents[1]
node=os.environ.get("UAY_ARTIFACT_NODE")
if not node or not Path(node).is_absolute():
    raise SystemExit("Set UAY_ARTIFACT_NODE to the Codex bundled Node executable")
subprocess.run([node,str(root/"scripts/generate-guide-slides.mjs"),*sys.argv[1:]],cwd=root,check=True)
