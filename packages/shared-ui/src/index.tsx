// ─── Utilities ─────────────────────────────────────────────────────────────
export * from './utils/cn';
export * from './utils/native-validation';

// ─── Form Components (client) ───────────────────────────────────────────────
export * from './components/button';
export * from './components/link-button';
export * from './components/input';
export * from './components/textarea';
export * from './components/select';
export * from './components/checkbox';
export * from './components/radio-group';
export * from './components/form-field';
export * from './components/search-input';
export * from './components/animate-in';
export * from './components/count-up';

// ─── Layout & Display (server) ──────────────────────────────────────────────
export * from './components/card';
export * from './components/badge';
export * from './components/table';
export * from './components/skeleton';
export * from './components/empty-state';
export * from './components/stat-card';
export * from './components/avatar';
export * from './components/page-header';
export * from './components/breadcrumbs';
export * from './components/pagination';
export * from './components/filter-bar';

// ─── Feedback ───────────────────────────────────────────────────────────────
export * from './components/alert';

// ─── Overlays (client) ──────────────────────────────────────────────────────
export * from './components/dialog';
export * from './components/dropdown-menu';
export * from './components/tabs';
export * from './components/tooltip';

// ─── Shell & Navigation (client) ────────────────────────────────────────────
export * from './components/app-shell';
// Export only SidebarNav and StatusRail from navigation (PageHeader is in page-header.tsx)
export { SidebarNav, StatusRail } from './components/navigation';

// ─── Legacy compat ──────────────────────────────────────────────────────────
export { classNames } from './utils/classnames';
