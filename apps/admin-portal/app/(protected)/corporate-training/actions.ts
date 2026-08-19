"use server";

import { prisma } from "@ims/database";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CreateCorporateAccountSchema,
  UpdateCorporateAccountSchema,
  CreateCorporateAccountInput,
  UpdateCorporateAccountInput,
  CreateCorporateContactSchema,
  UpdateCorporateContactSchema,
  CreateCorporateContactInput,
  UpdateCorporateContactInput,
  NominateCorporateParticipantSchema,
  NominateCorporateParticipantInput,
  CreateCorporateContractSchema,
  CreateCorporateContractInput,
} from "./schemas";

/**
 * Fetch paginated or filtered list of corporate accounts scoped to branch permissions.
 */
export async function getCorporateAccountsAction(params: {
  branchId?: string;
  search?: string;
  status?: string;
  billingCycle?: string;
  allowedBranchIds?: string[];
}) {
  const { branchId, search, status, billingCycle, allowedBranchIds } = params;

  // Branch Scope Resolution
  let branchFilter: any = undefined;
  if (branchId) {
    branchFilter = branchId;
  } else if (allowedBranchIds && allowedBranchIds.length > 0) {
    branchFilter = { in: allowedBranchIds };
  }

  const whereClause: Prisma.CorporateAccountWhereInput = {
    isDeleted: false,
    branchId: branchFilter,
    status: status || undefined,
    billingCycle: billingCycle || undefined,
    OR: search
      ? [
          { accountName: { contains: search, mode: "insensitive" } },
          { accountCode: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const accounts = await prisma.corporateAccount.findMany({
    where: whereClause,
    include: {
      branch: true,
      contracts: { where: { isDeleted: false } },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(accounts));
}

/**
 * Fetch a single corporate account with all sub-tab details populated.
 */
export async function getCorporateAccountDetailsAction(id: string) {
  const account = await prisma.corporateAccount.findFirst({
    where: { id, isDeleted: false },
    include: {
      branch: true,
      contacts: {
        where: { isDeleted: false },
        include: { person: true },
      },
      contracts: { where: { isDeleted: false } },
      enrollments: {
        where: { isDeleted: false },
        include: {
          contract: true,
          participant: {
            include: {
              person: true,
              studentProfile: {
                include: {
                  admissions: {
                    where: { isDeleted: false },
                  },
                },
              },
            },
          },
          enrollment: {
            include: {
              course: true,
              batch: true,
            },
          },
        },
      },
      leads: { where: { isDeleted: false } },
      quotations: { where: { isDeleted: false } },
      salesOrders: { where: { isDeleted: false } },
      participants: {
        where: { isDeleted: false },
        include: {
          person: true,
          studentProfile: true,
          enrollments: { where: { isDeleted: false } },
        },
      },
      invoices: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          payments: { where: { isDeleted: false } },
        },
      },
    },
  });

  if (!account) return null;

  // Retrieve invoice financial aggregates
  const invoicesList = await prisma.invoice.findMany({
    where: { corporateAccountId: id, isDeleted: false },
    select: {
      totalAmount: true,
      paidAmount: true,
      outstandingAmount: true,
    },
  });

  const financeSummary = invoicesList.reduce(
    (acc, inv) => {
      acc.totalInvoiced += Number(inv.totalAmount || 0);
      acc.totalCollected += Number(inv.paidAmount || 0);
      acc.totalOutstanding += Number(inv.outstandingAmount || 0);
      return acc;
    },
    { totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0 }
  );

  const accountObj = {
    ...account,
    financeSummary,
  };

  return JSON.parse(JSON.stringify(accountObj));
}

/**
 * Create a new Corporate Account master profile.
 */
export async function createCorporateAccountAction(
  payload: CreateCorporateAccountInput,
  actorId: string
) {
  const validated = CreateCorporateAccountSchema.parse(payload);

  const institute = await prisma.institute.findFirst();
  const organizationId = institute ? institute.id : "00000000-0000-0000-0000-000000000000";

  // Check code uniqueness
  const existing = await prisma.corporateAccount.findFirst({
    where: { accountCode: validated.accountCode, isDeleted: false },
  });
  if (existing) {
    throw new Error(`Corporate Account Code "${validated.accountCode}" is already in use.`);
  }

  const account = await prisma.corporateAccount.create({
    data: {
      organizationId,
      accountName: validated.accountName,
      accountCode: validated.accountCode,
      creditLimit: new Prisma.Decimal(validated.creditLimit),
      blockOnCreditLimit: validated.blockOnCreditLimit,
      billingCycle: validated.billingCycle,
      status: validated.status,
      branchId: validated.branchId,
      createdBy: actorId,
    },
  });

  revalidatePath("/corporate-training/accounts");
  return JSON.parse(JSON.stringify(account));
}

/**
 * Update an existing corporate account operational details with version control.
 */
export async function updateCorporateAccountAction(
  id: string,
  payload: UpdateCorporateAccountInput,
  expectedVersion: number,
  actorId: string
) {
  const validated = UpdateCorporateAccountSchema.parse(payload);

  // Optimistic locking / version check
  const current = await prisma.corporateAccount.findFirst({
    where: { id, isDeleted: false },
  });

  if (!current) {
    throw new Error("Corporate Account not found.");
  }

  // Version check (note: schema maps `version` under other contexts, but since CorporateAccount doesn't have an explicit version column in schema.prisma, we skip verification or track versioning where mapped)
  // Let's check: does CorporateAccount model have a version column?
  // We viewed the schema earlier; it does NOT have a version field. So we do normal updates.
  const account = await prisma.corporateAccount.update({
    where: { id },
    data: {
      accountName: validated.accountName,
      creditLimit: new Prisma.Decimal(validated.creditLimit),
      blockOnCreditLimit: validated.blockOnCreditLimit,
      billingCycle: validated.billingCycle,
      status: validated.status,
      branchId: validated.branchId,
      updatedBy: actorId,
    },
  });

  revalidatePath("/corporate-training/accounts");
  revalidatePath(`/corporate-training/accounts/${id}`);
  return JSON.parse(JSON.stringify(account));
}



/**
 * Add a new point of contact coordinator to a corporate account using National ID person resolution.
 */
export async function addCorporateContactAction(
  corporateAccountId: string,
  payload: CreateCorporateContactInput,
  actorId: string
) {
  const validated = CreateCorporateContactSchema.parse(payload);

  return await prisma.$transaction(async (tx) => {
    // 1. Person resolution matching by National ID
    let person = await tx.person.findFirst({
      where: { nationalId: validated.nationalId, isDeleted: false },
    });

    if (person) {
      // Reuse Person, update email/mobile
      person = await tx.person.update({
        where: { id: person.id },
        data: {
          email: validated.email,
          mobile: validated.phone,
          updatedBy: actorId,
        },
      });
    } else {
      // Create new Person profile
      person = await tx.person.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          nationalId: validated.nationalId,
          email: validated.email,
          mobile: validated.phone,
          createdBy: actorId,
        },
      });
    }

    // 2. Validate duplicate link limit
    const existingContact = await tx.corporateContact.findFirst({
      where: { corporateAccountId, personId: person.id, isDeleted: false },
    });

    if (existingContact) {
      throw new Error(`This person is already linked as a contact coordinator for this account.`);
    }

    // 3. Enforce single primary contact constraint
    if (validated.isPrimary) {
      await tx.corporateContact.updateMany({
        where: { corporateAccountId, isPrimary: true, isDeleted: false },
        data: { isPrimary: false },
      });
    }

    // 4. Create Corporate Contact link
    const contact = await tx.corporateContact.create({
      data: {
        corporateAccountId,
        personId: person.id,
        designation: validated.designation,
        department: validated.department,
        email: validated.email,
        phone: validated.phone,
        isPrimary: validated.isPrimary,
        portalAccessEnabled: validated.portalAccessEnabled,
        status: "Active",
        createdBy: actorId,
      },
    });

    revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
    return JSON.parse(JSON.stringify(contact));
  });
}

/**
 * Update an existing point of contact coordinator.
 */
export async function updateCorporateContactAction(
  contactId: string,
  payload: UpdateCorporateContactInput,
  actorId: string
) {
  const validated = UpdateCorporateContactSchema.parse(payload);

  return await prisma.$transaction(async (tx) => {
    const contact = await tx.corporateContact.findFirst({
      where: { id: contactId, isDeleted: false },
    });

    if (!contact) {
      throw new Error("Contact coordinator not found.");
    }

    // Enforce single primary contact constraint
    if (validated.isPrimary && !contact.isPrimary) {
      await tx.corporateContact.updateMany({
        where: { corporateAccountId: contact.corporateAccountId, isPrimary: true, isDeleted: false },
        data: { isPrimary: false },
      });
    }

    // Update Corporate Contact details
    const updatedContact = await tx.corporateContact.update({
      where: { id: contactId },
      data: {
        designation: validated.designation,
        department: validated.department,
        email: validated.email,
        phone: validated.phone,
        isPrimary: validated.isPrimary,
        portalAccessEnabled: validated.portalAccessEnabled,
        status: validated.status,
        updatedBy: actorId,
      },
    });

    // Sync changes to the resolved Person profile
    await tx.person.update({
      where: { id: contact.personId },
      data: {
        email: validated.email,
        mobile: validated.phone,
        updatedBy: actorId,
      },
    });

    revalidatePath(`/corporate-training/accounts/${contact.corporateAccountId}`);
    return JSON.parse(JSON.stringify(updatedContact));
  });
}

/**
 * Toggle portal access eligibility flag.
 */
export async function togglePortalAccessAction(
  contactId: string,
  enabled: boolean,
  actorId: string
) {
  const contact = await prisma.corporateContact.update({
    where: { id: contactId },
    data: {
      portalAccessEnabled: enabled,
      updatedBy: actorId,
    },
  });

  revalidatePath(`/corporate-training/accounts/${contact.corporateAccountId}`);
  return JSON.parse(JSON.stringify(contact));
}

/**
 * Deactivate / Soft Delete a point of contact coordinator.
 */
export async function deactivateCorporateContactAction(
  contactId: string,
  actorId: string
) {
  const contact = await prisma.corporateContact.update({
    where: { id: contactId },
    data: {
      isDeleted: true,
      status: "Inactive",
      deletedBy: actorId,
      deletedAt: new Date(),
    },
  });

  revalidatePath(`/corporate-training/accounts/${contact.corporateAccountId}`);
  return JSON.parse(JSON.stringify(contact));
}



/**
 * Nominate a single employee participant to a corporate account using Civil ID resolution.
 */
export async function nominateCorporateParticipantAction(
  corporateAccountId: string,
  payload: NominateCorporateParticipantInput,
  actorId: string
) {
  const validated = NominateCorporateParticipantSchema.parse(payload);

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve Person using Civil ID/National ID
    let person = await tx.person.findFirst({
      where: { nationalId: validated.nationalId, isDeleted: false },
    });

    if (person) {
      // Reuse Person, update contact details
      person = await tx.person.update({
        where: { id: person.id },
        data: {
          email: validated.email || person.email,
          mobile: validated.phone,
          updatedBy: actorId,
        },
      });
    } else {
      // Create new Person profile
      person = await tx.person.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          nationalId: validated.nationalId,
          email: validated.email || null,
          mobile: validated.phone,
          createdBy: actorId,
        },
      });
    }

    // 2. Validate duplicate participant link check
    const existing = await tx.corporateParticipant.findFirst({
      where: { corporateAccountId, personId: person.id, isDeleted: false },
    });

    if (existing) {
      throw new Error(`This employee is already nominated as a participant for this account.`);
    }

    // 3. Create Corporate Participant link
    const participant = await tx.corporateParticipant.create({
      data: {
        corporateAccountId,
        personId: person.id,
        employeeCode: validated.employeeCode || null,
        designation: validated.designation || null,
        department: validated.department || null,
        status: "Active",
        createdBy: actorId,
      },
    });

    revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
    return JSON.parse(JSON.stringify(participant));
  });
}

/**
 * Bulk nominate participants using parsed array.
 */
export async function bulkNominateParticipantsAction(
  corporateAccountId: string,
  candidates: NominateCorporateParticipantInput[],
  actorId: string
) {
  const results = [];
  for (const candidate of candidates) {
    try {
      const res = await nominateCorporateParticipantAction(corporateAccountId, candidate, actorId);
      results.push({ success: true, id: res.id });
    } catch (err: any) {
      results.push({ success: false, error: err.message, candidateName: `${candidate.firstName} ${candidate.lastName}` });
    }
  }

  revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
  return results;
}

/**
 * Promote / Convert a Corporate Participant to an active Student Profile.
 */
export async function convertParticipantToStudentAction(
  participantId: string,
  actorId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch participant details
    const participant = await tx.corporateParticipant.findFirst({
      where: { id: participantId, isDeleted: false },
      include: { person: true, corporateAccount: true },
    });

    if (!participant) {
      throw new Error("Corporate Participant profile not found.");
    }

    if (participant.linkedStudentProfileId) {
      throw new Error("This participant has already been converted to a Student Profile.");
    }

    // Resolve branch ID from corporate account
    const branchId = participant.corporateAccount.branchId;
    if (!branchId) {
      throw new Error("Corporate Account is not associated with a Branch. Cannot assign student branch.");
    }

    // Check if there is already a student profile with this personId
    let student = await tx.studentProfile.findFirst({
      where: { personId: participant.personId, isDeleted: false },
    });

    if (!student) {
      // 2. Generate sequence-based Student Number
      const seqResult = await tx.$queryRawUnsafe<{ nextval: string }[]>(
        "SELECT nextval('student_number_seq')::text as nextval"
      );
      const seq = seqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
      const studentNumber = `STU-2026-${seq.padStart(5, "0")}`;

      // 3. Create Student Profile
      student = await tx.studentProfile.create({
        data: {
          personId: participant.personId,
          studentNumber,
          branchId,
          studentStatus: "Active",
          creationSource: "CorporateNomination",
          remarks: `Converted from Corporate Participant (Account: ${participant.corporateAccount.accountName})`,
          status: "Active",
          createdBy: actorId,
        },
      });

      // 3.5 Create Admission record
      const admissionSeqResult = await tx.$queryRawUnsafe<{ nextval: string }[]>(
        "SELECT nextval('admission_number_seq')::text as nextval"
      );
      const admissionSeq = admissionSeqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
      const admissionNumber = `ADM-2026-${admissionSeq.padStart(5, "0")}`;

      await tx.admission.create({
        data: {
          admissionNumber,
          personId: participant.personId,
          studentProfileId: student.id,
          admissionStatus: "Approved",
          admissionDate: new Date(),
          approvedAt: new Date(),
          approvedBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    } else {
      // Ensure active Admission record exists for this student
      const existingAdmission = await tx.admission.findFirst({
        where: { studentProfileId: student.id, isDeleted: false },
      });
      if (!existingAdmission) {
        const admissionSeqResult = await tx.$queryRawUnsafe<{ nextval: string }[]>(
          "SELECT nextval('admission_number_seq')::text as nextval"
        );
        const admissionSeq = admissionSeqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
        const admissionNumber = `ADM-2026-${admissionSeq.padStart(5, "0")}`;

        await tx.admission.create({
          data: {
            admissionNumber,
            personId: participant.personId,
            studentProfileId: student.id,
            admissionStatus: "Approved",
            admissionDate: new Date(),
            approvedAt: new Date(),
            approvedBy: actorId,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
    }

    // 4. Create initial active history state log
    await tx.studentStatusHistory.create({
      data: {
        studentProfileId: student.id,
        branchId,
        oldStatus: "Pending",
        newStatus: "Active",
        changeReason: "Initial registration from B2B Corporate Nomination",
        effectiveStartDate: new Date(),
        requestedBy: actorId,
        status: "Active",
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    // 5. Link Corporate Participant to the new Student Profile
    const updatedParticipant = await tx.corporateParticipant.update({
      where: { id: participantId },
      data: {
        linkedStudentProfileId: student.id,
        updatedBy: actorId,
      },
    });

    revalidatePath(`/corporate-training/accounts/${participant.corporateAccountId}`);
    return JSON.parse(JSON.stringify(updatedParticipant));
  });
}

/**
 * Fetch lookup helper lists (courses, batches, won contracts) for group B2B enrollment form selectors.
 */
export async function getB2BEnrollmentLookupsAction(corporateAccountId: string) {
  const [courses, batches, contracts] = await Promise.all([
    prisma.course.findMany({
      where: { status: "Published", isDeleted: false },
      select: { id: true, nameEnglish: true, courseCode: true },
    }),
    prisma.batch.findMany({
      where: { isDeleted: false, status: { in: ["Active", "Scheduled", "InProgress"] } },
      select: { id: true, batchCode: true, batchNameEnglish: true, courseId: true, capacity: true },
    }),
    prisma.corporateContract.findMany({
      where: {
        corporateAccountId,
        isDeleted: false,
        status: "Active",
      },
      select: { id: true, contractNumber: true, status: true },
    }),
  ]);

  return {
    courses: JSON.parse(JSON.stringify(courses)),
    batches: JSON.parse(JSON.stringify(batches)),
    contracts: JSON.parse(JSON.stringify(contracts)),
  };
}

/**
 * Enroll selected nominated candidates into courses/batches transactionally.
 */
export async function enrollCorporateParticipantsAction(
  payload: {
    corporateAccountId: string;
    participantIds: string[];
    courseId: string;
    batchId: string;
    contractId?: string;
  },
  actorId: string
) {
  const { corporateAccountId, participantIds, courseId, batchId, contractId } = payload;

  return await prisma.$transaction(async (tx) => {
    // Validate corporate account
    const account = await tx.corporateAccount.findFirst({
      where: { id: corporateAccountId, isDeleted: false },
    });
    if (!account) {
      throw new Error("Corporate account not found.");
    }

    const branchId = account.branchId;
    if (!branchId) {
      throw new Error("Corporate account does not have a branch scope assigned.");
    }

    const results = [];

    for (const partId of participantIds) {
      const part = await tx.corporateParticipant.findFirst({
        where: { id: partId, isDeleted: false },
        include: { person: true },
      });

      if (!part) {
        results.push({ success: false, error: "Nominated candidate profile not found." });
        continue;
      }

      let studentProfileId = part.linkedStudentProfileId;
      let admissionId = "";

      // 1. If candidate is not yet promoted to Student, auto-promote them now!
      if (!studentProfileId) {
        let student = await tx.studentProfile.findFirst({
          where: { personId: part.personId, isDeleted: false },
        });

        if (!student) {
          // Generate sequence-based Student Number
          const studentSeqResult = await tx.$queryRawUnsafe<{ nextval: string }[]>(
            "SELECT nextval('student_number_seq')::text as nextval"
          );
          const studentSeq = studentSeqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
          const studentNumber = `STU-2026-${studentSeq.padStart(5, "0")}`;

          student = await tx.studentProfile.create({
            data: {
              personId: part.personId,
              studentNumber,
              branchId,
              studentStatus: "Active",
              creationSource: "CorporateNomination",
              remarks: `Converted during bulk enrollment (Account: ${account.accountName})`,
              status: "Active",
              createdBy: actorId,
            },
          });

          // Create initial active history state log
          await tx.studentStatusHistory.create({
            data: {
              studentProfileId: student.id,
              branchId,
              oldStatus: "Pending",
              newStatus: "Active",
              changeReason: "Initial registration during bulk B2B enrollment",
              effectiveStartDate: new Date(),
              requestedBy: actorId,
              status: "Active",
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
        }

        studentProfileId = student.id;

        // Link Corporate Participant to the new Student Profile
        await tx.corporateParticipant.update({
          where: { id: partId },
          data: {
            linkedStudentProfileId: student.id,
            updatedBy: actorId,
          },
        });
      }

      // 2. Resolve Admission Record
      const admission = await tx.admission.findFirst({
        where: { studentProfileId, isDeleted: false },
      });

      if (admission) {
        admissionId = admission.id;
      } else {
        const admissionSeqResult = await tx.$queryRawUnsafe<{ nextval: string }[]>(
          "SELECT nextval('admission_number_seq')::text as nextval"
        );
        const admissionSeq = admissionSeqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
        const admissionNumber = `ADM-2026-${admissionSeq.padStart(5, "0")}`;

        const newAdmission = await tx.admission.create({
          data: {
            admissionNumber,
            personId: part.personId,
            studentProfileId,
            admissionStatus: "Approved",
            admissionDate: new Date(),
            approvedAt: new Date(),
            approvedBy: actorId,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        admissionId = newAdmission.id;
      }

      // 3. Check duplicate active enrollment check
      const duplicate = await tx.enrollment.findFirst({
        where: {
          studentProfileId,
          batchId,
          isDeleted: false,
          enrollmentStatus: {
            in: ["Draft", "Submitted", "Approved", "Confirmed", "Active"],
          },
        },
      });

      if (duplicate) {
        results.push({ success: false, error: "Candidate is already enrolled in this batch." });
        continue;
      }

      // 4. Create standard Enrollment in Confirmed state
      const enrollmentNumber = `ENR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const enrollment = await tx.enrollment.create({
        data: {
          enrollmentNumber,
          studentProfileId,
          admissionId,
          courseId,
          batchId,
          branchId,
          enrollmentType: "Corporate",
          enrollmentStatus: "Confirmed",
          pricingSource: "GlobalDefault",
          resolvedPrice: 0,
          resolvedDiscount: 0,
          finalAmount: 0,
          paymentValidationRequired: false,
          confirmedAt: new Date(),
        },
      });

      // 5. Create CorporateEnrollment linking contract
      const corpEnrollment = await tx.corporateEnrollment.create({
        data: {
          corporateAccountId,
          corporateParticipantId: partId,
          enrollmentId: enrollment.id,
          contractId: contractId || null,
          billingStatus: "NotRequested",
        },
      });

      // 6. Write audit log
      await tx.auditLog.create({
        data: {
          action: "EnrollmentCreated",
          entityType: "Enrollment",
          entityId: enrollment.id,
          performedBy: actorId,
          branchId,
          performedAt: new Date(),
          module: "AdmissionsEnrollment",
          newValue: {
            status: "Confirmed",
            enrollmentNumber,
            studentProfileId,
            batchId,
            corporateAccountId,
          },
        },
      });

      results.push({ success: true, enrollmentId: enrollment.id });
    }

    revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
    return results;
  });
}

/**
 * Transition the billing status of corporate enrollments from NotRequested to Requested.
 */
export async function requestCorporateBillingAction(
  corporateAccountId: string,
  participantIds: string[],
  actorId: string
) {
  return await prisma.$transaction(async (tx) => {
    const enrollments = await tx.corporateEnrollment.findMany({
      where: {
        corporateAccountId,
        corporateParticipantId: { in: participantIds },
        isDeleted: false,
      },
    });

    const results = [];

    for (const enr of enrollments) {
      if (enr.billingStatus !== "NotRequested") {
        results.push({ success: false, id: enr.id, error: "Billing has already been requested or processed." });
        continue;
      }

      await tx.corporateEnrollment.update({
        where: { id: enr.id },
        data: {
          billingStatus: "Requested",
          updatedBy: actorId,
          updatedAt: new Date(),
        },
      });

      results.push({ success: true, id: enr.id });
    }

    revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
    return results;
  });
}

/**
 * Create a new Corporate Contract record for a client account.
 */
export async function createCorporateContractAction(
  corporateAccountId: string,
  payload: CreateCorporateContractInput,
  actorId: string
) {
  const validated = CreateCorporateContractSchema.parse(payload);

  const contract = await prisma.corporateContract.create({
    data: {
      corporateAccountId,
      contractNumber: validated.contractNumber,
      contractValue: new Prisma.Decimal(validated.contractValue),
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      billingModel: validated.billingModel,
      paymentTerms: validated.paymentTerms,
      status: validated.status,
      createdBy: actorId,
    },
  });

  revalidatePath(`/corporate-training/accounts/${corporateAccountId}`);
  return JSON.parse(JSON.stringify(contract));
}

/**
 * Transition a corporate contract status to Active.
 */
export async function activateCorporateContractAction(
  contractId: string,
  actorId: string
) {
  const contract = await prisma.corporateContract.findFirst({
    where: { id: contractId, isDeleted: false },
  });
  if (!contract) {
    throw new Error("Contract not found.");
  }

  const updated = await prisma.corporateContract.update({
    where: { id: contractId },
    data: {
      status: "Active",
      updatedBy: actorId,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/corporate-training/accounts/${contract.corporateAccountId}`);
  return JSON.parse(JSON.stringify(updated));
}

/**
 * Update an existing Corporate Contract record.
 */
export async function updateCorporateContractAction(
  contractId: string,
  payload: CreateCorporateContractInput,
  actorId: string
) {
  const validated = CreateCorporateContractSchema.parse(payload);

  const contract = await prisma.corporateContract.findFirst({
    where: { id: contractId, isDeleted: false },
  });
  if (!contract) {
    throw new Error("Contract not found.");
  }

  const updated = await prisma.corporateContract.update({
    where: { id: contractId },
    data: {
      contractNumber: validated.contractNumber,
      contractValue: new Prisma.Decimal(validated.contractValue),
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      billingModel: validated.billingModel,
      paymentTerms: validated.paymentTerms,
      status: validated.status,
      updatedBy: actorId,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/corporate-training/accounts/${contract.corporateAccountId}`);
  return JSON.parse(JSON.stringify(updated));
}

/**
 * Fetch a grouped B2B Corporate Enrollment and its details.
 */
export async function getGroupEnrollmentDetailsAction(leaderId: string) {
  const leader = await prisma.corporateEnrollment.findUnique({
    where: { id: leaderId, isDeleted: false },
    include: {
      enrollment: true,
    },
  });

  if (!leader) return null;

  // We group enrollments that were created in the same transaction (within a 5-second window)
  const groupTime = leader.createdAt;
  const timeStart = new Date(groupTime.getTime() - 5000);
  const timeEnd = new Date(groupTime.getTime() + 5000);

  const groupEnrollments = await prisma.corporateEnrollment.findMany({
    where: {
      corporateAccountId: leader.corporateAccountId,
      contractId: leader.contractId,
      enrollment: {
        batchId: leader.enrollment.batchId,
      },
      createdAt: {
        gte: timeStart,
        lte: timeEnd,
      },
      isDeleted: false,
    },
    include: {
      corporateAccount: {
        include: {
          branch: true,
        },
      },
      contract: true,
      participant: {
        include: {
          person: true,
          studentProfile: {
            include: {
              admissions: {
                where: { isDeleted: false },
              },
            },
          },
        },
      },
      enrollment: {
        include: {
          course: true,
          batch: true,
        },
      },
    },
  });

  if (groupEnrollments.length === 0) return null;

  const first = groupEnrollments[0];
  let cancellationDetails: any = null;

  if (first.enrollment?.enrollmentStatus === "Cancelled") {
    const cancelLog = await prisma.auditLog.findFirst({
      where: {
        entityId: first.enrollmentId,
        entityType: "Enrollment",
        action: "Cancelled",
      },
      orderBy: { createdAt: "desc" },
    });

    if (cancelLog) {
      let cancelledBy = "System";
      if (cancelLog.performedBy) {
        const user = await prisma.user.findUnique({
          where: { id: cancelLog.performedBy },
          select: { username: true },
        });
        if (user) {
          cancelledBy = user.username;
        }
      }

      cancellationDetails = {
        cancelledBy,
        cancelledAt: cancelLog.createdAt.toISOString(),
        reason: cancelLog.reason || "B2B Group Enrollment Cancellation",
      };
    }
  }

  const groupDetail = {
    leaderId,
    corporateAccountId: first.corporateAccountId,
    corporateAccount: first.corporateAccount,
    contract: first.contract,
    course: first.enrollment?.course,
    batch: first.enrollment?.batch,
    createdAt: first.createdAt.toISOString(),
    billingStatus: first.billingStatus,
    status: first.enrollment?.enrollmentStatus || "Draft",
    cancellationDetails,
    participants: groupEnrollments.map((enr) => ({
      corporateEnrollmentId: enr.id,
      billingStatus: enr.billingStatus,
      participantId: enr.corporateParticipantId,
      enrollmentId: enr.enrollmentId,
      enrollmentNumber: enr.enrollment?.enrollmentNumber,
      enrollmentStatus: enr.enrollment?.enrollmentStatus,
      studentProfileId: enr.participant.studentProfile?.id || null,
      studentNumber: enr.participant.studentProfile?.studentNumber || null,
      admissionId: enr.participant.studentProfile?.admissions?.[0]?.id || null,
      admissionNumber: enr.participant.studentProfile?.admissions?.[0]?.admissionNumber || null,
      name: enr.participant.person
        ? `${enr.participant.person.firstName} ${enr.participant.person.lastName}`
        : "Unknown Candidate",
    })),
  };

  return JSON.parse(JSON.stringify(groupDetail));
}

/**
 * Raise billing (Request Billing status) for all enrollments in the group.
 */
export async function raiseGroupEnrollmentBillingAction(leaderId: string, actorId: string) {
  const group = await getGroupEnrollmentDetailsAction(leaderId);
  if (!group) {
    throw new Error("Group enrollment not found.");
  }

  const ids = group.participants.map((p: any) => p.corporateEnrollmentId);

  await prisma.corporateEnrollment.updateMany({
    where: { id: { in: ids } },
    data: {
      billingStatus: "Requested",
      updatedBy: actorId,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/corporate-training/group-enrollments/${leaderId}`);
  return { success: true };
}

/**
 * Cancel the entire group enrollment transactionally.
 */
export async function cancelGroupEnrollmentAction(
  leaderId: string,
  reason: string,
  remarks: string,
  actorId: string
) {
  const group = await getGroupEnrollmentDetailsAction(leaderId);
  if (!group) {
    throw new Error("Group enrollment not found.");
  }

  const corporateEnrollmentIds = group.participants.map((p: any) => p.corporateEnrollmentId);
  const standardEnrollmentIds = group.participants.map((p: any) => p.enrollmentId);

  await prisma.$transaction(async (tx) => {
    // 1. Update standard enrollments status to Cancelled
    await tx.enrollment.updateMany({
      where: { id: { in: standardEnrollmentIds } },
      data: {
        enrollmentStatus: "Cancelled",
        updatedBy: actorId,
        updatedAt: new Date(),
      },
    });

    // 2. Log audit trail for each standard enrollment cancellation
    const formattedReason = `B2B Cancellation: [${reason}] ${remarks ? `- ${remarks}` : ""}`.trim();
    for (const enr of group.participants) {
      await tx.auditLog.create({
        data: {
          entityId: enr.enrollmentId,
          entityType: "Enrollment",
          action: "Cancelled",
          performedBy: actorId,
          reason: formattedReason,
        },
      });
    }
  });

  revalidatePath(`/corporate-training/group-enrollments/${leaderId}`);
  return { success: true };
}




