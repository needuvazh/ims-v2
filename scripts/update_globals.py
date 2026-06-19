import os
import glob
import re

new_vars = """
  --ims-paper:       #FAF8F4;
  --ims-surface:     #FFFFFF;
  --ims-ink:         #14213d;
  --ims-muted:       #3a4a6b;
  --ims-brass:       #c47d46;
  --ims-brass-soft:  rgba(196, 125, 70, 0.16);
  --ims-accent-soft: rgba(196, 125, 70, 0.09);
  --ims-border:      #e8e4db;
"""

def update_globals(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace the light mode tokens
    content = re.sub(
        r':root\s*\{[^}]*\}',
        ':root {\n' + new_vars + '\n  --ims-ring:        rgba(196, 125, 70, 0.5);\n  --ims-radius-sm:   0.5rem;\n  --ims-radius:      0.875rem;\n  --ims-radius-lg:   1.25rem;\n  --ims-radius-xl:   1.75rem;\n  --ims-radius-2xl:  2rem;\n  --ims-success:     #166534;\n  --ims-success-bg:  #f0fdf4;\n  --ims-success-border: rgba(22, 101, 52, 0.25);\n  --ims-warning:     #92400e;\n  --ims-warning-bg:  #fffbeb;\n  --ims-warning-border: rgba(146, 64, 14, 0.25);\n  --ims-error:       #991b1b;\n  --ims-error-bg:    #fef2f2;\n  --ims-error-border: rgba(153, 27, 27, 0.25);\n  --ims-info:        #1e3a5f;\n  --ims-info-bg:     #eff6ff;\n  --ims-info-border: rgba(30, 58, 95, 0.22);\n}',
        content
    )

    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Updated {file_path}")

for file_path in glob.glob('apps/*/app/globals.css'):
    update_globals(file_path)
