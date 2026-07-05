import { PrismaClient } from '@prisma/client';

export const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || ''}*@${domain}`;
  }
  return `${local[0]}******${local[local.length - 1]}@${domain}`;
};

export const maskPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return phone;
  const last = cleaned.substring(cleaned.length - 3);
  if (cleaned.startsWith('+968')) {
    const omaniHeader = '+968';
    const carrier = cleaned.substring(4, cleaned.length - 3);
    if (carrier.length > 2) {
      return `${omaniHeader} ${carrier.substring(0, 2)}***${last}`;
    }
    return `${omaniHeader} ***${last}`;
  }
  const first = cleaned.substring(0, cleaned.length - 6);
  return `${first}***${last}`;
};

export const maskNationalId = (nationalId: string | null | undefined): string | null => {
  if (!nationalId) return null;
  if (nationalId.length < 4) return '****';
  return `${nationalId.substring(0, 2)}******${nationalId.substring(nationalId.length - 2)}`;
};

export interface GlobalPersonLookupOptions {
  revealSensitive?: boolean;
}

export interface StudentBranchInfo {
  branchId: string;
  branchName: string;
  relation: 'Home' | 'Admission' | 'Enrollment';
}

export class StudentQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async globalPersonLookup(query: string, activeBranchId?: string | null, options: GlobalPersonLookupOptions = {}) {
    if (!query || !query.trim()) {
      throw new Error('ERR_VAL_FAILED: Query cannot be empty');
    }

    const trimmed = query.trim();
    const revealSensitive = options.revealSensitive ?? false;

    // Match person globally on email, mobile, or national ID.
    const person = await this.prisma.person.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { email: trimmed },
          { mobile: trimmed },
          { nationalId: trimmed },
        ],
      },
      include: {
        studentProfiles: {
          where: { isDeleted: false },
          include: {
            branch: {
              select: {
                id: true,
                branchName: true,
              },
            },
            admissions: {
              where: { isDeleted: false },
              select: {
                id: true,
                branchId: true,
                admissionStatus: true,
                branch: {
                  select: {
                    id: true,
                    branchName: true,
                  },
                },
              },
            },
            enrollments: {
              where: { isDeleted: false },
              select: {
                id: true,
                branchId: true,
                enrollmentStatus: true,
                branch: {
                  select: {
                    id: true,
                    branchName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!person) {
      return {
        personFound: false,
        personId: null,
        firstNameMasked: null,
        lastNameMasked: null,
        maskedMobile: null,
        maskedEmail: null,
        studentProfileId: null,
        studentNumber: null,
        preflight: null,
      };
    }

    const studentProfile = person.studentProfiles?.[0] || null;
    const branchInfoMap = new Map<string, StudentBranchInfo>();
    let preflight = null;

    if (studentProfile) {
      if (studentProfile.branch) {
        branchInfoMap.set(studentProfile.branch.id, {
          branchId: studentProfile.branch.id,
          branchName: studentProfile.branch.branchName,
          relation: 'Home',
        });
      }

      const activeAdmission = activeBranchId
        ? await this.prisma.admission.findFirst({
            where: {
              studentProfileId: studentProfile.id,
              branchId: activeBranchId,
              isDeleted: false,
              admissionStatus: {
                in: ['Draft', 'Submitted', 'Approved'],
              },
            },
          })
        : null;

      const enrollmentCount = await this.prisma.enrollment.count({
        where: {
          studentProfileId: studentProfile.id,
          isDeleted: false,
        },
      });

      for (const admission of studentProfile.admissions || []) {
        if (admission.branch) {
          branchInfoMap.set(admission.branch.id, {
            branchId: admission.branch.id,
            branchName: admission.branch.branchName,
            relation: 'Admission',
          });
        }
      }

      for (const enrollment of studentProfile.enrollments || []) {
        if (enrollment.branch) {
          branchInfoMap.set(enrollment.branch.id, {
            branchId: enrollment.branch.id,
            branchName: enrollment.branch.branchName,
            relation: 'Enrollment',
          });
        }
      }

      preflight = {
        hasActiveAdmission: !!activeAdmission,
        activeAdmissionId: activeAdmission?.id || null,
        hasEnrollment: enrollmentCount > 0,
        conflictCode: activeAdmission ? 'ERR_ADM_ACTIVE_ADMISSION_EXISTS' : null,
      };
    }

    return {
      personFound: true,
      personId: person.id,
      firstNameMasked: person.firstName ? `${person.firstName[0]}****` : null,
      lastNameMasked: person.lastName ? `${person.lastName[0]}****` : null,
      maskedMobile: revealSensitive ? person.mobile : maskPhone(person.mobile),
      maskedEmail: revealSensitive ? person.email : maskEmail(person.email),
      maskedNationalId: revealSensitive ? person.nationalId : maskNationalId(person.nationalId),
      studentProfileId: studentProfile?.id || null,
      studentNumber: studentProfile?.studentNumber || null,
      branchInfo: Array.from(branchInfoMap.values()),
      preflight,
    };
  }

  async searchBranchScopedStudents(
    searchQuery: string | null | undefined,
    allowedBranchIds: string[],
    options?: {
      page?: number;
      limit?: number;
      branchId?: string;
      admissionStatus?: string;
      studentStatus?: string;
      sortBy?: 'studentNumber' | 'fullName' | 'status' | 'joinedAt' | 'branch';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 25;
    const skip = (page - 1) * limit;

    const trimmed = (searchQuery || '').trim();

    const targetBranchIds = options?.branchId && allowedBranchIds.includes(options.branchId)
      ? [options.branchId]
      : allowedBranchIds;

    const whereClause: any = {
      isDeleted: false,
    };

    if (options?.studentStatus) {
      whereClause.status = options.studentStatus;
    }

    if (options?.admissionStatus) {
      whereClause.admissions = {
        some: {
          branchId: { in: targetBranchIds },
          admissionStatus: options.admissionStatus,
          isDeleted: false,
        },
      };
    } else {
      whereClause.OR = [
        {
          branchId: { in: targetBranchIds },
        },
        {
          admissions: {
            some: {
              branchId: { in: targetBranchIds },
              isDeleted: false,
            },
          },
        },
        {
          enrollments: {
            some: {
              branchId: { in: targetBranchIds },
              isDeleted: false,
            },
          },
        },
        {
          person: {
            leads: {
              some: {
                branchId: { in: targetBranchIds },
                isDeleted: false,
              },
            },
          },
        },
      ];
    }

    if (trimmed) {
      whereClause.AND = [
        {
          OR: [
            { studentNumber: { contains: trimmed, mode: 'insensitive' } },
            { person: { firstName: { contains: trimmed, mode: 'insensitive' } } },
            { person: { lastName: { contains: trimmed, mode: 'insensitive' } } },
            { person: { mobile: { contains: trimmed } } },
            { person: { email: { contains: trimmed, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const sortBy = options?.sortBy ?? 'joinedAt';
    const sortOrder = options?.sortOrder ?? 'desc';

    let orderBy: any;
    if (sortBy === 'fullName') {
      orderBy = [{ person: { firstName: sortOrder } }, { person: { lastName: sortOrder } }];
    } else if (sortBy === 'branch') {
      orderBy = [{ branch: { branchName: sortOrder } }, { joinedAt: 'desc' }];
    } else {
      orderBy = [{ [sortBy]: sortOrder }];
    }

    const items = await this.prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        person: true,
        branch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
          },
        },
        admissions: {
          where: { isDeleted: false },
          select: { id: true, admissionNumber: true, admissionStatus: true, branchId: true }
        },
        enrollments: {
          where: { isDeleted: false },
          select: {
            id: true,
            enrollmentStatus: true,
            courseId: true,
            batchId: true,
            branchId: true,
            course: { select: { nameEnglish: true, nameArabic: true } }
          }
        }
      },
      orderBy,
      skip,
      take: limit,
    });

    const total = await this.prisma.studentProfile.count({
      where: whereClause,
    });

    const maskedItems = items.map((profile) => ({
      id: profile.id,
      studentNumber: profile.studentNumber,
      status: profile.status,
      joinedAt: profile.joinedAt,
      person: {
        id: profile.person.id,
        firstName: profile.person.firstName,
        lastName: profile.person.lastName,
        mobile: maskPhone(profile.person.mobile),
        email: maskEmail(profile.person.email),
        nationalId: maskNationalId(profile.person.nationalId),
      },
      branch: profile.branch,
      admissions: profile.admissions,
      enrollments: profile.enrollments,
    }));

    return {
      items: maskedItems,
      total,
    };
  }



  async verifyBranchScope(studentProfileId: string, branchId: string) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        person: true,
        admissions: {
          where: { branchId, isDeleted: false },
        },
        enrollments: {
          where: { branchId, isDeleted: false },
        },
      },
    });

    if (!studentProfile || studentProfile.isDeleted) {
      throw new Error('ERR_STUDENT_PROFILE_NOT_FOUND');
    }

    if (studentProfile.status !== 'Active' || studentProfile.person.isDeleted) {
      throw new Error('ERR_STU_PROFILE_INACTIVE');
    }

    const isHomeBranch = studentProfile.branchId === branchId;
    const hasAdmission = studentProfile.admissions.length > 0;
    const hasEnrollment = studentProfile.enrollments.length > 0;

    const leadCount = await this.prisma.lead.count({
      where: {
        personId: studentProfile.personId,
        branchId,
        isDeleted: false,
      },
    });
    const hasLead = leadCount > 0;

    if (!isHomeBranch && !hasAdmission && !hasEnrollment && !hasLead) {
      throw new Error('ERR_AUTH_BRANCH_DENIED');
    }
  }
}
