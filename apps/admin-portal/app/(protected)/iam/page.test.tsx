import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamHomePage from './page';

describe('IAM home page', () => {
  it('exposes the IAM console sections', () => {
    const html = renderToStaticMarkup(IamHomePage());
    expect(html).toContain('/iam/users');
    expect(html).toContain('/iam/login-history');
    expect(html).toContain('/iam/reports/export-jobs');
  });
});
