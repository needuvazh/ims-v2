import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamReportsPage from './page';

describe('IAM reports page', () => {
  it('links to the export jobs surface', () => {
    const html = renderToStaticMarkup(IamReportsPage());
    expect(html).toContain('/iam/reports/export-jobs');
  });
});
