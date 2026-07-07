import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exam, Result & Completion Management Permissions
const examResultCompletionPermissions = [
  // Exam Permissions
  { moduleCode: 'exam-completion', featureCode: 'exam', actionCode: 'view', permissionCode: 'exam.view', permissionType: 'Action' as const, description: 'View exams list and details.' },
  { moduleCode: 'exam-completion', featureCode: 'exam', actionCode: 'create', permissionCode: 'exam.create', permissionType: 'Action' as const, description: 'Create new exams.' },
  { moduleCode: 'exam-completion', featureCode: 'exam', actionCode: 'update', permissionCode: 'exam.update', permissionType: 'Action' as const, description: 'Update exam details and schedule.' },
  { moduleCode: 'exam-completion', featureCode: 'exam', actionCode: 'delete', permissionCode: 'exam.delete', permissionType: 'Action' as const, description: 'Cancel or archive exams.' },

  // Result Permissions
  { moduleCode: 'exam-completion', featureCode: 'result', actionCode: 'view', permissionCode: 'result.view', permissionType: 'Action' as const, description: 'View results list and details.' },
  { moduleCode: 'exam-completion', featureCode: 'result', actionCode: 'create', permissionCode: 'result.create', permissionType: 'Action' as const, description: 'Record exam results.' },
  { moduleCode: 'exam-completion', featureCode: 'result', actionCode: 'finalize', permissionCode: 'result.finalize', permissionType: 'Action' as const, description: 'Finalize recorded results.' },
  { moduleCode: 'exam-completion', featureCode: 'result', actionCode: 'correct', permissionCode: 'result.correct', permissionType: 'Action' as const, description: 'Correct finalized results.' },
  { moduleCode: 'exam-completion', featureCode: 'result', actionCode: 'export', permissionCode: 'result.export', permissionType: 'Action' as const, description: 'Export results data.' },

  // Completion Permissions
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'view', permissionCode: 'completion.view', permissionType: 'Action' as const, description: 'View completions list and details.' },
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'evaluate', permissionCode: 'completion.evaluate', permissionType: 'Action' as const, description: 'Evaluate course completions.' },
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'reevaluate', permissionCode: 'completion.reevaluate', permissionType: 'Action' as const, description: 'Request reevaluation of approved completions.' },
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'recommend', permissionCode: 'completion.recommend', permissionType: 'Action' as const, description: 'Recommend completions (Trainer role).' },
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'coordinator-review', permissionCode: 'completion.coordinator-review', permissionType: 'Action' as const, description: 'Review completions (Coordinator role).' },
  { moduleCode: 'exam-completion', featureCode: 'completion', actionCode: 'final-approve', permissionCode: 'completion.final-approve', permissionType: 'Action' as const, description: 'Final approval of completions (Branch Manager role).' },

  // Report Permissions
  { moduleCode: 'exam-completion', featureCode: 'report', actionCode: 'view', permissionCode: 'exam-completion.report.view', permissionType: 'Action' as const, description: 'View exam and completion reports.' },
  { moduleCode: 'exam-completion', featureCode: 'report', actionCode: 'export', permissionCode: 'exam-completion.report.export', permissionType: 'Action' as const, description: 'Export exam and completion reports.' },

  // Menu Permissions
  { moduleCode: 'exam-completion', featureCode: 'menu', actionCode: 'view', permissionCode: 'exam-completion.menu.view', permissionType: 'Menu' as const, description: 'View Exam & Completion menu.' },
];

// Default Role Bundles for Exam & Completion
const roleBundles = [
  {
    roleCode: 'ACADEMIC_ADMINISTRATOR',
    roleName: 'Academic Administrator',
    permissions: [
      'exam.view', 'exam.create', 'exam.update', 'exam.delete',
      'result.view', 'result.create', 'result.finalize', 'result.correct', 'result.export',
      'completion.view', 'completion.evaluate', 'completion.reevaluate',
      'exam-completion.report.view', 'exam-completion.report.export',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'ACADEMIC_COORDINATOR',
    roleName: 'Academic Coordinator',
    permissions: [
      'exam.view',
      'result.view', 'result.create', 'result.finalize',
      'completion.view', 'completion.evaluate', 'completion.coordinator-review',
      'exam-completion.report.view',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'TRAINER',
    roleName: 'Trainer',
    permissions: [
      'exam.view',
      'result.view', 'result.create',
      'completion.view', 'completion.recommend',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'BRANCH_MANAGER',
    roleName: 'Branch Manager',
    permissions: [
      'exam.view', 'exam.create', 'exam.update', 'exam.delete',
      'result.view', 'result.create', 'result.finalize', 'result.correct',
      'completion.view', 'completion.evaluate', 'completion.final-approve',
      'exam-completion.report.view', 'exam-completion.report.export',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'AUDITOR',
    roleName: 'Auditor',
    permissions: [
      'exam.view',
      'result.view', 'result.export',
      'completion.view',
      'exam-completion.report.view', 'exam-completion.report.export',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'READ_ONLY_ACADEMIC',
    roleName: 'Read-Only Academic',
    permissions: [
      'exam.view',
      'result.view',
      'completion.view',
      'exam-completion.menu.view',
    ],
  },
  {
    roleCode: 'EXECUTIVE_VIEWER',
    roleName: 'Executive Viewer',
    permissions: [
      'exam.view',
      'result.view',
      'completion.view',
      'exam-completion.report.view',
      'exam-completion.menu.view',
    ],
  },
];

async function seedExamResultCompletionPermissions() {
  console.log('Seeding Exam, Result & Completion permissions...');

  // Create permissions
  for (const perm of examResultCompletionPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { permissionCode: perm.permissionCode },
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          id: crypto.randomUUID(),
          moduleCode: perm.moduleCode,
          featureCode: perm.featureCode,
          actionCode: perm.actionCode,
          permissionCode: perm.permissionCode,
          permissionType: perm.permissionType,
          description: perm.description,
          status: 'Active',
        },
      });
      console.log(`  Created permission: ${perm.permissionCode}`);
    }
  }

  // Create roles and assign permissions
  for (const bundle of roleBundles) {
    let role = await prisma.role.findUnique({
      where: { roleCode: bundle.roleCode },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          id: crypto.randomUUID(),
          roleCode: bundle.roleCode,
          roleName: bundle.roleName,
          description: `Role for ${bundle.roleName} with exam and completion access.`,
          status: 'Active',
        },
      });
      console.log(`  Created role: ${bundle.roleCode}`);
    }

    // Assign permissions to role
    const permissions = await prisma.permission.findMany({
      where: { permissionCode: { in: bundle.permissions } },
    });

    for (const perm of permissions) {
      const existing = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: perm.id },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            id: crypto.randomUUID(),
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
    console.log(`  Assigned ${permissions.length} permissions to ${bundle.roleCode}`);
  }

  console.log('Exam, Result & Completion permissions seeded successfully.');
}

seedExamResultCompletionPermissions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
