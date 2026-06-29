import re

with open("packages/database/prisma/seed.ts", "r") as f:
    content = f.read()

# Seed a default SecurityPolicy record
security_policy_seed = """
  await prisma.securityPolicy.create({
    data: {
      id: crypto.randomUUID(),
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordHistoryCount: 5,
      passwordExpiryDays: 90,
      resetTokenExpiryMinutes: 15,
      accessTokenExpiryMinutes: 15,
      refreshTokenExpiryDays: 7,
      rememberMeRefreshTokenDays: 30,
      sessionInactivityMinutes: 30,
      maxConcurrentSessions: 3,
    }
  });
  console.log('  ✓ Security Policy created');
"""
content = re.sub(r'  // 6. Seed Users, Roles, and Data Scopes\n  const passwordHash = await bcrypt\.hash\(\'Password@123\', 12\);\n',
                 f'  // 6. Seed Users, Roles, and Branch Access\n  const passwordHash = await bcrypt.hash(\'Password@123\', 12);\n{security_policy_seed}',
                 content)

# We have 6 users: superAdmin, riyadhManager, riyadhCounselor, riyadhTrainer, riyadhAccountant, muscatManager
# Let's replace the whole block of 6 users.
user_block_pattern = r'  // User A: Super Admin.*?console\.log\(\'\\n🌱 Seed script complete! Database seeded successfully\.\'\);'

user_replacement = """
  // User A: Super Admin (Global Scope)
  const superAdminPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'System', lastName: 'Administrator', mobile: '+966-500000001' }
  });
  const superAdminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: superAdminPerson.id,
      username: 'admin@ims.com',
      email: 'admin@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: superAdminUser.id, roleId: roleMap['SUPER_ADMIN'].id } });
  console.log(`  ✓ User created: admin@ims.com (SUPER_ADMIN)`);

  // User B: Riyadh Branch Manager
  const riyadhManagerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Branch Manager', mobile: '+966-500000002' }
  });
  const riyadhManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhManagerPerson.id,
      username: 'manager.riyadh@ims.com',
      email: 'manager.riyadh@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhManagerUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: manager.riyadh@ims.com (BRANCH_MANAGER, Branch AST-RIYADH)`);

  // User C: Riyadh Counselor
  const riyadhCounselorPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Counselor', mobile: '+966-500000003' }
  });
  const riyadhCounselorUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhCounselorPerson.id,
      username: 'counselor.riyadh@ims.com',
      email: 'counselor.riyadh@ims.com',
      userType: 'Counselor',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhCounselorUser.id, roleId: roleMap['COUNSELOR'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhCounselorUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: counselor.riyadh@ims.com (COUNSELOR, Branch AST-RIYADH)`);

  // User D: Riyadh Trainer
  const riyadhTrainerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Core Trainer', mobile: '+966-500000004' }
  });
  const riyadhTrainerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhTrainerPerson.id,
      username: 'trainer.riyadh@ims.com',
      email: 'trainer.riyadh@ims.com',
      userType: 'Trainer',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhTrainerUser.id, roleId: roleMap['TRAINER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhTrainerUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: trainer.riyadh@ims.com (TRAINER, Branch AST-RIYADH)`);

  // User E: Riyadh Accountant
  const riyadhAccountantPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Riyadh', lastName: 'Accountant User', mobile: '+966-500000005' }
  });
  const riyadhAccountantUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhAccountantPerson.id,
      username: 'accountant.riyadh@ims.com',
      email: 'accountant.riyadh@ims.com',
      userType: 'Accountant',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: riyadhAccountantUser.id, roleId: roleMap['ACCOUNTANT'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: riyadhAccountantUser.id, branchId: riyadhBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: accountant.riyadh@ims.com (ACCOUNTANT, Branch AST-RIYADH)`);

  // User F: Muscat Branch Manager
  const muscatManagerPerson = await prisma.person.create({
    data: { id: crypto.randomUUID(), firstName: 'Muscat', lastName: 'Branch Manager', mobile: '+966-500000006' }
  });
  const muscatManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: muscatManagerPerson.id,
      username: 'manager.muscat@ims.com',
      email: 'manager.muscat@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: muscatManagerUser.id, roleId: roleMap['BRANCH_MANAGER'].id } });
  await prisma.userBranchAccess.create({
    data: { id: crypto.randomUUID(), userId: muscatManagerUser.id, branchId: muscatBranch.id, isDefault: true, status: 'Active' }
  });
  console.log(`  ✓ User created: manager.muscat@ims.com (BRANCH_MANAGER, Branch AST-MUSCAT)`);

  console.log('\\n🌱 Seed script complete! Database seeded successfully.');
"""

content = re.sub(user_block_pattern, user_replacement, content, flags=re.DOTALL)

with open("packages/database/prisma/seed.ts", "w") as f:
    f.write(content)

