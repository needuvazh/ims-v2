# Images Findings

Score: 86/100

## What Works
- Public marketing and course pages had image alt text present in the crawl
- Images are emitted through Next.js optimized image routes
- No visual text-overflow or overlap was detected in automated visual analysis

## Findings

### Low: Auth utility pages have missing image alt text

5 pages had missing alt text, concentrated on /sign-in, /forgot-password, /activate-account, /mandatory-password-change, and likely related auth templates.

Recommendation: Add decorative empty alt attributes for decorative images or descriptive alt text for meaningful images in auth templates.

### Info: Image asset dimensions/weights need Lighthouse verification

The crawl confirmed optimized image routes but did not include byte-level image audit by asset. PSI was rate-limited.

Recommendation: Run Lighthouse image diagnostics once PSI/local Lighthouse is available and check modern formats, right-sized images, and preload only for the LCP image.
