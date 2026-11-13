import re
import pathlib

root = pathlib.Path(r"e:\TD\react\Tоwеr Rush (3299 MS1)\android\app\src\main\java")
decl = re.compile(
    r"\bfinal\s+(?:int|long|String|boolean|double|float|byte|char|short)\s+([A-Za-z_][A-Za-z0-9_]*)\s*="
)

for p in root.rglob("*.java"):
    text = p.read_text(encoding="utf-8", errors="replace")
    stripped = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    stripped = re.sub(r"//.*?$", "", stripped, flags=re.M)
    scopes = []
    line = 1
    i = 0
    dups = []
    while i < len(stripped):
        ch = stripped[i]
        if ch == "\n":
            line += 1
            i += 1
            continue
        if ch == "{":
            scopes.append({})
            i += 1
            continue
        if ch == "}":
            if scopes:
                scopes.pop()
            i += 1
            continue
        m = decl.match(stripped, i)
        if m and scopes:
            name = m.group(1)
            prev = None
            for sc in scopes:
                if name in sc:
                    prev = sc[name]
                    break
            if prev is not None:
                dups.append((line, name, prev))
            else:
                scopes[-1][name] = line
            i = m.end()
            continue
        i += 1
    if dups:
        print(f"{p.relative_to(root)} {len(dups)}")
        for ln, name, prev in dups[:40]:
            print(f"  L{ln} {name} (prev L{prev})")
