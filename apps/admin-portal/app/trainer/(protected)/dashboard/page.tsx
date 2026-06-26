import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@ims/shared-ui';
import { BookOpen, Calendar, Clock, ArrowRight, CheckCircle2, ChevronRight, Activity, Award } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Dashboard | Trainer Portal' };

export default function TrainerDashboardPage() {
  const stats = [
    { title: 'Active Batches', value: '3', description: 'Under instruction', icon: <BookOpen className="h-5 w-5" /> },
    { title: 'Avg. Attendance', value: '94.5%', description: 'Across all groups', icon: <Activity className="h-5 w-5" /> },
    { title: 'Action Required', value: '2', description: 'Batch approvals pending', icon: <Award className="h-5 w-5" /> },
  ];

  const todayClasses = [
    {
      batchCode: 'SF-101-A',
      courseName: 'Process Safety Fundamentals',
      time: '09:00 AM - 11:00 AM',
      location: 'Room 201 (Central Campus)',
      enrolled: 18,
      status: 'Ready',
      color: 'border-l-4 border-l-cyan-500',
    },
    {
      batchCode: 'SF-203-B',
      courseName: 'Industrial Risk Assessment Lab',
      time: '02:00 PM - 04:00 PM',
      location: 'Lab 3A (Central Campus)',
      enrolled: 12,
      status: 'Ready',
      color: 'border-l-4 border-l-violet-500',
    },
  ];

  const activeBatches = [
    { code: 'SF-101-A', name: 'Process Safety Fundamentals', students: 18, maxStudents: 20, status: 'Active' },
    { code: 'SF-203-B', name: 'Industrial Risk Assessment', students: 12, maxStudents: 15, status: 'Active' },
    { code: 'NEB-402-C', name: 'NEBOSH Safety Authorization', students: 25, maxStudents: 25, status: 'Review Pending' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-cyan-950 via-slate-900 to-violet-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Instructor Workspace
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">Eng. Salem Al-Harthy</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium">
              You have 2 upcoming teaching sessions scheduled for today. Review the attendance grids below.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold">
              85%
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trainer Utilization</p>
              <p className="text-xs font-black text-cyan-300">HIGH ENGAGEMENT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-[28px] border border-[color:var(--ims-border)] bg-white/80 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg group flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--ims-muted)]">{stat.title}</p>
              <p className="text-3xl font-black text-[color:var(--ims-ink)]">{stat.value}</p>
              <p className="text-[10px] text-[color:var(--ims-muted)] font-medium">{stat.description}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.24em] text-[color:var(--ims-muted)] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-500" />
                {"Today's"} Teaching Schedule
              </h2>
              <Badge variant="success">2 Classes Scheduled</Badge>
            </div>

            <div className="space-y-4">
              {todayClasses.map((cls) => (
                <div
                  key={cls.batchCode}
                  className={`relative overflow-hidden rounded-[28px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-6 hover:shadow-xl transition-all duration-300 group ${cls.color}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-600 border border-cyan-100 uppercase tracking-widest">
                          {cls.batchCode}
                        </span>
                        <span className="text-xs text-[color:var(--ims-muted)] font-bold">
                          {cls.enrolled} Enrolled Students
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[color:var(--ims-ink)] group-hover:text-cyan-600 transition-colors">
                        {cls.courseName}
                      </h3>
                      <p className="text-xs text-[color:var(--ims-muted)] font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {cls.time} | {cls.location}
                      </p>
                    </div>

                    <Link href="/trainer/attendance" className="shrink-0 self-start sm:self-auto">
                      <Button className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-1.5">
                        Mark Attendance <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Batches & Approvals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Active Groups</CardTitle>
              <CardDescription>Management of your assigned batches and student logs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBatches.map((batch) => (
                <div key={batch.code} className="flex flex-col gap-2 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-slate-800">{batch.code}</p>
                      <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[150px]">{batch.name}</p>
                    </div>
                    <Badge variant={batch.status === 'Active' ? 'success' : 'warning'}>
                      {batch.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-2 border-t border-slate-100">
                    <span>Capacity: {batch.students}/{batch.maxStudents}</span>
                    
                    {batch.status === 'Review Pending' ? (
                      <Link href="/trainer/schedule" className="text-cyan-600 hover:underline flex items-center gap-0.5">
                        Verify <ChevronRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link href="/trainer/attendance" className="text-slate-500 hover:underline flex items-center gap-0.5">
                        Schedule <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Info / Announcements */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reminder</CardTitle>
              <CardDescription>Rules and guidelines for training delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-[color:var(--ims-muted)] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Attendance must be marked within 24 hours of class completion.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Submit course completion recommendations directly to the Branch Manager for certificate eligibility audit.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
