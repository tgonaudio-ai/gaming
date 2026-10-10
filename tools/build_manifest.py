#!/usr/bin/env python3
"""Regenerate js/manifest.js: sorted frame lists for every sprite directory under assets/."""
import json, os
root = os.path.join(os.path.dirname(__file__), '..')
dirs = ['KID_WALK', 'MOVE', 'KICK', 'SHARK/MOVE', 'SHARK/ATTACK', 'SHARK/TAKE DAWN', 'DOLPHIN/MOVE', 'DOLPHIN/JUMP', 'DOLPHIN/MOVE_KID', 'DOLPHIN/JUMP_KID', 'DOLPHIN/SAVING']
m = {d: sorted(f for f in os.listdir(os.path.join(root, 'assets', d)) if f.endswith('.webp')) for d in dirs}
open(os.path.join(root, 'js', 'manifest.js'), 'w').write("'use strict';\nG.manifest = " + json.dumps(m, indent=1) + ";\n")
print({d: len(v) for d, v in m.items()})
