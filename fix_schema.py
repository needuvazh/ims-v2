import re

with open("packages/database/prisma/schema.prisma", "r") as f:
    content = f.read()

content = re.sub(r'\s*userDataScopes\s+UserDataScope\[\]\n', '\n', content)

with open("packages/database/prisma/schema.prisma", "w") as f:
    f.write(content)

