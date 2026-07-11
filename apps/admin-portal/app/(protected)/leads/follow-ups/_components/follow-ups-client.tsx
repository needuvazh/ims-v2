'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Eye, ClipboardList, CheckCircle2, Phone, MessageSquare, Mail, MapPin } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  Pagination,
} from '@ims/shared-ui';
import { LogFollowUpModal } from '../../[id]/_components/log-followup-modal';

type FollowUpGroup = 'today' | 'future' | 'past';

export function FollowUpsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') as FollowUpGroup) || 'today';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 6;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Tab counts state
  const [counts, setCounts] = useState({ today: 0, overdue: 0, future: 0 });

  // Modal log outcome state
  const [selectedFollowUp, setSelectedFollowUp] = useState<{ id: string; version: number } | null>(null);

  // Fetch badges counts
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/crm/leads/follow-ups/counts');
      if (res.ok) {
        const body = await res.json();
        setCounts(body.data);
      }
    } catch (err) {
      console.error('Failed to load follow-up counts:', err);
    }
  }, []);

  // Fetch follow-ups based on active tab and page
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/crm/leads/follow-ups/${activeTab}?page=${page}&limit=${limit}`);
      if (!res.ok) {
        throw new Error('Failed to fetch follow-up records.');
      }
      const body = await res.json();
      setItems(body.data.items);
      setTotal(body.data.pagination.total);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching follow-up tasks');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleTabChange = (tab: FollowUpGroup) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOutcomeSaved = () => {
    setSelectedFollowUp(null);
    fetchCounts();
    fetchItems();
  };

  const getFollowUpTypeIcon = (type: string) => {
    switch (type) {
      case 'Call':
        return <Phone className="h-4 w-4 text-blue-500" />;
      case 'WhatsApp':
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case 'Email':
        return <Mail className="h-4 w-4 text-amber-500" />;
      case 'Visit':
        return <MapPin className="h-4 w-4 text-purple-500" />;
      default:
        return <CalendarClock className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return 'N/A';
    const date = typeof value === 'string' ? new Date(value) : value;

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <CalendarClock className="h-6 w-6 shrink-0 text-[color:var(--ims-brass)] sm:h-8 sm:w-8" />
            Follow-ups Management
          </h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Organized call schedules and tasks scoped to your counselor workflow.
          </p>
        </div>
      </header>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('today')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'today'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Today
          <Badge variant={counts.today > 0 ? 'info' : 'outline'} className="ml-1">
            {counts.today}
          </Badge>
        </button>

        <button
          onClick={() => handleTabChange('future')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'future'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Future
          <Badge variant="outline" className="ml-1">
            {counts.future}
          </Badge>
        </button>

        <button
          onClick={() => handleTabChange('past')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'past'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Past Overdue
          <Badge variant={counts.overdue > 0 ? 'error' : 'outline'} className="ml-1">
            {counts.overdue}
          </Badge>
        </button>
      </div>

      {/* List / Loading / Cards Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-slate-100" />
              <CardContent className="h-32 bg-slate-50 space-y-2 p-4" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-slate-400" />}
          title={`No ${activeTab} follow-ups`}
          description={`You do not have any pending scheduled follow-ups for ${activeTab}.`}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`transition-all hover:border-[var(--ims-brass)] shadow-sm hover:shadow-md ${
                item.status === 'Overdue' || (activeTab === 'past' && item.status === 'Scheduled')
                  ? 'border-rose-250 bg-rose-50/5'
                  : ''
              }`}
            >
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
                      {item.lead?.leadNumber || 'N/A'}
                    </p>
                    <p className="truncate text-sm font-bold text-[var(--ims-ink)]">
                      {item.lead?.firstName} {item.lead?.lastName}
                    </p>
                  </div>
                  <Badge variant={activeTab === 'past' ? 'error' : 'default'} className="flex items-center gap-1">
                    {getFollowUpTypeIcon(item.followUpType)}
                    {item.followUpType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--ims-muted)]">Follow-up Time</p>
                    <p className="font-bold text-slate-800">{formatDateTime(item.followUpDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--ims-muted)]">Lead Stage</p>
                    <p>
                      <Badge variant="outline">{item.lead?.stage || 'N/A'}</Badge>
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="font-semibold text-[var(--ims-muted)]">Course Interest</p>
                    <p className="truncate font-medium text-indigo-900">
                      {item.lead?.interestedCourse?.nameEnglish || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="font-semibold text-[var(--ims-muted)]">Agenda / Notes</p>
                    <p className="bg-slate-50 p-2 rounded text-slate-700 italic border border-slate-100 max-h-16 overflow-y-auto">
                      {item.notes || 'No agenda recorded'}
                    </p>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <p className="font-semibold text-[var(--ims-muted)]">Phone</p>
                      <p className="truncate">{item.lead?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
                      <p className="truncate">{item.lead?.branch?.branchName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[11px]"
                  onClick={() => router.push(`/leads/${item.leadId}`)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> View Lead
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-[11px]"
                  onClick={() => setSelectedFollowUp({ id: item.id, version: item.lead?.version || 1 })}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Log Outcome
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination control */}
      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          limit={limit}
          pageSizeOptions={[6, 12, 24]}
        />
      )}

      {/* Outcome log modal dialog */}
      {selectedFollowUp && (
        <LogFollowUpModal
          followUpId={selectedFollowUp.id}
          leadVersion={selectedFollowUp.version}
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setSelectedFollowUp(null);
            else handleOutcomeSaved();
          }}
        />
      )}
    </div>
  );
}
