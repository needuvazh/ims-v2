import { describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { createUuid, DomainError } from '@ims/shared-kernel';
import { InMemoryOrganizationRepository, OrganizationService } from './organization-service';

describe('organization service', () => {
  const actorId = createUuid('33333333-3333-3333-3333-333333333333');
  const context = { actorId };
  
  const mockUserVerifier = {
    isActiveUser: async (userId: string) => {
      if (userId === '00000000-0000-0000-0000-000000000000') return false;
      return true;
    }
  };

  it('creates institutes and records audit logs', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const result = await service.createInstitute(
      {
        instituteCode: 'IMS',
        instituteName: 'Institute Management System',
        primaryEmail: 'hello@example.com',
        taxNumber: 'VAT-12345',
      },
      context
    );

    expect(result.instituteCode).toBe('IMS');
    expect(result.taxNumber).toBe('VAT-12345');
    expect(audit.list()).toHaveLength(1);
    expect(audit.list()[0].action).toBe('organization.institute_created');
  });

  it('validates branch date-ranges and uniqueness', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const inst = await service.createInstitute(
      { instituteCode: 'IMS', instituteName: 'IMS HQ' },
      context
    );

    // 1. Invalid date range should throw Zod parsing error
    await expect(
      service.createBranch(
        {
          instituteId: inst.id,
          branchCode: 'B1',
          branchName: 'Branch 1',
          effectiveStartDate: new Date('2026-06-22'),
          effectiveEndDate: new Date('2026-06-20'), // End before Start
        },
        context
      )
    ).rejects.toThrow();

    // 2. Valid creation
    const b1 = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B1',
        branchName: 'Branch 1',
        effectiveStartDate: new Date('2026-06-20'),
        effectiveEndDate: new Date('2026-06-22'),
      },
      context
    );
    expect(b1.branchCode).toBe('B1');

    // 3. Duplicate branchCode should fail uniqueness check
    const duplicateErr = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B1',
        branchName: 'Branch 1 Duplicate',
      },
      context
    ).catch(e => e);
    expect(duplicateErr).toBeInstanceOf(DomainError);
    expect(duplicateErr.code).toBe('branch_code_already_exists');
  });

  it('verifies classroom capacity and branch active scope validation', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const inst = await service.createInstitute(
      { instituteCode: 'IMS', instituteName: 'IMS HQ' },
      context
    );

    // Create active branch
    const b1 = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B1',
        branchName: 'Branch 1',
        effectiveStartDate: new Date('2026-06-01'),
        effectiveEndDate: new Date('2026-12-31'),
      },
      context
    );

    // 1. Classroom capacity must be positive
    await expect(
      service.createClassroom(
        {
          branchId: b1.id,
          classroomName: 'Room A',
          capacity: -5,
        },
        context
      )
    ).rejects.toThrow();

    await expect(
      service.createClassroom(
        {
          branchId: b1.id,
          classroomName: 'Room A',
          capacity: 0,
        },
        context
      )
    ).rejects.toThrow();

    // 2. Create valid classroom
    const room = await service.createClassroom(
      {
        branchId: b1.id,
        classroomName: 'Room A',
        capacity: 25,
      },
      context
    );
    expect(room.classroomName).toBe('Room A');
    expect(room.capacity).toBe(25);

    // 3. Duplicate name in same branch should fail
    const dupRoomErr = await service.createClassroom(
      {
        branchId: b1.id,
        classroomName: 'Room A',
        capacity: 30,
      },
      context
    ).catch(e => e);
    expect(dupRoomErr).toBeInstanceOf(DomainError);
    expect(dupRoomErr.code).toBe('classroom_name_already_exists');

    // Deactivate branch
    await service.updateBranch(b1.id, { status: 'Inactive' }, context);

    // 4. Cannot create classroom under inactive branch scope
    const inactiveBranchErr = await service.createClassroom(
      {
        branchId: b1.id,
        classroomName: 'Room B',
        capacity: 10,
      },
      context
    ).catch(e => e);
    expect(inactiveBranchErr).toBeInstanceOf(DomainError);
    expect(inactiveBranchErr.code).toBe('inactive_branch_cannot_be_used');
  });

  it('cascades branch deactivation status and prevents child activation under inactive branch', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const inst = await service.createInstitute(
      { instituteCode: 'IMS', instituteName: 'IMS HQ' },
      context
    );

    const branch = await service.createBranch(
      { instituteId: inst.id, branchCode: 'BR', branchName: 'Muscat' },
      context
    );

    const dept = await service.createDepartment(
      { branchId: branch.id, departmentCode: 'IT', departmentName: 'Tech' },
      context
    );

    const room = await service.createClassroom(
      { branchId: branch.id, classroomName: 'Lab 1', capacity: 20 },
      context
    );

    expect(dept.status).toBe('Active');
    expect(room.status).toBe('Active');

    // Deactivate branch
    await service.updateBranch(branch.id, { status: 'Inactive' }, context);

    // Fetch child items from repository to verify cascade
    const updatedDept = await repository.findDepartmentById(dept.id);
    const updatedRoom = await repository.findClassroomById(room.id);

    expect(updatedDept?.status).toBe('Inactive');
    expect(updatedRoom?.status).toBe('Inactive');

    // Verify detailed branch_deactivated audit log is appended
    const deactLogs = audit.list().filter(l => l.action === 'organization.branch_deactivated');
    expect(deactLogs).toHaveLength(1);

    // Attempting to activate department back under inactive parent branch should throw DomainError
    const activateDeptErr = await service.updateDepartment(dept.id, { status: 'Active' }, context).catch(e => e);
    expect(activateDeptErr).toBeInstanceOf(DomainError);
    expect(activateDeptErr.code).toBe('inactive_branch_cannot_be_used');

    // Assigning branch manager records branch_manager_assigned audit
    await service.updateBranch(branch.id, { branchManagerId: '11111111-1111-1111-1111-111111111111' }, context);
    const managerAssignedLogs = audit.list().filter(l => l.action === 'organization.branch_manager_assigned');
    expect(managerAssignedLogs).toHaveLength(1);
  });

  it('validates branch manager and department head assignment against active users and audits head assignment', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const inst = await service.createInstitute(
      { instituteCode: 'IMS', instituteName: 'IMS HQ' },
      context
    );

    // 1. Assigning inactive manager should fail on creation
    await expect(
      service.createBranch(
        {
          instituteId: inst.id,
          branchCode: 'B-BAD',
          branchName: 'Bad Branch',
          branchManagerId: '00000000-0000-0000-0000-000000000000',
        },
        context
      )
    ).rejects.toThrowError(/is not a valid active IAM user/);

    // 2. Assigning active manager should succeed
    const branch = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B-GOOD',
        branchName: 'Good Branch',
        branchManagerId: '11111111-1111-1111-1111-111111111111',
      },
      context
    );
    expect(branch.branchManagerId).toBe('11111111-1111-1111-1111-111111111111');

    // 3. Assigning inactive manager should fail on update
    await expect(
      service.updateBranch(branch.id, { branchManagerId: '00000000-0000-0000-0000-000000000000' }, context)
    ).rejects.toThrowError(/is not a valid active IAM user/);

    // 4. Assigning inactive head should fail on department creation
    await expect(
      service.createDepartment(
        {
          branchId: branch.id,
          departmentCode: 'D-BAD',
          departmentName: 'Bad Dept',
          departmentHeadId: '00000000-0000-0000-0000-000000000000',
        },
        context
      )
    ).rejects.toThrowError(/is not a valid active IAM user/);

    // 5. Assigning active head should succeed
    const dept = await service.createDepartment(
      {
        branchId: branch.id,
        departmentCode: 'D-GOOD',
        departmentName: 'Good Dept',
        departmentHeadId: '11111111-1111-1111-1111-111111111111',
      },
      context
    );
    expect(dept.departmentHeadId).toBe('11111111-1111-1111-1111-111111111111');

    // 6. Assigning inactive head should fail on department update
    await expect(
      service.updateDepartment(dept.id, { departmentHeadId: '00000000-0000-0000-0000-000000000000' }, context)
    ).rejects.toThrowError(/is not a valid active IAM user/);

    // 7. Assigning active head on update should log department_head_assigned audit
    await service.updateDepartment(dept.id, { departmentHeadId: '22222222-2222-2222-2222-222222222222' }, context);
    const headAssignedLogs = audit.list().filter(l => l.action === 'organization.department_head_assigned');
    expect(headAssignedLogs).toHaveLength(1);
    expect(headAssignedLogs[0].details).toEqual({ headId: '22222222-2222-2222-2222-222222222222' });
  });

  it('verifies inclusive date checks (midnight boundary bug resolution)', async () => {
    const repository = new InMemoryOrganizationRepository();
    const audit = new InMemoryAuditLogRepository();
    const service = new OrganizationService(repository, audit, mockUserVerifier);

    const inst = await service.createInstitute(
      { instituteCode: 'IMS', instituteName: 'IMS HQ' },
      context
    );

    // Set effective start/end to exactly today
    const today = new Date();
    const b1 = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B1',
        branchName: 'Branch 1',
        effectiveStartDate: today,
        effectiveEndDate: today,
      },
      context
    );

    // Even though now has hours/minutes/seconds, since effective start and end dates match today,
    // the branch must be considered active (inclusive day boundaries).
    const isActive = await service.isBranchActive(b1.id);
    expect(isActive).toBe(true);

    // If we set effective end date to yesterday, it should be inactive today.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const b2 = await service.createBranch(
      {
        instituteId: inst.id,
        branchCode: 'B2',
        branchName: 'Branch 2',
        effectiveStartDate: yesterday,
        effectiveEndDate: yesterday,
      },
      context
    );
    const isActiveB2 = await service.isBranchActive(b2.id);
    expect(isActiveB2).toBe(false);
  });
});

