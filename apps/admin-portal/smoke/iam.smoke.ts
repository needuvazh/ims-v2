const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const email = process.env.SMOKE_IAM_EMAIL ?? 'smoke.iam@ims.com';
const password = process.env.SMOKE_IAM_PASSWORD ?? 'Password@123';

type JsonResponse<T> = {
  data?: T;
};

type SessionShape = {
  user?: { id?: string };
  session?: { activeBranchId?: string | null; permissions?: string[] };
};

type BranchItem = {
  branchId: string;
  branch?: { id?: string };
};

type AuditItem = {
  action?: string;
  entityType?: string;
};

function toCookieHeader(headers: Headers): string {
  const responseHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = typeof responseHeaders.getSetCookie === 'function'
    ? responseHeaders.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : []);

  return cookies
    .map((cookie) => cookie.split(';', 1)[0])
    .filter((cookie) => cookie.length > 0)
    .join('; ');
}

function mergeCookieHeaders(baseHeader: string, overrideHeader: string): string {
  const merged = new Map<string, string>();

  for (const header of [baseHeader, overrideHeader]) {
    for (const cookie of header.split(';').map((part) => part.trim()).filter(Boolean)) {
      const eqIndex = cookie.indexOf('=');
      if (eqIndex > 0) {
        merged.set(cookie.slice(0, eqIndex), cookie.slice(eqIndex + 1));
      }
    }
  }

  return Array.from(merged.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function assertOk(message: string, condition: boolean): Promise<void> {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const invalidLoginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPassword@123' }),
  });
  await assertOk('invalid login should fail with 401', invalidLoginResponse.status === 401);

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await assertOk('login should succeed', loginResponse.ok);
  const cookieHeader = toCookieHeader(loginResponse.headers);
  await assertOk('login should return auth cookies', cookieHeader.length > 0);

  const loginBody = await loginResponse.json() as JsonResponse<SessionShape>;

  await assertOk('login should return a user id', Boolean(loginBody.data?.user?.id));
  const userId = loginBody.data?.user?.id as string;
  const initialBranchId = loginBody.data?.session?.activeBranchId ?? null;
  await assertOk('login should return permissions', Array.isArray(loginBody.data?.session?.permissions));

  const usersResponse = await fetch(`${baseUrl}/api/v1/users`, {
    headers: {
      cookie: cookieHeader,
    },
  });
  await assertOk('users list should succeed', usersResponse.ok);

  const rolesResponse = await fetch(`${baseUrl}/api/v1/roles`, {
    headers: {
      cookie: cookieHeader,
    },
  });
  await assertOk('roles list should succeed', rolesResponse.ok);

  const permissionMatrixResponse = await fetch(`${baseUrl}/api/v1/reports/iam/permission-matrix`, {
    headers: {
      cookie: cookieHeader,
    },
  });
  await assertOk('permission matrix should succeed', permissionMatrixResponse.ok);
  const permissionMatrixBody = await permissionMatrixResponse.json() as JsonResponse<{ items?: unknown[]; total?: number }>;
  await assertOk('permission matrix should return items', Array.isArray(permissionMatrixBody.data?.items));

  const branchesResponse = await fetch(`${baseUrl}/api/v1/users/${userId}/branches`, {
    headers: {
      cookie: cookieHeader,
    },
  });
  await assertOk('branch access list should succeed', branchesResponse.ok);
  const branchesBody = await branchesResponse.json() as JsonResponse<{ items?: BranchItem[] }>;
  const targetBranchId = branchesBody.data?.items?.find((branch) => branch.branchId !== initialBranchId)?.branchId ?? null;
  await assertOk('branch switch target should exist', Boolean(targetBranchId));

  const switchBranchResponse = await fetch(`${baseUrl}/api/v1/auth/switch-branch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify({ branchId: targetBranchId }),
  });
  await assertOk('branch switch should succeed', switchBranchResponse.ok);
  const switchedCookieHeader = toCookieHeader(switchBranchResponse.headers);
  await assertOk('branch switch should return auth cookies', switchedCookieHeader.length > 0);
  const authenticatedCookieHeader = mergeCookieHeaders(cookieHeader, switchedCookieHeader);
  const switchBranchBody = await switchBranchResponse.json() as JsonResponse<SessionShape>;
  await assertOk('branch switch should update active branch', switchBranchBody.data?.session?.activeBranchId === targetBranchId);

  const defaultBranchResponse = await fetch(`${baseUrl}/api/v1/users/${userId}/branches/default`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: authenticatedCookieHeader,
    },
    body: JSON.stringify({ branchId: targetBranchId }),
  });
  await assertOk('default branch update should succeed', defaultBranchResponse.ok);

  const auditResponse = await fetch(`${baseUrl}/api/v1/audit?entityType=UserBranchAccess&action=iam.user.default-branch-changed&pageSize=5`, {
    headers: {
      cookie: authenticatedCookieHeader,
    },
  });
  await assertOk('audit trail should succeed', auditResponse.ok);
  const auditBody = await auditResponse.json() as JsonResponse<{ items?: AuditItem[] }>;
  await assertOk('audit trail should include default branch change', Boolean(auditBody.data?.items?.some((item) => item.action === 'iam.user.default-branch-changed' && item.entityType === 'UserBranchAccess')));

  const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: authenticatedCookieHeader,
    },
  });
  await assertOk('logout should succeed', logoutResponse.status === 204);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
