# Sitemap Findings

Score: 78/100

## Evidence
- `robots.txt` status: 200
- `sitemap.xml` status: 200
- `sitemap_index.xml` status: 404
- Crawled pages discovered: 20

## Findings

### Medium: Sitemap should be reviewed against final production indexing intent

The sitemap exists and is referenced by robots.txt. Because the audited host is a UAT Vercel domain, public sitemap exposure may be undesirable unless this host is intentionally production.

Recommendation: Publish sitemap only on the final canonical production host. If this remains UAT, apply noindex and remove public sitemap references.

### Low: sitemap_index.xml returns a branded 404 page

This is not a problem if only `sitemap.xml` is intended, but monitoring tools may probe both paths.

Recommendation: No action required unless a sitemap index is needed for future scale.
