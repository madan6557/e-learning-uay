"""Assemble already verified guide artifacts without regenerating stale content."""
from pathlib import Path
import argparse, shutil
ROOT=Path(__file__).resolve().parents[1]
FILES=["Buku Panduan Penggunaan E-Learning UAY.docx","Buku Panduan Penggunaan E-Learning UAY.pdf","Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx","BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md","PANDUAN_OPERASIONAL_PENGGUNA_UAY.md","SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html","panduan.html","PANDUAN_ARTIFACTS.md"]
def assemble(destination):
    destination.mkdir(parents=True,exist_ok=True)
    for name in FILES:shutil.copy2(ROOT/"docs"/name,destination/name)
    shutil.copytree(ROOT/"docs/images",destination/"images",dirs_exist_ok=True)
    shutil.copy2(ROOT/"docs/PANDUAN_ARTIFACTS.md",destination/"README.md")
    print(f"Copied {len(FILES)} verified guide files to {destination}")
if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--output",type=Path,default=ROOT.parent/"Panduan");args=parser.parse_args();assemble(args.output.resolve())
