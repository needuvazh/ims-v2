# IMS v2 — Shared UI Component Library PRD

## Project
**IMS (Institute Management System)** — modular monolith for Al-Saud Training Institute.
Monorepo: pnpm workspaces + Turborepo.
Stack: Next.js 16 (App Router), TypeScript strict, Tailwind CSS v3, PostgreSQL + Prisma.

## Architecture
```
ims-v2/
  apps/
    admin-portal/        Next.js, port 3000
      app/student/       Student portal routes
      app/trainer/       Trainer portal routes
      app/verify/        Public certificate verification routes
  packages/
    shared-ui/           ← The component library (this work)
    shared-auth/
    shared-kernel/
    identity-access/
    organization/
    audit/
    database/
```

## What's Been Implemented (June 2026)

### Session 1 — Shared UI Component Library
(See full component list in previous section)

### Session 2 — IAM + Organization Management APIs (June 2026)

#### Commits
1. `feat(iam+org)` — HMAC-signed sessions, IAM domain+services, org domain, Prisma repos
2. `feat(admin-portal)` — sign-in/sign-out, dashboard, organization CRUD, identity CRUD

#### Architecture
```
packages/
  shared-auth/      → Session (HMAC-SHA256 signed), permission helpers
  identity-access/  → Domain: User, Role, Permission types + commands
                      App: AuthService (bcrypt login), UserService, RoleService
                      Navigation: resolvePortalNavigation, resolvePortalShellUser
  organization/     → Domain: Institute, Branch, Department, commands
                      App: OrganizationService (full CRUD + pagination)
  database/         → Prisma repositories: User, Role, Organization, Audit
                      Seed script: admin@ims.com / Admin@123456
apps/
  admin-portal/     → Sign-in page, protected layout, dashboard, /organization, /identity
```

#### Key Security Decisions
- **Passwords**: bcryptjs, cost factor 12
- **Sessions**: HMAC-SHA256 signed (not JWT), 8-hour expiry, httpOnly cookie
- **Route protection**: Next.js Edge middleware + server component guard
- **Audit log**: All mutations append an audit entry

#### Env Required
- `DATABASE_URL` — PostgreSQL connection string  
- `SESSION_SECRET` — min 32 bytes base64
- `NEXT_PUBLIC_APP_URL` — app base URL

#### Seed Credentials
- Email: `admin@ims.com`
- Password: `Admin@123456`


### Commit History
1. `chore(shared-ui)` — Added clsx, tailwind-merge, CVA, lucide-react, Radix UI deps; cn() utility; design tokens (light + dark); tailwind configs with `darkMode: 'class'`
2. `chore` — Fixed .pnpm-store gitignore
3. `feat(shared-ui)` — Built complete 26-component library
4. `feat(admin-portal)` — UI preview page at `/ui-preview`
5. `fix(shared-ui)` — TypeScript clean (0 errors)

### Components Built (`packages/shared-ui/src/components/`)
| Component | Client | Notes |
|-----------|--------|-------|
| button.tsx | ✅ | CVA variants: primary/secondary/destructive/outline/ghost/link; sizes sm/md/lg/icon; loading state |
| link-button.tsx | ❌ (server) | Next.js Link wrapper with button styling |
| input.tsx | ✅ | label, helper, error, leftIcon, rightIcon, accessible aria |
| textarea.tsx | ✅ | label, helper, error, resizable option |
| select.tsx | ✅ | native select, label, placeholder, options, error |
| checkbox.tsx | ✅ | label, description, error |
| radio-group.tsx | ✅ | card-style options, accessible, controlled |
| form-field.tsx | ❌ | FormField/FormLabel/FormControl/FormDescription/FormError |
| card.tsx | ❌ | Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter |
| badge.tsx | ❌ | Variants: default/success/warning/error/info/outline/muted |
| table.tsx | ❌ | Full system + TableLoadingState/TableEmptyState/TableErrorState |
| skeleton.tsx | ❌ | Skeleton/CardSkeleton/TableSkeleton/FormSkeleton |
| alert.tsx | ✅ | Variants: info/success/warning/error; dismissible |
| stat-card.tsx | ❌ | title/value/trend/icon/loading |
| empty-state.tsx | ❌ | icon/title/description/action |
| avatar.tsx | ❌ | src/fallback/size variants |
| dialog.tsx | ✅ | Radix Dialog: Dialog/DialogContent/DialogHeader/DialogFooter/etc |
| dropdown-menu.tsx | ✅ | Radix DropdownMenu: full system with separator, label, icons |
| tabs.tsx | ✅ | Radix Tabs: Tabs/TabsList/TabsTrigger/TabsContent |
| tooltip.tsx | ✅ | Radix Tooltip + SimpleTooltip convenience wrapper |
| page-header.tsx | ❌ | title/description/eyebrow/breadcrumbs/actions |
| breadcrumbs.tsx | ❌ | Next.js Link, current page aria |
| pagination.tsx | ❌ | URL-based with Next.js Link; totalCount display |
| search-input.tsx | ✅ | search icon, clear button, controlled |
| filter-bar.tsx | ❌ | layout wrapper for filters/search/actions |
| app-shell.tsx | ✅ | Sidebar + TopBar + mobile overlay; NavItem with icons |

### Design System
- **Primary**: `--ims-brass: #c47d46` (orange-brass)
- **Background**: `--ims-paper: #fbf8f2` (warm off-white)
- **Surface**: `--ims-surface: #fffdf9`
- **Text**: `--ims-ink: #14213d` (dark navy)
- **Dark mode**: Full token set under `.dark` class on `<html>`
- **Typography**: Manrope (body), Cormorant Garamond (display), IBM Plex Mono (mono)
- **Radius**: sm=8px, default=14px, lg=20px, xl=28px, 2xl=32px
- **Semantic colors**: success/warning/error/info with bg/border/text variants

### Usage
```tsx
import { Button, Input, Card, Badge, ... } from '@ims/shared-ui';
```

### Example Page
`apps/admin-portal/app/(protected)/ui-preview/page.tsx` — showcases all 26 components

## Backlog / Next Steps

### P0 — DONE ✅
- [x] Identity & Access Management APIs (login, RBAC, bcrypt, HMAC sessions)
- [x] Organization Management (Institute, Branch, Department)
- [x] Admin portal protected dashboard page
- [x] Public Landing Page redesign matching reference site (https://ims-puce-delta.vercel.app/)
- [x] Login Page redesign with split layout (left brand panel + right form)

### P1 — Next sprint
- [ ] Student enrollment flow (Admission → Enrollment)
- [ ] Course & Batch management pages
- [ ] Attendance tracking UI
- [ ] Student portal landing + dashboard
- [ ] Trainer portal landing + dashboard

### P2 — Future
- [ ] Fee & Finance management UI
- [ ] Certificate generation & public verification portal
- [ ] Corporate training management
- [ ] Trainer management pages
- [ ] Dark mode toggle component
- [ ] Date range picker component
- [ ] Multi-select component
- [ ] Toast/notification system

### Session 4 — Animated Modern Redesign (June 2026)
**Commit**: `feat(landing-v2-animated)` — Bold orange-red + dark hero + scroll animations

**Color system update**: `#EA580C` (bold orange-red) replaces `#c47d46` everywhere; `#0F172A` replaces `#14213d`

**Animation system** (new `globals.css` + 2 client components):
- `AnimateIn` — IntersectionObserver scroll-triggered fade-in (up/left/right/scale directions + delay prop)
- `CountUp` — requestAnimationFrame cubic-ease-out number counter on scroll
- CSS keyframes: `fadeInUp/Down/Left/Right`, `scaleIn`, `float`, `floatSlow/Reverse`, `morphBlob`, `gradientShift`, `shimmerOrange`, `glowBeat`, `pulseRing`, `popIn`, `spinVSlow/Reverse`
- `.section-eyebrow` — orange line prefix utility
- `.text-gradient-orange` — animated gradient text shimmer
- `.hover-lift`, `.glass`, `.glass-dark`, `.dot-grid`, `.noise-overlay`, `.btn-glow`

**Hero**: Dark navy `#0F172A` with animated morph blob orbs + dot grid + spinning ring decorations; gradient text on "Professional"; floating chips; "Live Enrollment Open" badge

**Stats Ribbon**: CountUp number animation, orange gradient serif numbers

**All sections updated**: AnimateIn scroll triggers, new orange accent, dark facilities section, Corporate Solutions as dark rounded card

### Session 3 — Landing Page Redesign (June 2026)
**Commit**: `feat(landing-redesign)` — `apps/admin-portal/app/page.tsx` + `app/(auth)/sign-in/page.tsx`

**Reference site**: `https://ims-puce-delta.vercel.app/` — fully matched

**Landing Page Sections:**
1. Top utility bar — phone, email, IMS Login link, Arabic toggle
2. Sticky Navbar — ASTI-style logo (orange box + serif INSTITUTE text), uppercase tracking nav links, dark pill Admin Login CTA
3. Hero — serif heading "Redefining Professional Growth.", training photo (right), floating stat chips, trust badges (ISO/MoL/PDO)
4. Stats Ribbon — 80+ Programs, 25k+ Students, 150+ Partners, 20+ Years
5. Industry Accreditation — "Success Partners." with partner badge pills
6. Integrated Learning — 2-col (features text left, training image right), quote blockquote
7. Featured Programs — 4-card grid with mode/duration badges + avatar stack
8. Facilities — Dark navy background, 2-col (image left, text right), 12k+/24/7 stats
9. Upcoming Events — list with date boxes + location
10. Portal Access — 4 cards (Admin dark, Student/Trainer/Verify light)
11. Corporate Solutions — CTA block with Partner With Us + Training Catalog buttons
12. Footer — dark navy, 4-col grid with brand, portals, institute, contact

**Login Page (Sign-in):**
- Split layout: Left dark navy brand panel (logo, Empowering Excellence., feature bullets, location) + Right clean form
- Form: AUTHENTICATION PORTAL label, Sign In heading, Username/Email, Password, Keep me signed in, Forgot password, Sign In button, Quick Access demo selector
- Tested: 97% pass rate, all sections verified

**lucide-react**: Added as direct dependency to `apps/admin-portal/package.json`
**next.config.ts**: Added image remotePatterns for unsplash, pexels, pravatar

## Notes
- `.pnpm-store` gitignored after first commit
- TypeScript strict passes 0 errors on all packages
- Admin-portal pre-existing module-not-found errors are not related to our work (deps not locally installed)
