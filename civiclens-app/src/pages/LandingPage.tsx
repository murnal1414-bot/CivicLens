import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

/* ── FadeIn Component ───────────────────────────────────────── */
function FadeIn({ 
  delay, 
  duration = 1000, 
  children, 
  className = '' 
}: { 
  delay: number 
  duration?: number 
  children: React.ReactNode 
  className?: string 
}) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setOpacity(1), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ── AnimatedHeading Component ───────────────────────────────── */
function AnimatedHeading({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  const lines = text.split('\n')
  const charDelay = 30 // 30ms stagger
  let globalCharCount = 0

  return (
    <div 
      className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[54px] font-normal text-white mb-4 leading-[1.08]"
      style={{ letterSpacing: '-0.04em' }}
    >
      {lines.map((line, lineIndex) => {
        const lineLength = line.length
        return (
          <div key={lineIndex} className="block">
            {line.split('').map((char, charIndex) => {
              const delay = (lineIndex * lineLength * charDelay) + (charIndex * charDelay)
              globalCharCount++
              
              if (char === ' ') {
                return <span key={charIndex}>{'\u00A0'}</span>
              }

              return (
                <span
                  key={charIndex}
                  className="inline-block transition-all ease-out"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-18px)',
                    transitionDuration: '500ms',
                    transitionDelay: `${delay}ms`
                  }}
                >
                  {char}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ── Feature Card ─────────────────────────────────────────── */
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-surface-container rounded-xl p-5 flex flex-col gap-3 group hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <span className="material-symbols-outlined text-on-primary text-[16px]">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/* ── Step Card ────────────────────────────────────────────── */
function StepCard({ step, icon, title, desc }: { step: string; icon: string; title: string; desc: string }) {
  return (
    <div className="bg-surface-container/60 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:-translate-y-1 transition-transform duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[14px]">{icon}</span>
        </div>
        <span className="text-[10px] text-primary/40 uppercase tracking-widest font-semibold">Step {step}</span>
      </div>
      <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  )
}

/* ── Footer ───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="w-full bg-surface-container-low py-8 border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-16 flex flex-col sm:flex-row justify-between items-center gap-4 text-on-surface-variant text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">account_balance</span>
          <span className="tracking-widest font-medium uppercase text-[10px]">CivicLens · IMC Indore</span>
        </div>
        <div className="flex gap-6 text-[10px]">
          {['Privacy', 'Contact', 'Terms'].map(l => (
            <a key={l} href="#" className="hover:text-primary transition-colors">{l}</a>
          ))}
        </div>
        <div className="text-on-surface-variant/40 text-[10px]">© 2026 Indore Municipal Corporation</div>
      </div>
    </footer>
  )
}

/* ── Main Page ────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="dark bg-black min-h-screen flex flex-col text-white">
      <Navbar />

      {/* ═══════════════════════════════════════════════════ HERO */}
      <section className="relative w-full min-h-screen flex flex-col overflow-hidden animate-fade-in">
        
        {/* Video Background (RAW, no overlay/dimming) */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
          src="/hero-bg.mp4"
        />

        {/* Content pushed to bottom */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 pt-28">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="lg:grid lg:grid-cols-12 lg:items-end gap-10">

              {/* Left Column: Heading + Tagline + Actions */}
              <div className="lg:col-span-8 flex flex-col gap-6 text-left">
                <AnimatedHeading text={"Shaping tomorrow\nwith vision and action."} />

                <FadeIn delay={800} className="text-base md:text-lg text-gray-300 max-w-xl">
                  We resolve citizen grievances and build digital services that shape Indore's future.
                </FadeIn>

                <FadeIn delay={1200} className="flex flex-wrap gap-4 mt-2">
                  <Link
                    to="/file-complaint"
                    className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                  >
                    Start a Chat
                  </Link>
                  <a
                    href="#features"
                    className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-all duration-200 text-sm"
                  >
                    Explore Now
                  </a>
                </FadeIn>
              </div>

              {/* Right Column: Glass Card */}
              <FadeIn delay={1400} className="lg:col-span-4 flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
                <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl w-full max-w-xs">
                  <p className="text-lg md:text-xl lg:text-2xl font-light text-white leading-normal">
                    Reporting.<br />Resolving.<br />Tracking.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">CivicLens Portal</span>
                    <Link to="/login" className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined text-white text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </FadeIn>

            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ FEATURES */}
      <section id="features" className="w-full bg-black py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            <div className="lg:col-span-4 lg:sticky top-24">
              <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 font-semibold">Core Focus</p>
              <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">
                Fast &amp; clear services.
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                We use intelligent routing to deliver citizen requests directly to the responsible IMC department, ensuring clean resolution states.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureCard icon="water_drop"    title="Auto Routing" desc="AI classifies your issues and routes them to the correct municipal department." />
              <FeatureCard icon="analytics"     title="Live Tracking" desc="Track the stage of your ticket in real time with SMS updates." />
              <FeatureCard icon="merge"         title="Duplicate Detection" desc="We automatically group similar reports located in the same area." />
              <FeatureCard icon="notifications" title="System Alerts" desc="Get instantly notified when the task force starts solving your issue." />
              <FeatureCard icon="mic"           title="Voice Support" desc="Speak your issues in Hindi or English directly on the report card." />
              <FeatureCard icon="location_on"   title="GPS Pinpoint" desc="Auto-locates where the incident occurred so workers arrive on target." />
            </div>

          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════ HOW IT WORKS */}
      <section id="how-it-works" className="w-full bg-[#0d0d0d] py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10 text-center">
            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 font-semibold font-mono">Process</p>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-1">Simple workflow.</h2>
            <p className="text-xs text-gray-300 max-w-xs mx-auto">From submitting a grievance to watching it get fixed in three steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard step="01" icon="edit_note"  title="Submit Details" desc="Provide text description, record a voice clip, or take a picture of the issue." />
            <StepCard step="02" icon="psychology" title="AI Classification" desc="Our classification model identifies the categories and assigns priority status." />
            <StepCard step="03" icon="verified"   title="Verify Resolution" desc="The team uploads resolution proof photos, and you confirm the completion." />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ DEPARTMENTS */}
      <section className="w-full bg-black py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8">
            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 font-semibold">Municipal Coverage</p>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">13 IMC Departments Covered</h2>
            <p className="text-xs text-gray-300 max-w-md">Our backend connects all main offices under a unified administrative workflow.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[
              { icon: 'water_drop',            label: 'Water & Drainage' },
              { icon: 'add_road',              label: 'Roads & Public Works' },
              { icon: 'delete_forever',        label: 'Sanitation & Waste' },
              { icon: 'lightbulb',             label: 'Streetlights' },
              { icon: 'local_fire_department', label: 'Fire Safety' },
              { icon: 'gavel',                 label: 'Revenue' },
              { icon: 'computer',              label: 'IT Services' },
              { icon: 'apartment',             label: 'Housing' },
              { icon: 'shopping_bag',          label: 'Food & Supplies' },
              { icon: 'school',                label: 'Education' },
              { icon: 'balance',               label: 'Law & Administration' },
              { icon: 'map',                   label: 'Planning' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-[#121212] rounded-xl px-4 py-3 border border-white/5">
                <span className="material-symbols-outlined text-white text-[16px] shrink-0">{icon}</span>
                <span className="text-xs text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════ CTA BAND */}
      <section className="w-full bg-white text-black py-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Help Indore remain the cleanest city.</h2>
            <p className="text-gray-600 mt-1 text-xs">File your complaint now. AI routes it in seconds.</p>
          </div>
          <Link
            to="/file-complaint"
            className="shrink-0 bg-black text-white px-8 py-3 rounded-lg font-semibold text-xs hover:bg-gray-800 transition-colors"
          >
            File a Complaint
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
