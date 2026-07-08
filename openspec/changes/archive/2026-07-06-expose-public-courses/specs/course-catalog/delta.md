## ADDED Requirements

### Requirement: Course Public Exposition (FR-CRS-004)

The system SHALL support marking a course as publicly exposed and collecting optional public metadata, visibility rules, and SEO configurations.

#### Scenario: Successfully create course with public metadata and flags

- **WHEN** a course is created or updated with `isPubliclyExposed` set to `true`, a valid `bannerImage` URL/path, custom SEO meta tags (`metaTitle`, `metaDescription`, `metaKeywords`), a `syllabusOutline`, and visibility toggles (`showPricingPublicly`, `hasPracticalInstruction`, `practicalTestingDescription`)
- **THEN** the system SHALL store these fields correctly in the database and audit the action.

---

### Requirement: Public Course Query Filtering (FR-CRS-005)

The public (non-authenticated) course query APIs SHALL return only courses that are published and marked as publicly exposed, hiding pricing information if configured.

#### Scenario: Listing only publicly exposed courses

- **WHEN** a request is made to the public course list API
- **THEN** the system SHALL return only courses where `status = 'Published'`, `isDeleted = false`, and `isPubliclyExposed = true`.

#### Scenario: Hiding pricing details on public queries

- **WHEN** a public course list or detail request is processed for a course where `showPricingPublicly = false`
- **THEN** the system SHALL return `null` for base price, tax percentage, and currency fields in the response DTO.

#### Scenario: Resolving category hierarchy dynamically

- **WHEN** a public course detail request is processed
- **THEN** the system SHALL traverse the database to fetch the full path of parent categories (category hierarchy) up to the root category and include it in the response DTO.
