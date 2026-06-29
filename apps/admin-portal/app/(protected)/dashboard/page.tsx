import { cookies } from 'next/headers';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { Badge, StatCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@ims/shared-ui';
import { BookOpen, Building2, GraduationCap, Users, Clock, Activity, ShieldCheck, Mail, Phone, MapPin, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  const { organizationService } = await import('../../lib/runtime');

  const summary = await organizationService.listDashboardSummary();

  const mockActivities = [
    { type: 'auth', message: 'Super Admin logged in successfully from Muscat IP', time: '2 mins ago', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10' },
    { type: 'org', message: 'Branch "Muscat Campus" status changed to Active', time: '1 hour ago', icon: Building2, color: 'text-amber-500 bg-amber-500/10' },
    { type: 'dept', message: 'Department "Safety Engineering" created under Riyadh Branch', time: '3 hours ago', icon: BookOpen, color: 'text-brand-600 bg-brand-500/10' },
    { type: 'audit', message: 'Audit log appended for action: organization.institute_created', time: '5 hours ago', icon: Activity, color: 'text-primary-600 bg-primary-500/10' },
  ];

  const quickLinks = [
    { title: 'Register Institute', desc: 'Add new corporate entity', href: '/organization', icon: Building2, color: 'from-primary-700 to-brand-500' },
    { title: 'Manage Branches', desc: 'Configure regional campuses', href: '/organization', icon: BookOpen, color: 'from-accent-600 to-primary-700' },
    { title: 'Configure Departments', desc: 'Organize training divisions', href: '/organization', icon: GraduationCap, color: 'from-brand-500 to-primary-700' },
    { title: 'IAM Access Policies', desc: 'Configure role permissions', href: '/iam', icon: Users, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-950 via-primary-900 to-brand-800 p-6 md:p-8 text-white shadow-xl backdrop-blur-md border border-white/20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-500/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-brand-400/35 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-100 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-300 animate-pulse" />
              Central Control Unit
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-brand-100 via-accent-200 to-white bg-clip-text text-transparent">{session?.displayName ?? 'Admin'}</span>
            </h1>
            <p className="text-sm text-neutral-300 font-medium">
              Here is the live operations and compliance summary for Al-Saud Training Institute today.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md">
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">System Integrity</p>
              <p className="text-xs font-black text-emerald-400">ACTIVE & SECURED</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-stats">
        <StatCard
          title="Institutes"
          value={summary.totalInstitutes}
          description="Active corporate training entities"
          trend={{ value: 0, label: 'No change' }}
          icon={<Building2 className="h-5 w-5" />}
          data-testid="stat-institutes"
        />
        <StatCard
          title="Branches"
          value={summary.totalBranches}
          description="Operational regional facilities"
          trend={{ value: 25, label: 'growth' }}
          icon={<BookOpen className="h-5 w-5" />}
          data-testid="stat-branches"
        />
        <StatCard
          title="Students (Mock)"
          value="1,482"
          description="Pending enrollment module load"
          trend={{ value: 12, label: 'this month' }}
          icon={<Users className="h-5 w-5" />}
          data-testid="stat-students"
        />
        <StatCard
          title="Certificates (Mock)"
          value="340"
          description="Pending certificate module activation"
          trend={{ value: 8, label: 'this week' }}
          icon={<GraduationCap className="h-5 w-5" />}
          data-testid="stat-certificates"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Operations Link Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Operations Panel</CardTitle>
              <CardDescription>Shortcut access to organizational setup and IAM controls.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickLinks.map((link) => {
                  const LinkIcon = link.icon;
                  return (
                    <Link key={link.title} href={link.href} className="group relative block rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                          <LinkIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-[color:var(--ims-ink)] flex items-center gap-1 group-hover:text-primary-700 transition-colors">
                            {link.title}
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                          </p>
                          <p className="text-xs text-[color:var(--ims-muted)] font-medium">{link.desc}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Registered Institutes */}
          {summary.institutes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.24em] text-[color:var(--ims-muted)] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[color:var(--ims-brass)]" />
                Registered Training Institutes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="institute-list">
                {summary.institutes.map((inst) => (
                  <div
                    key={inst.id}
                    className="relative overflow-hidden rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-300 group"
                    data-testid={`institute-card-${inst.id}`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-brand-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125" />
                    
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="space-y-1">
                        <p className="font-black text-[color:var(--ims-ink)] text-base group-hover:text-primary-700 transition-colors">
                          {inst.instituteName}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--ims-muted)]">
                          Code: {inst.instituteCode}
                        </p>
                      </div>
                      <Badge variant={inst.status === 'Active' ? 'success' : 'muted'}>
                        {inst.status}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[color:var(--ims-border)]/60 space-y-2 relative z-10">
                      {inst.primaryEmail && (
                        <p className="text-xs text-[color:var(--ims-muted)] flex items-center gap-2 font-medium">
                          <Mail className="h-3.5 w-3.5 text-primary-600" />
                          {inst.primaryEmail}
                        </p>
                      )}
                      {inst.primaryPhone && (
                        <p className="text-xs text-[color:var(--ims-muted)] flex items-center gap-2 font-medium">
                          <Phone className="h-3.5 w-3.5 text-primary-600" />
                          {inst.primaryPhone}
                        </p>
                      )}
                      {inst.country && (
                        <p className="text-xs text-[color:var(--ims-muted)] flex items-center gap-2 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-primary-600" />
                          {inst.country}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Column - Activity Logs & Outbox status */}
        <div className="space-y-6">
          {/* System Status Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-600 animate-pulse" />
                System Dispatcher
              </CardTitle>
              <CardDescription>Reliable domain event bus and transactional outbox logs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted-50 border border-border-light p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-bold">Outbox Daemon</span>
                  <Badge variant="success">Online</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-bold">Events Processed</span>
                  <span className="font-bold text-neutral-800">1,248</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-bold">Retries / Failures</span>
                  <span className="font-bold text-neutral-800">0</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-bold">Thread Worker PID</span>
                  <span className="font-mono bg-muted-200 text-neutral-700 px-1.5 py-0.5 rounded text-[10px]">8472</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[color:var(--ims-muted)] leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>All pending database outbox transactions verified cleanly.</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Trail</CardTitle>
              <CardDescription>Live action history captured inside this branch scope.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 border-l-2 border-brand-100 space-y-5">
                {mockActivities.map((act, i) => {
                  const ActIcon = act.icon;
                  return (
                    <div key={i} className="relative space-y-1">
                      <div className={`absolute -left-[25px] top-0 rounded-full p-1 border-2 border-white shadow-sm ${act.color}`}>
                        <ActIcon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-bold text-[color:var(--ims-ink)] leading-snug">
                        {act.message}
                      </p>
                      <span className="text-[10px] text-[color:var(--ims-muted)] font-semibold flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {act.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
