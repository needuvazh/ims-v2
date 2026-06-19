'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, BookOpen, Calendar, Award, Sparkles, BarChart, ChevronRight } from 'lucide-react';

const FEATURES = [
  { title: "My Courses", desc: "Access your enrolled courses, materials, and assignments.", icon: BookOpen, color: "#8B5CF6", link: "#" },
  { title: "Schedule", desc: "View your upcoming classes, exams, and important deadlines.", icon: Calendar, color: "#EC4899", link: "#" },
  { title: "Results", desc: "Check your academic performance, grades, and feedback.", icon: BarChart, color: "#06B6D4", link: "#" },
  { title: "Certificates", desc: "Download and verify your earned certificates and achievements.", icon: Award, color: "#F59E0B", link: "#" },
];

export default function StudentPortalLanding() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans overflow-hidden text-slate-900">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2 rounded-xl text-white shadow-lg shadow-pink-500/30 transform group-hover:rotate-12 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-black text-lg tracking-tight">Student<span className="text-pink-500">Portal</span></span>
          </Link>
          <Link href="/sign-in" className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-pink-500 transition-colors shadow-md hover:shadow-pink-500/30">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-400/20 blur-[100px] rounded-full pointer-events-none -z-10" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-400/20 blur-[100px] rounded-full pointer-events-none -z-10" 
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-pink-100 shadow-sm text-pink-600 text-xs font-bold uppercase tracking-widest mb-8">
              <Sparkles className="w-4 h-4" /> Your Learning Hub
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
              Welcome to the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">Student Experience.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
              Access your courses, track your progress, and stay connected with your instructors all in one vibrant place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-in" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-pink-500/30 hover:scale-105 transition-transform">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group relative bg-[#FAFAFA] rounded-3xl p-8 border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-white/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" style={{ backgroundImage: `linear-gradient(to bottom right, transparent, ${feat.color}20)` }} />
                  
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-md" style={{ backgroundColor: feat.color }}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">{feat.desc}</p>
                  
                  <Link href={feat.link} className="inline-flex items-center text-sm font-bold hover:underline" style={{ color: feat.color }}>
                    Explore <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-pink-500/20 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-4xl font-black mb-4">Ready to continue?</h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">Sign in to your account to view your personalized dashboard and resume your courses.</p>
              <Link href="/sign-in" className="inline-flex px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-pink-50 hover:text-pink-600 transition-colors shadow-lg">
                Sign In Now
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}
