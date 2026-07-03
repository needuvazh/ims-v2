import { PrismaClient } from '@prisma/client';

type LegacyBranchSettingsRow = {
  id: string;
  branchId: string;
  workingCalendar: string | null;
  branch: {
    id: string;
    instituteId: string;
    branchName: string;
  };
};

type BusinessCalendarRow = {
  id: string;
  instituteId: string;
  code: string;
  name: string;
  year: number;
};

type TranslationMatch = {
  branchSettingsId: string;
  branchId: string;
  instituteId: string;
  branchName: string;
  workingCalendar: string;
  businessCalendarId: string;
  businessCalendarCode: string;
  reason: 'exact-code' | 'exact-year';
};

type MigrationReport = {
  translated: TranslationMatch[];
  unresolved: Array<{
    branchSettingsId: string;
    branchId: string;
    instituteId: string;
    branchName: string;
    workingCalendar: string;
    reason: string;
  }>;
};

function normalizeValue(value: string) {
  return value.trim();
}

function translateWorkingCalendar(
  settings: LegacyBranchSettingsRow,
  calendars: BusinessCalendarRow[],
): TranslationMatch | null {
  const value = normalizeValue(settings.workingCalendar ?? '');
  if (!value) return null;

  const sameInstitute = calendars.filter((calendar) => calendar.instituteId === settings.branch.instituteId);
  const exactCode = sameInstitute.find((calendar) => calendar.code.toLowerCase() === value.toLowerCase());
  if (exactCode) {
    return {
      branchSettingsId: settings.id,
      branchId: settings.branchId,
      instituteId: settings.branch.instituteId,
      branchName: settings.branch.branchName,
      workingCalendar: value,
      businessCalendarId: exactCode.id,
      businessCalendarCode: exactCode.code,
      reason: 'exact-code',
    };
  }

  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    const sameYear = sameInstitute.filter((calendar) => calendar.year === year);
    if (sameYear.length === 1) {
      return {
        branchSettingsId: settings.id,
        branchId: settings.branchId,
        instituteId: settings.branch.instituteId,
        branchName: settings.branch.branchName,
        workingCalendar: value,
        businessCalendarId: sameYear[0].id,
        businessCalendarCode: sameYear[0].code,
        reason: 'exact-year',
      };
    }
  }

  return null;
}

export async function buildLegacyWorkingCalendarMigrationReport(prisma = new PrismaClient()): Promise<MigrationReport> {
  const branchSettings = await prisma.branchSettings.findMany({
    where: {
      isDeleted: false,
      workingCalendar: { not: null },
    },
    include: {
      branch: {
        select: { id: true, instituteId: true, branchName: true },
      },
    },
  });

  if (branchSettings.length === 0) {
    return { translated: [], unresolved: [] };
  }

  const instituteIds = Array.from(new Set(branchSettings.map((row) => row.branch.instituteId)));
  const calendars = await prisma.businessCalendar.findMany({
    where: {
      isDeleted: false,
      instituteId: { in: instituteIds },
    },
    select: { id: true, instituteId: true, code: true, name: true, year: true },
  });

  const translated: TranslationMatch[] = [];
  const unresolved: MigrationReport['unresolved'] = [];

  for (const settings of branchSettings as LegacyBranchSettingsRow[]) {
    const match = translateWorkingCalendar(settings, calendars as BusinessCalendarRow[]);
    if (match) {
      translated.push(match);
    } else {
      unresolved.push({
        branchSettingsId: settings.id,
        branchId: settings.branchId,
        instituteId: settings.branch.instituteId,
        branchName: settings.branch.branchName,
        workingCalendar: normalizeValue(settings.workingCalendar ?? ''),
        reason: 'No exact code or single-year match in the institute calendar set.',
      });
    }
  }

  return { translated, unresolved };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const report = await buildLegacyWorkingCalendarMigrationReport(prisma);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
