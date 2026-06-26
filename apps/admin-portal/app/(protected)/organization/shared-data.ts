import { assertAnyPermission } from '../../lib/auth-guard';
import { isGlobalScope, getAuthorizedBranchIds } from '@ims/shared-auth';

export async function loadOrganizationData() {
  const session = await assertAnyPermission([
    'organization.manage',
    'organization.branch.manage',
    'organization.department.manage',
    'organization.classroom.manage',
  ]);
  const { organizationService, userService } = await import('../../lib/runtime');

  const [
    { items: institutes },
    { items: branches },
    { items: classrooms },
    usersList,
  ] = await Promise.all([
    organizationService.listInstitutes({ pageSize: 100 }),
    organizationService.listBranches({ pageSize: 100 }),
    organizationService.listClassrooms({ pageSize: 100 }),
    userService.listUsers(),
  ]);

  const globalScope = isGlobalScope(session);
  const authorizedBranchIds = getAuthorizedBranchIds(session) || [];

  const filteredBranches = globalScope
    ? branches
    : branches.filter((b) => authorizedBranchIds.includes(b.id));

  const filteredClassrooms = globalScope
    ? classrooms
    : classrooms.filter((c) => authorizedBranchIds.includes(c.branchId));

  const deptsList = await Promise.all(
    filteredBranches.map((b) => organizationService.listDepartments(b.id))
  );
  const departments = deptsList.flat();

  const rawHierarchy = institutes.length > 0
    ? await organizationService.getOrganizationHierarchy(institutes[0].id)
    : null;

  const hierarchy = rawHierarchy && !globalScope
    ? {
        ...rawHierarchy,
        children: (rawHierarchy.children || []).filter((branch) =>
          authorizedBranchIds.includes(branch.id)
        ),
      }
    : rawHierarchy;

  const userOptions = usersList.map((u: { id: string; fullName: string; email: string }) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
  }));

  return {
    institutes,
    branches: filteredBranches,
    departments,
    classrooms: filteredClassrooms,
    users: userOptions,
    hierarchy,
  };
}
