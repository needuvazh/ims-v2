'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Building2, KeyRound, LogOut, RefreshCw, UserPen } from 'lucide-react';
import { setActiveBranchAction } from '../lib/auth-actions';

interface BranchOption {
  id: string;
  name: string;
}

interface UserControlsProps {
  userName: string;
  activeBranchId: string | null;
  branches: BranchOption[];
  isGlobal: boolean;
}

export function UserControls({ userName, activeBranchId, branches, isGlobal }: UserControlsProps) {
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

  // Only show the branch switcher if they have global access OR multiple branches to choose from
  const showSwitcher = isGlobal || branches.length > 1;

  return (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ims-muted)]">
          <Building2 className="h-3 w-3" />
          Active Context
        </label>

        {showSwitcher && (
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
        )}

        {showSwitcher && error && <p className="text-[10px] font-semibold text-rose-600 ml-1">{error}</p>}

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
          <Link
            href="/account/profile"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--ims-ink)] transition-colors hover:bg-white hover:text-[color:var(--ims-brass)]"
          >
            <UserPen className="h-4 w-4" />
            My Profile
          </Link>
          <Link
            href="/account/password"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--ims-ink)] transition-colors hover:bg-white hover:text-[color:var(--ims-brass)]"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </Link>
          <Link
            href="/sign-out"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </div>
      </div>
    </div>
  );
}
