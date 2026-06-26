'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CountUp } from '@ims/shared-ui';
import { BookOpen, ArrowRight, ClipboardCheck, Video, Users, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';

const FEATURES = [
  { title: "Manage Classes", desc: "View schedule, update topics, and manage room allocations.", icon: ClipboardCheck, color: "#c96a22" },
  { title: "Content Upload", desc: "Share presentations, notes, and study materials.", icon: Video, color: "#8a4a1d" },
  { title: "Attendance", desc: "Track and mark student attendance effortlessly.", icon: Users, color: "#d18a43" },
  { title: "Assessments", desc: "Grade assignments and provide feedback to students.", icon: CheckCircle, color: "#b75c16" },
];

const COUNTERS = [
  { label: 'Sessions this week', value: '12+' },
  { label: 'Active learners', value: '45+' },
  { label: 'Materials shared', value: '28+' },
  { label: 'Feedback turnaround', value: '24h' },
];

export default function TrainerPortalLanding() {
  return (
    <div className="min-h-screen bg-[#fbf8f3] font-sans overflow-hidden text-slate-900">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-lg border-b border-[#f0e3d2] py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/alsaud/logo.png" alt="Al-Saud Training Institute" width={156} height={52} className="h-10 w-auto" priority />
            <span className="font-black text-lg tracking-tight">Trainer<span className="text-[#b75c16]">Portal</span></span>
          </Link>
          <Link href="/trainer/sign-in" className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-[#c96a22] transition-colors shadow-md hover:shadow-[#c96a22]/25">
            Trainer Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-[#d8a06d]/20 blur-[100px] rounded-full pointer-events-none -z-10" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }} 
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-[5%] w-[600px] h-[600px] bg-[#ead1b2]/30 blur-[100px] rounded-full pointer-events-none -z-10" 
        />

        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <motion.div className="flex-1 text-center lg:text-left" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#efd8bf] text-[#b75c16] text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
              <Sparkles className="w-4 h-4" /> Inspire the Next Generation
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6 text-slate-900">
              Your Complete <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c96a22] to-[#8a4a1d]">Teaching Suite.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-xl mx-auto lg:mx-0">
              Manage your sessions, interact with students, and deliver outstanding educational experiences.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
              {COUNTERS.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.08 }}
                  className="rounded-[1.75rem] border border-[#f0e3d2] bg-white p-5 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-2xl font-black text-zinc-950"><CountUp value={item.value} /></p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">{item.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/trainer/sign-in" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#c96a22] to-[#8a4a1d] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-[#c96a22]/25 hover:scale-105 transition-transform">
                Enter Workspace <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          <motion.div className="flex-1 w-full max-w-md relative" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white aspect-square bg-slate-100">
               <Image src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Trainer" width={800} height={800} />
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-[#f0e3d2]"
            >
              <div className="bg-[#fff1e3] p-2 rounded-lg text-[#b75c16]"><CheckCircle className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold"><CountUp value="12+" /></p><p className="text-[10px] text-slate-500 uppercase">Completed this week</p></div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-8 -left-8 bg-slate-900 p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 text-white"
            >
              <div className="bg-white/10 p-2 rounded-lg text-[#f4d5b7]"><Users className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold"><CountUp value="45+" /> Students</p><p className="text-[10px] text-slate-400 uppercase">Currently active</p></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-24 bg-white relative z-10 border-t border-[#f0e3d2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Powerful Instructor Tools</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Everything you need to run your classes smoothly and efficiently.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#faf7f2] rounded-3xl p-8 border border-[#f0e3d2] hover:border-[#d8a06d] transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110" style={{ backgroundColor: '#fff1e3', color: '#b75c16' }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <BookOpen className="w-12 h-12 mx-auto mb-6 text-[#f4d5b7] opacity-70" />
          <h2 className="text-3xl md:text-4xl font-black mb-6">Ready for your next class?</h2>
          <Link href="/trainer/sign-in" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#fff1e3] transition-colors shadow-lg shadow-white/10">
            Sign In Now <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
      
    </div>
  );
}
