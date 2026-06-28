import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@ims/shared-ui';
import { BookOpen, Award, Clock, CreditCard, GraduationCap, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Dashboard | Student Portal' };

export default function StudentDashboardPage() {
  const activeCourses = [
    {
      title: 'Process Safety Fundamentals',
      code: 'SF-101',
      progress: 85,
      completedClasses: 17,
      totalClasses: 20,
      nextSession: 'Tomorrow, 09:00 AM (Room 201)',
      instructor: 'Dr. Salem Al-Harthy',
      color: 'bg-gradient-to-r from-primary-700 to-brand-500',
      tagColor: 'text-primary-700 bg-brand-50',
    },
    {
      title: 'Industrial Safety & Risk Assessment',
      code: 'SF-203',
      progress: 40,
      completedClasses: 6,
      totalClasses: 15,
      nextSession: 'Thursday, 02:00 PM (Lab 3A)',
      instructor: 'Eng. Nasser Al-Rawahi',
      color: 'bg-gradient-to-r from-brand-500 to-accent-600',
      tagColor: 'text-accent-700 bg-accent-50',
    },
  ];

  const upcomingEvents = [
    { title: 'Process Safety Quiz (Unit 3)', time: 'Today, 10:00 AM', type: 'Quiz', color: 'text-primary-700 bg-brand-50' },
    { title: 'Risk Assessment Lab Practical', time: 'Tomorrow, 02:00 PM', type: 'Practical', color: 'text-accent-700 bg-accent-50' },
    { title: 'Mid-term Mock Examination', time: 'July 5, 09:00 AM', type: 'Exam', color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-primary-950 via-primary-900 to-brand-800 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-brand-400/25 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-200 backdrop-blur-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              Active Enrollment
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-brand-100 via-accent-200 to-white bg-clip-text text-transparent">Ahmad Al-Saud</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium">
              Keep progressing on your target milestones. You have 2 active classes scheduled for this week.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-md">
            <div className="h-10 w-10 rounded-xl bg-accent-500/20 flex items-center justify-center text-accent-200 font-bold">
              83%
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Average Attendance</p>
              <p className="text-xs font-black text-accent-200">EXCELLENT STANDING</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Courses list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.24em] text-[color:var(--ims-muted)] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-600" />
                My Enrolled Courses
              </h2>
              <Badge variant="info">2 In Progress</Badge>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {activeCourses.map((course) => (
                <div
                  key={course.code}
                  className="group relative overflow-hidden rounded-[28px] border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${course.tagColor}`}>
                        {course.code}
                      </span>
                      <h3 className="text-xl font-bold text-[color:var(--ims-ink)] group-hover:text-primary-700 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-[color:var(--ims-muted)] font-medium">
                        Instructor: {course.instructor}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
                      <Clock className="h-4 w-4 text-primary-600" />
                      <div className="text-left">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Next Session</p>
                        <p className="text-xs font-bold text-slate-800">{course.nextSession}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Course Progress</span>
                      <span>{course.progress}% Completed ({course.completedClasses}/{course.totalClasses} classes)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/40">
                      <div
                        className={`h-full rounded-full ${course.color} transition-all duration-1000`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Panel - Outstanding dues & events */}
        <div className="space-y-6">
          {/* Outstanding Fees Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-600" />
                Tuition Account
              </CardTitle>
              <CardDescription>Installment schedule & outstanding balance dues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-5 text-center space-y-2">
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Outstanding Dues</p>
                <p className="text-3xl font-black text-rose-950">150.000 OMR</p>
                <p className="text-[10px] font-semibold text-rose-600">Next Installment due by June 30, 2026</p>
              </div>

              <Link href="/student/fees" className="w-full">
                <Button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-700 to-accent-600 text-white font-bold shadow-lg shadow-primary-700/20 hover:shadow-primary-700/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                  View Invoice & Pay <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Academic Schedule Agenda */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Agenda</CardTitle>
              <CardDescription>Upcoming quizzes, assignments, and test schedules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider text-center shrink-0 ${evt.color}`}>
                    {evt.type}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{evt.title}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{evt.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Achievements Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary-600" />
                Certificates
              </CardTitle>
              <CardDescription>Earned credentials and eligibility track.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 p-4 rounded-2xl border border-dashed border-slate-200 text-center flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">NEBOSH Authorization Course</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Eligible to Claim
                  </p>
                </div>
                <Link href="/student/certificates" className="w-full">
                  <Button variant="outline" className="w-full py-2.5 rounded-xl text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                    Claim Certificate
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
