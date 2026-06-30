'use client';

import { useTransition, useState, useMemo } from 'react';
import {
  Badge,
  SearchInput,
  Select,
} from '@ims/shared-ui';
import { toggleRolePermissionAction, toggleRolePermissionsBulkAction } from '../../actions';
import { 
  Check, 
  ShieldAlert, 
  Layers, 
  SlidersHorizontal, 
  Info,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { cn } from '@ims/shared-ui';

export interface UIRolePermission {
  id: string;
  permissionCode: string;
  permissionType: string;
  status: string;
  moduleCode: string | null;
  featureCode: string | null;
  actionCode: string | null;
  description: string | null;
}

export function ManagePermissionsForm({ 
  roleId, 
  allPermissions, 
  initialAssignedPermissionIds 
}: { 
  roleId: string, 
  allPermissions: UIRolePermission[], 
  initialAssignedPermissionIds: string[] 
}) {
  const [isPending, startTransition] = useTransition();
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>(initialAssignedPermissionIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');
  const [sortOption, setSortOption] = useState('module');
  const [selectedModule, setSelectedModule] = useState('all');

  const handleToggle = (permissionId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedPermissionIds((prev) =>
        isAssigned ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
      );
      const res = await toggleRolePermissionAction(roleId, permissionId, !isAssigned);
      if (!res.success) {
        // Rollback optimistic update
        setAssignedPermissionIds((prev) =>
          isAssigned ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)
        );
      }
    });
  };

  const handleBulkToggle = (permissionIds: string[], assign: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedPermissionIds((prev) => {
        if (assign) {
          const next = [...prev];
          permissionIds.forEach((id) => {
            if (!next.includes(id)) next.push(id);
          });
          return next;
        } else {
          return prev.filter((id) => !permissionIds.includes(id));
        }
      });

      const res = await toggleRolePermissionsBulkAction(roleId, permissionIds, assign);
      if (!res.success) {
        // Fallback: reload state from initial if server action failed
        // Usually Next.js page will re-render with fresh DB state on revalidatePath
      }
    });
  };

  // Compute stats and modules
  const stats = useMemo(() => {
    const total = allPermissions.length;
    const assigned = assignedPermissionIds.length;
    const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;
    return { total, assigned, percent };
  }, [allPermissions, assignedPermissionIds]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, { total: number; assigned: number }> = {};
    allPermissions.forEach((perm) => {
      const m = perm.moduleCode || 'Other';
      if (!counts[m]) {
        counts[m] = { total: 0, assigned: 0 };
      }
      counts[m].total++;
      if (assignedPermissionIds.includes(perm.id)) {
        counts[m].assigned++;
      }
    });
    return counts;
  }, [allPermissions, assignedPermissionIds]);

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((perm) => {
      // 1. Module filter
      const m = perm.moduleCode || 'Other';
      if (selectedModule !== 'all' && m !== selectedModule) {
        return false;
      }

      // 2. Assigned / Unassigned filter
      const isAssigned = assignedPermissionIds.includes(perm.id);
      if (filterOption === 'assigned' && !isAssigned) return false;
      if (filterOption === 'unassigned' && isAssigned) return false;

      // 3. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const codeMatch = perm.permissionCode.toLowerCase().includes(query);
        const descMatch = perm.description?.toLowerCase().includes(query) ?? false;
        const modMatch = perm.moduleCode?.toLowerCase().includes(query) ?? false;
        if (!codeMatch && !descMatch && !modMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allPermissions, assignedPermissionIds, filterOption, searchQuery, selectedModule]);

  const sortedPermissions = useMemo(() => {
    const perms = [...filteredPermissions];
    if (sortOption === 'alpha_asc' || sortOption === 'module') {
      perms.sort((a, b) => a.permissionCode.localeCompare(b.permissionCode));
    } else if (sortOption === 'alpha_desc') {
      perms.sort((a, b) => b.permissionCode.localeCompare(a.permissionCode));
    }
    return perms;
  }, [filteredPermissions, sortOption]);

  const groupedPermissions = useMemo(() => {
    if (sortOption !== 'module') return {};
    const groups: Record<string, UIRolePermission[]> = {};
    for (const perm of sortedPermissions) {
      const moduleCode = perm.moduleCode || 'Other';
      if (!groups[moduleCode]) {
        groups[moduleCode] = [];
      }
      groups[moduleCode].push(perm);
    }
    return groups;
  }, [sortedPermissions, sortOption]);

  if (allPermissions.length === 0) {
    return (
      <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-[color:var(--ims-brass)] mx-auto mb-3" />
        <p className="text-sm text-[color:var(--ims-muted)]">No permissions available in the system.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start relative w-full">
      {/* ─────────────────────────────────────────────────────────────
         LEFT PANEL: Sticky Control Sidebar & Metrics
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 space-y-6">
        
        {/* Progress & Metrics Card */}
        <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)] shadow-[0_4px_20px_rgba(20,33,61,0.02)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[color:var(--ims-ink)] flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-[color:var(--ims-brass)]" />
              Role Authorization
            </h3>
            <span className="text-xs font-mono text-[color:var(--ims-brass)] font-semibold">{stats.percent}%</span>
          </div>
          
          <div className="text-2xl font-bold text-[color:var(--ims-ink)] mt-2">
            {stats.assigned} <span className="text-xs font-medium text-[color:var(--ims-muted)]">/ {stats.total} assigned</span>
          </div>

          <div className="w-full bg-[color:var(--ims-border)] h-2.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-[color:var(--ims-brass)] h-full transition-all duration-500 ease-out" 
              style={{ width: `${stats.percent}%` }} 
            />
          </div>

          <p className="text-[11px] text-[color:var(--ims-muted)] mt-3 leading-relaxed">
            Assign precise action parameters to this role scope. Changes deploy immediately to active user sessions.
          </p>
        </div>

        {/* Dynamic Navigation & Sidebar Filters */}
        <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)] shadow-[0_4px_20px_rgba(20,33,61,0.02)] space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--ims-muted)] mb-3 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[color:var(--ims-brass)]" />
              Assignment Status
            </h4>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Permissions', count: stats.total },
                { id: 'assigned', label: 'Assigned Only', count: stats.assigned },
                { id: 'unassigned', label: 'Unassigned Only', count: stats.total - stats.assigned }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterOption(opt.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                    filterOption === opt.id
                      ? "bg-[color:var(--ims-surface)] border-[color:var(--ims-brass)] text-[color:var(--ims-brass)] shadow-[0_4px_12px_rgba(196,125,70,0.06)]"
                      : "bg-transparent border-transparent text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-border)]/30 hover:text-[color:var(--ims-ink)]"
                  )}
                >
                  <span>{opt.label}</span>
                  <Badge variant={filterOption === opt.id ? "default" : "outline"}>{opt.count}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[color:var(--ims-border)] pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--ims-muted)] mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[color:var(--ims-brass)]" />
              Module Domains
            </h4>
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedModule('all')}
                className={cn(
                  "w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  selectedModule === 'all'
                    ? "bg-[color:var(--ims-surface)] border-[color:var(--ims-brass)] text-[color:var(--ims-brass)] shadow-[0_4px_12px_rgba(196,125,70,0.06)]"
                    : "bg-transparent border-transparent text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-border)]/30 hover:text-[color:var(--ims-ink)]"
                )}
              >
                <span className="flex items-center gap-1.5">All Modules</span>
                <Badge variant={selectedModule === 'all' ? "default" : "outline"}>{stats.total}</Badge>
              </button>
              
              {Object.entries(moduleCounts).sort(([a], [b]) => a.localeCompare(b)).map(([moduleName, info]) => (
                <button
                  key={moduleName}
                  type="button"
                  onClick={() => setSelectedModule(moduleName)}
                  className={cn(
                    "w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all group",
                    selectedModule === moduleName
                      ? "bg-[color:var(--ims-surface)] border-[color:var(--ims-brass)] text-[color:var(--ims-brass)] shadow-[0_4px_12px_rgba(196,125,70,0.06)]"
                      : "bg-transparent border-transparent text-[color:var(--ims-muted)] hover:bg-[color:var(--ims-border)]/30 hover:text-[color:var(--ims-ink)]"
                  )}
                >
                  <span className="capitalize truncate pr-2 group-hover:translate-x-0.5 transition-transform">{moduleName}</span>
                  <span className="text-[10px] bg-[color:var(--ims-border)] text-[color:var(--ims-ink)] px-2 py-0.5 rounded-full font-bold shrink-0">
                    {info.assigned} / {info.total}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
         RIGHT PANEL: Main Operations & Permissions List
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-grow w-full space-y-6">
        
        {/* Top Actions & Filters Panel */}
        <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)] shadow-[0_4px_20px_rgba(20,33,61,0.02)]">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <SearchInput
                placeholder="Search permissions by code, module or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>
            
            <div className="w-full sm:w-56 shrink-0 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[color:var(--ims-muted)]" />
              <div className="flex-1">
                <Select
                  name="sortOption"
                  options={[
                    { label: 'Alphabetical', value: 'alpha_asc' },
                    { label: 'Group by Module', value: 'module' },
                  ]}
                  value={sortOption}
                  onValueChange={setSortOption}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk loading state indicator */}
        {isPending && (
          <div className="w-full bg-[color:var(--ims-brass)]/10 text-[color:var(--ims-brass)] text-xs py-2.5 px-4 rounded-xl border border-[color:var(--ims-brass)]/20 animate-pulse flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--ims-brass)] animate-ping" />
            Synchronizing permission updates with role access policies...
          </div>
        )}

        {/* Dynamic Grid Layout */}
        {sortedPermissions.length === 0 ? (
          <div className="bg-[color:var(--ims-surface)] rounded-2xl border border-[color:var(--ims-border)] p-12 text-center">
            <Info className="h-8 w-8 text-[color:var(--ims-muted)] mx-auto mb-2" />
            <p className="text-sm text-[color:var(--ims-muted)]">No permissions found matching your criteria.</p>
          </div>
        ) : sortOption === 'module' ? (
          <div className="space-y-8">
            {Object.entries(groupedPermissions).sort(([a], [b]) => a.localeCompare(b)).map(([moduleCode, perms]) => {
              const modulePermIds = perms.map((p) => p.id);
              const moduleAssignedList = perms.filter((p) => assignedPermissionIds.includes(p.id));
              const allAssigned = moduleAssignedList.length === perms.length;
              const noneAssigned = moduleAssignedList.length === 0;

              return (
                <div key={moduleCode} id={`module-${moduleCode}`} className="space-y-4 scroll-mt-24">
                  {/* Module header card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[color:var(--ims-border)] pb-3 gap-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-bold text-[color:var(--ims-ink)] capitalize">{moduleCode}</h3>
                      <span className="text-xs text-[color:var(--ims-muted)]">
                        ({moduleAssignedList.length} of {perms.length} assigned)
                      </span>
                    </div>
                    
                    {/* Module-level bulk options */}
                    <div className="flex items-center gap-2">
                      {!allAssigned && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleBulkToggle(modulePermIds, true)}
                          className="text-[11px] font-bold text-[color:var(--ims-brass)] hover:bg-[color:var(--ims-brass)]/10 px-2.5 py-1 rounded-lg border border-[color:var(--ims-brass)]/20 transition-all"
                        >
                          Assign All
                        </button>
                      )}
                      {!noneAssigned && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleBulkToggle(modulePermIds, false)}
                          className="text-[11px] font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-all"
                        >
                          Remove All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Responsive grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {perms.map((perm) => {
                      const isAssigned = assignedPermissionIds.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleToggle(perm.id, isAssigned)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggle(perm.id, isAssigned);
                            }
                          }}
                          className={cn(
                            "flex flex-col justify-between rounded-2xl border p-4 text-left hover-lift transition-all duration-300 ease-out cursor-pointer select-none min-h-[140px]",
                            isAssigned
                              ? "bg-gradient-to-br from-[color:var(--ims-brass)]/5 to-[color:var(--ims-surface)] border-[color:var(--ims-brass)]/30 shadow-[0_4px_16px_rgba(196,125,70,0.04)]"
                              : "bg-[color:var(--ims-surface)] border-[color:var(--ims-border)] hover:border-[color:var(--ims-brass)]/20 shadow-[0_2px_8px_rgba(20,33,61,0.01)] hover:shadow-[0_8px_24px_rgba(20,33,61,0.05)]"
                          )}
                          data-testid={`toggle-perm-${perm.id}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              {/* Left detail headers */}
                              <div className="space-y-1 min-w-0">
                                <span className="font-mono text-[11px] text-[color:var(--ims-brass)] font-bold tracking-tight block truncate">
                                  {perm.permissionCode}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{perm.permissionType}</Badge>
                                  <Badge variant={perm.status === 'Active' ? 'success' : 'muted'} className="text-[9px] px-1 py-0 h-4">
                                    {perm.status}
                                  </Badge>
                                </div>
                              </div>

                              {/* Right custom styled Checkbox */}
                              <div 
                                className={cn(
                                  "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all",
                                  isAssigned 
                                    ? "border-[color:var(--ims-brass)] bg-[color:var(--ims-brass)] text-white" 
                                    : "border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]"
                                )}
                              >
                                {isAssigned && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>

                            <p className="text-xs text-[color:var(--ims-ink)] line-clamp-2 leading-relaxed">
                              {perm.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="text-[10px] text-[color:var(--ims-muted)] border-t border-[color:var(--ims-border)]/50 pt-2 mt-3 truncate capitalize">
                            Scope: {perm.moduleCode || 'Other'} / {perm.featureCode || 'all'} / {perm.actionCode || 'all'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Plain responsive grid without module grouping */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {sortedPermissions.map((perm) => {
              const isAssigned = assignedPermissionIds.includes(perm.id);
              return (
                <div
                  key={perm.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggle(perm.id, isAssigned)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggle(perm.id, isAssigned);
                    }
                  }}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-4 text-left hover-lift transition-all duration-300 ease-out cursor-pointer select-none min-h-[140px]",
                    isAssigned
                      ? "bg-gradient-to-br from-[color:var(--ims-brass)]/5 to-[color:var(--ims-surface)] border-[color:var(--ims-brass)]/30 shadow-[0_4px_16px_rgba(196,125,70,0.04)]"
                      : "bg-[color:var(--ims-surface)] border-[color:var(--ims-border)] hover:border-[color:var(--ims-brass)]/20 shadow-[0_2px_8px_rgba(20,33,61,0.01)] hover:shadow-[0_8px_24px_rgba(20,33,61,0.05)]"
                  )}
                  data-testid={`toggle-perm-${perm.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left detail headers */}
                      <div className="space-y-1 min-w-0">
                        <span className="font-mono text-[11px] text-[color:var(--ims-brass)] font-bold tracking-tight block truncate">
                          {perm.permissionCode}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{perm.permissionType}</Badge>
                          <Badge variant={perm.status === 'Active' ? 'success' : 'muted'} className="text-[9px] px-1 py-0 h-4">
                            {perm.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Right Checkbox */}
                      <div 
                        className={cn(
                          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all",
                          isAssigned 
                            ? "border-[color:var(--ims-brass)] bg-[color:var(--ims-brass)] text-white" 
                            : "border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]"
                        )}
                      >
                        {isAssigned && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-xs text-[color:var(--ims-ink)] line-clamp-2 leading-relaxed">
                      {perm.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="text-[10px] text-[color:var(--ims-muted)] border-t border-[color:var(--ims-border)]/50 pt-2 mt-3 truncate capitalize">
                    Scope: {perm.moduleCode || 'Other'} / {perm.featureCode || 'all'} / {perm.actionCode || 'all'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
