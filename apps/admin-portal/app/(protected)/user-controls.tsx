'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, KeyRound, LogOut, RefreshCw, UserPen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ims/shared-ui';
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm transition-all duration-300 hover:border-[color:var(--ims-brass-soft)] hover:bg-[color:var(--ims-surface)] active:scale-[0.99]">
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[color:var(--ims-muted)]">Profile</span>
              <span className="block truncate text-sm font-semibold text-[color:var(--ims-ink)]">{userName}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--ims-muted)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account/profile" className="flex w-full items-center gap-2">
              <UserPen className="h-4 w-4" />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/password" className="flex w-full items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Change Password
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="text-rose-600 focus:text-rose-600">
            <Link href="/sign-out" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
