import os
import re

root = r"android/app/src/main/java"
files = []
for dirpath, _, names in os.walk(root):
    for n in names:
        if n.endswith((".kt", ".java")):
            files.append(os.path.join(dirpath, n))

type_names = set()
member_of = {}  # fun name -> list of object names
file_level = {}  # path -> set of file-level fun names (approx: fun after last object close is hard)

# Parse each file into objects with their member functions by brace depth.
def parse(text):
    types = []
    # crude: find object/class Name { ... } by brace count from the declaration
    for m in re.finditer(r"(?:^|\n)\s*(?:object|class|interface)\s+(\w+)", text):
        name = m.group(1)
        brace = text.find("{", m.end())
        if brace < 0:
            continue
        depth = 0
        end = brace
        for i in range(brace, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        body = text[brace:end]
        funs = set(re.findall(r"\bfun\s+(\w+)\s*\(", body))
        types.append((name, funs, m.start()))
    # file-level funs: fun whose position is outside all type bodies
    spans = []
    for m in re.finditer(r"(?:^|\n)\s*(?:object|class|interface)\s+(\w+)", text):
        brace = text.find("{", m.end())
        if brace < 0:
            continue
        depth = 0
        end = brace
        for i in range(brace, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        spans.append((brace, end))
    file_funs = set()
    for m in re.finditer(r"\bfun\s+(\w+)\s*\(", text):
        pos = m.start()
        if any(a <= pos <= b for a, b in spans):
            continue
        file_funs.add(m.group(1))
    return types, file_funs

parsed = {}
for f in files:
    text = open(f, encoding="utf-8", errors="replace").read()
    types, file_funs = parse(text)
    parsed[f] = (text, types, file_funs)
    for name, funs, _ in types:
        type_names.add(name)
        for fn in funs:
            member_of.setdefault(fn, []).append(name)

call_re = re.compile(r"(?<![\.\w])([A-Z][A-Za-z0-9_]*)\s*\(")
qual_re = re.compile(r"\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z0-9_]+)\s*\(")
import_re = re.compile(r"^import\s+([\w.]+)", re.M)

print("--- unqualified calls missing in file ---")
for f, (text, types, file_funs) in parsed.items():
    local_members = set()
    for _, funs, _ in types:
        local_members |= funs
    visible = local_members | file_funs
    for m in call_re.finditer(text):
        name = m.group(1)
        if name in visible or name in type_names:
            continue
        if "Obf" not in name and not name.endswith("Hub"):
            continue
        line = text[: m.start()].count("\n") + 1
        owners = member_of.get(name, [])
        print("%s:%s %s owners=%s" % (f.replace("\\", "/"), line, name, owners))

print("--- qualified calls whose member is absent ---")
for f, (text, types, file_funs) in parsed.items():
    for m in qual_re.finditer(text):
        obj, fn = m.group(1), m.group(2)
        if "Obf" not in fn and "Hub" not in obj:
            continue
        if obj not in type_names:
            line = text[: m.start()].count("\n") + 1
            print("NO TYPE %s:%s %s.%s" % (f.replace("\\", "/"), line, obj, fn))
            continue
        owners = member_of.get(fn, [])
        if obj not in owners:
            line = text[: m.start()].count("\n") + 1
            print("NO MEMBER %s:%s %s.%s owners=%s" % (f.replace("\\", "/"), line, obj, fn, owners))

print("--- bad same-package imports ---")
for f, (text, types, file_funs) in parsed.items():
    for m in import_re.finditer(text):
        imp = m.group(1)
        if "eziiceacmatrchpockwet2594" not in imp:
            continue
        simple = imp.split(".")[-1]
        if simple not in type_names and simple not in ("R",):
            line = text[: m.start()].count("\n") + 1
            print("%s:%s %s" % (f.replace("\\", "/"), line, simple))
