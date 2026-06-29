with open("packages/database/prisma/seed.ts", "r") as f:
    content = f.read()

content = content.replace("  console.log('\n🌱 Seed script complete! Database seeded successfully.');\n", "  console.log('\\n🌱 Seed script complete! Database seeded successfully.');\n")

with open("packages/database/prisma/seed.ts", "w") as f:
    f.write(content)

