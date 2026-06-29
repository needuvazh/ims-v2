const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const email = process.env.SMOKE_IAM_EMAIL ?? 'smoke.iam@ims.com';
const password = process.env.SMOKE_IAM_PASSWORD ?? 'Password@123';

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

async function assertOk(message: string, condition: boolean): Promise<void> {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await assertOk('login should succeed', loginResponse.ok);
  const cookieHeader = toCookieHeader(loginResponse.headers);
  await assertOk('login should return auth cookies', cookieHeader.length > 0);

  const loginBody = await loginResponse.json() as {
    data?: {
      user?: { id?: string };
      session?: { activeBranchId?: string | null };
    };
  };

  await assertOk('login should return a user id', Boolean(loginBody.data?.user?.id));

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

  const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
    },
  });
  await assertOk('logout should succeed', logoutResponse.status === 204);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
