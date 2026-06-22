'use client';

import { useState, useTransition } from 'react';
import { Building2, LogOut, RefreshCw } from 'lucide-react';
import { setActiveBranchAction } from '../lib/auth-actions';

interface BranchOption {
  id: string;
  name: string;
}

interface UserControlsProps {
  activeBranchId: string | null;
  branches: BranchOption[];
  isGlobal: boolean;
}

export function UserControls({ activeBranchId, branches, isGlobal }: UserControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedBranch, setSelectedBranch] = useState(activeBranchId ?? 'All');
  const [error, setError] = useState<string | null>(null);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setError(null);

    startTransition(async () => {
      const res = await setActiveBranchAction(branchId);
      if (!res.success) {
        setError(res.error ?? 'Failed to switch branch.');
        // Revert select input selection
        setSelectedBranch(activeBranchId ?? 'All');
      }
    });
  };

  const handleLogout = () => {
    window.location.href = '/sign-out';
  };

  // Only show the branch switcher if they have global access OR multiple branches to choose from
  const showSwitcher = isGlobal || branches.length > 1;

  return (
    <div className="space-y-3.5">
      {showSwitcher && (
        <div className="space-y-1">
          <label htmlFor="active-branch-select" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ims-muted)]">
            <Building2 className="h-3 w-3" />
            Active Context
          </label>
          <div className="relative group">
            <select
              id="active-branch-select"
              value={selectedBranch}
              disabled={isPending}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-2xl border-2 border-slate-200 bg-white/80 py-2.5 pl-4 pr-10 text-xs font-bold text-[color:var(--ims-ink)] outline-none shadow-sm hover:border-[color:var(--ims-brass-soft)] focus:border-[color:var(--ims-brass)] transition-all disabled:opacity-50"
            >
              {isGlobal && <option value="All">All Branches (Global)</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[color:var(--ims-muted)]" />
              ) : (
                <span className="text-[10px] text-[color:var(--ims-muted)] font-black">▼</span>
              )}
            </div>
          </div>
          {error && <p className="text-[10px] font-semibold text-rose-600 ml-1">{error}</p>}
        </div>
      )}

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-600 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all duration-300 group active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Sign Out Securely
      </button>
    </div>
  );
}
