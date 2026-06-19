'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Award, BookOpen, Building2, CheckCircle, ChevronRight,
  Clock, GraduationCap, Mail, MapPin, Phone, Shield, Users, Sparkles, Play, Star
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

/* ─── Data ─────────────────────────────────────────────────────────────── */
const NAV = [
  { label: 'HOME',       href: '/'            },
  { label: 'PROGRAMS',   href: '#programs'    },
  { label: 'FACILITIES', href: '#facilities'  },
  { label: 'EVENTS',     href: '#events'      },
  { label: 'ABOUT',      href: '#about'       },
  { label: 'CONTACT',    href: '#contact'     },
];

const STATS = [
  { value: '80+',  label: 'Global Programs',   color: '#EC4899' },
  { value: '25k+', label: 'Students Trained',  color: '#8B5CF6' },
  { value: '150+', label: 'Success Partners',  color: '#06B6D4' },
  { value: '20+',  label: 'Years Experience',  color: '#F59E0B' },
];

const PARTNERS = ['ISO 9001', 'PDO Approved', 'MoL Certified', 'NEBOSH', 'IOSH', 'PMI Authorized'];

const FEATURES = [
  { icon: Shield,    title: 'Strategic Vision',   desc: 'Aligning training goals with national workforce development targets.', color: '#8B5CF6' },
  { icon: Building2, title: 'Modern Facilities',  desc: 'High-spec classrooms, simulation labs, and collaborative spaces.', color: '#EC4899'   },
  { icon: Users,     title: 'Certified Trainers', desc: 'Expert instructors with global certifications and industry experience.', color: '#06B6D4' },
];

const PROGRAMS = [
  { tag: 'Safety',    title: 'Process Safety Fundamentals',          mode: 'Classroom', hours: '8 hrs', color: '#EC4899'  },
  { tag: 'Language',  title: 'IELTS Preparation Course',             mode: 'Classroom', hours: '40 hrs', color: '#8B5CF6' },
  { tag: 'Project',   title: 'Project Management Professional',      mode: 'Blended',   hours: '5 days', color: '#F59E0B' },
  { tag: 'Engineering', title: 'Industrial Safety & Risk Assessment', mode: 'Classroom', hours: '3 days', color: '#06B6D4' },
];

const EVENTS = [
  { month: 'JUL', day: '15', title: 'IELTS Information Session',  place: 'Main Campus',        time: '10:00 AM', color: '#8B5CF6' },
  { month: 'JUL', day: '22', title: 'Process Safety Workshop',    place: 'Training Centre B',  time: '09:00 AM', color: '#EC4899' },
  { month: 'AUG', day: '05', title: 'Corporate Training Expo',    place: 'Conference Hall',    time: '08:30 AM', color: '#06B6D4' },
];

const PORTALS = [
  { id: 'admin',   label: 'Admin Portal',       cta: 'Sign In as Admin',  desc: 'Full control over institute operations.',      icon: Shield,       href: '/sign-in', color: '#8B5CF6' },
  { id: 'student', label: 'Student Portal',     cta: 'Student Login',     desc: 'Access courses, attendance, and results.',      icon: GraduationCap, href: 'http://student-portal.localhost', color: '#EC4899' },
  { id: 'trainer', label: 'Trainer Portal',     cta: 'Trainer Login',     desc: 'Mark attendance, upload content.',              icon: BookOpen,     href: 'http://trainer-portal.localhost', color: '#06B6D4' },
  { id: 'verify',  label: 'Verify Certificate', cta: 'Verify Now',        desc: 'Verify authenticity of certificates.',          icon: Award,        href: '#',        color: '#F59E0B' },
];

/* ─── StickyNav ─────────────────────────────────────────────────────────── */
function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="hidden sm:block">
            <span className={`block text-[10px] font-bold uppercase tracking-widest ${scrolled ? 'text-violet-600' : 'text-violet-200'}`}>Al-Saud Training</span>
            <span className={`block text-lg font-black tracking-tight ${scrolled ? 'text-slate-900' : 'text-white'}`}>Institute</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((link) => (
            <Link key={link.label} href={link.href} className={`text-xs font-bold tracking-widest transition-colors hover:text-fuchsia-500 ${scrolled ? 'text-slate-600' : 'text-slate-200'}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-violet-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5">
            Admin Login
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] text-slate-900 font-sans">
      <StickyNav />

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-950">
        <motion.div style={{ y: yHero, opacity: opacityHero }} className="absolute inset-0 pointer-events-none">
          {/* Vibrant colorful blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/30 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
          <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-cyan-400/20 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </motion.div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-6">
                <Star className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Level up your skills</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
                Learn today. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
                  Lead tomorrow.
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto lg:mx-0">
                Unlock your potential with world-class training, expert instructors, and a vibrant community dedicated to your success.
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link href="#programs" className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-4 text-sm font-bold text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] flex items-center gap-2">
                  Explore Programs <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#about" className="rounded-full border-2 border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105 flex items-center gap-2">
                  <Play className="h-4 w-4" /> Watch Video
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="flex-1 relative w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-violet-900/50 border border-white/10 aspect-[4/5] lg:aspect-square bg-slate-800">
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop" alt="Students" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            </div>

            {/* Floating Badges */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl border border-slate-100 flex items-center gap-4"
            >
              <div className="bg-fuchsia-100 p-3 rounded-xl">
                <Users className="h-6 w-6 text-fuchsia-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">25k+</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Students</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 rounded-2xl bg-slate-900 p-4 shadow-xl border border-slate-800 flex items-center gap-4"
            >
              <div className="bg-cyan-500/20 p-3 rounded-xl">
                <Award className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">98%</p>
                <p className="text-[10px] font-bold uppercase text-cyan-200">Success Rate</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118,130.85,130.4,201.5,123.63,243.6,119.5,285.5,107.5,321.39,56.44Z" className="fill-[#FAFAFA]"></path>
          </svg>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════════════════ */}
      <section className="py-20 relative z-10 bg-[#FAFAFA]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-transform"
              >
                <span className="text-4xl md:text-5xl font-black mb-2" style={{ color: stat.color }}>{stat.value}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PORTALS ═════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black text-slate-900 mb-4"
            >
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">Portal</span>
            </motion.h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">Sign in to your dedicated workspace to manage your learning journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PORTALS.map((portal, i) => {
              const Icon = portal.icon;
              return (
                <motion.div
                  key={portal.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                >
                  <Link href={portal.href} className="block h-full relative group">
                    <div className="h-full p-8 rounded-3xl bg-[#FAFAFA] border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:bg-white overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/0 to-white/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150" style={{ backgroundImage: `linear-gradient(to bottom right, transparent, ${portal.color}20)` }} />
                      
                      <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform group-hover:-translate-y-2 transition-all" style={{ backgroundColor: portal.color }}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{portal.label}</h3>
                        <p className="text-sm text-slate-500 mb-8">{portal.desc}</p>
                        
                        <div className="flex items-center text-sm font-bold mt-auto" style={{ color: portal.color }}>
                          {portal.cta}
                          <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-slate-950 relative overflow-hidden text-white">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <motion.h2 
                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="text-4xl md:text-5xl font-black mb-6"
              >
                Why Learn With Us?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="text-slate-400 text-lg mb-10"
              >
                We blend modern technology with expert instruction to provide an unparalleled learning experience.
              </motion.p>

              <div className="space-y-6">
                {FEATURES.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                      <div className="flex-shrink-0 mt-1 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${feat.color}20`, color: feat.color }}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{feat.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div 
              className="flex-1 relative w-full"
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            >
               <div className="grid grid-cols-2 gap-4">
                 <img src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=500&auto=format&fit=crop" className="rounded-3xl w-full h-64 object-cover mt-10" alt="Students" />
                 <img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=500&auto=format&fit=crop" className="rounded-3xl w-full h-64 object-cover" alt="Classroom" />
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 py-12 text-center text-slate-500 relative z-10 border-t border-slate-800">
        <p className="text-sm">© {new Date().getFullYear()} Al-Saud Training Institute. All rights reserved.</p>
      </footer>

    </div>
  );
}
