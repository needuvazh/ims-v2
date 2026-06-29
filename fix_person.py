with open("packages/database/prisma/seed.ts", "r") as f:
    content = f.read()

content = content.replace("  await prisma.user.deleteMany({});", "  await prisma.user.deleteMany({});\n  await prisma.person.deleteMany({});")

with open("packages/database/prisma/seed.ts", "w") as f:
    f.write(content)
