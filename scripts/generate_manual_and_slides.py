# -*- coding: utf-8 -*-
"""
Generator script for Master User Guide (Markdown, DOCX), Presentation Deck (PPTX),
and Interactive Web Slides (HTML) for Universitas Achmad Yani (UAY) E-Learning.
Covers all roles: Super Admin, Department Admin, Instructor (Dosen), and Student (Mahasiswa).
"""
import os
import sys
from pathlib import Path

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
IMAGES_DIR = DOCS_DIR / "images"

print(f"Working directory: {ROOT}")
print(f"Docs directory: {DOCS_DIR}")
