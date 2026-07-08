const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const email = process.env.SMOKE_IAM_EMAIL ?? 'smoke.iam@ims.com';
const password = process.env.SMOKE_IAM_PASSWORD ?? 'Password@123';

type JsonResponse<T> = {
  data?: T;
  success?: boolean;
};

function toCookieHeader(headers: Headers): string {
  const responseHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies =
    typeof responseHeaders.getSetCookie === 'function'
      ? responseHeaders.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie') as string]
        : [];

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
  // 1. Login
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  await assertOk('login should succeed', loginResponse.ok);
  const cookieHeader = toCookieHeader(loginResponse.headers);
  await assertOk('login should return auth cookies', cookieHeader.length > 0);

  // 2. Fetch documents list
  const docListResponse = await fetch(`${baseUrl}/api/v1/documents`, {
    headers: {
      cookie: cookieHeader,
    },
  });
  await assertOk('documents list should succeed', docListResponse.ok);
  const docListBody = (await docListResponse.json()) as JsonResponse<any>;
  await assertOk(
    'document request is successful',
    docListBody.success === true,
  );

  // 3. Try invalid ID detail lookup (should fail with 404 DOC_NOT_FOUND)
  const invalidId = '00000000-0000-0000-0000-000000000000';
  const detailResponse = await fetch(
    `${baseUrl}/api/v1/documents/${invalidId}`,
    {
      headers: {
        cookie: cookieHeader,
      },
    },
  );
  await assertOk(
    'accessing invalid document id should fail with 404',
    detailResponse.status === 404,
  );

  // 4. Try verification decision for invalid ID (should fail with 404 DOC_NOT_FOUND)
  const verifyResponse = await fetch(
    `${baseUrl}/api/v1/documents/${invalidId}/verify`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({ outcome: 'Verified' }),
    },
  );
  await assertOk(
    'verifying invalid document id should fail with 404',
    verifyResponse.status === 404,
  );

  // 5. Try deletion for invalid ID (should fail with 404 DOC_NOT_FOUND)
  const deleteResponse = await fetch(
    `${baseUrl}/api/v1/documents/${invalidId}`,
    {
      method: 'DELETE',
      headers: {
        cookie: cookieHeader,
      },
    },
  );
  await assertOk(
    'deleting invalid document id should fail with 404',
    deleteResponse.status === 404,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
