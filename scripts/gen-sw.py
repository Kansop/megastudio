#!/usr/bin/env python3
"""Regenerate the service-worker precache list + version hash from the files on disk."""
import hashlib, os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['./']
h = hashlib.sha1()
for d, _, fs in os.walk(root):
    if any(p in d for p in ('/.git', '/scripts', '/tests')): continue
    for f in sorted(fs):
        rel = os.path.relpath(os.path.join(d, f), root)
        if rel in ('sw.js', 'README.md', '.nojekyll') or rel.startswith('.'): continue
        files.append(rel)
        h.update(open(os.path.join(root, rel), 'rb').read())
files = ['./'] + sorted(files[1:])
sw = open(os.path.join(root, 'sw.js')).read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'megastudio-{h.hexdigest()[:10]}';", sw)
sw = re.sub(r"const SHELL = \[[\s\S]*?\];", "const SHELL = [\n  " + ",\n  ".join(repr(f) for f in files) + "\n];", sw)
open(os.path.join(root, 'sw.js'), 'w').write(sw)
print(len(files), 'files, version', h.hexdigest()[:10])
