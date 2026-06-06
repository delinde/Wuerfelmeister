#!/usr/bin/env bash
# ── Würfelmeister Versions-Bump ───────────────────────────────
# Patch-Stelle +1, Berliner Datum + Uhrzeit aktualisieren.
# Aufruf:  bash version-bump.sh
# Optional: bash version-bump.sh "Neuer Codename"

HTML=/home/www/wuem.fl.de/html/wuerfel.html
DATUM=$(TZ='Europe/Berlin' date '+%Y-%m-%d')
UHRZEIT=$(TZ='Europe/Berlin' date '+%H:%M')
CODENAME_ARG="${1:-}"

python3 - "$HTML" "$DATUM" "$UHRZEIT" "$CODENAME_ARG" <<'PYEOF'
import sys, re

html_path, datum, uhrzeit, codename_arg = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
text = open(html_path, encoding='utf-8').read()

# Aktuellen Stand lesen (Datum optional mit Uhrzeit dahinter)
m = re.search(r'v\s+([0-9]+)\.([0-9]+)\.([0-9]+)\s*&nbsp;·&nbsp;\s*([^&<]+?)\s*&nbsp;·&nbsp;', text)
if not m:
    print("Fehler: Versionsmuster nicht gefunden", file=sys.stderr)
    sys.exit(1)

major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
alte_version = f"{major}.{minor}.{patch}"
neue_version  = f"{major}.{minor}.{patch+1}"
codename = codename_arg.strip() if codename_arg.strip() else m.group(4).strip()

# Ersetzen – Datum+Uhrzeit am Ende, alles nach dem zweiten ·&nbsp; bis zum nächsten Tag
text2 = re.sub(
    r'v\s+' + re.escape(alte_version) + r'\s*&nbsp;·&nbsp;\s*[^&<]+?\s*&nbsp;·&nbsp;\s*[\w:/ -]+',
    f'v {neue_version} &nbsp;·&nbsp; {codename} &nbsp;·&nbsp; {datum} {uhrzeit}',
    text
)

open(html_path, 'w', encoding='utf-8').write(text2)
print(f"✓ Version {alte_version} → {neue_version}  ({datum} {uhrzeit}, Berlin)")
print(f"  Codename: {codename}")
print(f"  Datei:    {html_path}")
PYEOF
