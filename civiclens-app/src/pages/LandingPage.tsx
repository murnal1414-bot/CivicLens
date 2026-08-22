import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { GlowCard } from '../components/ui/spotlight-card'
import { BackgroundPixelStars } from '../components/ui/background-pixel-stars'

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

/* ── Feature Glow Card Component ───────────────────────────── */
function FeatureGlowCard({ 
  icon, 
  title, 
  desc, 
  glowColor 
}: { 
  icon: string
  title: string
  desc: string
  glowColor: 'blue' | 'purple' | 'green' | 'red' | 'orange'
}) {
  return (
    <GlowCard 
      customSize={true} 
      glowColor={glowColor}
      className="p-5 flex flex-col gap-3 border-none bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 relative overflow-hidden"
    >
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
        <span className="material-symbols-outlined text-white text-[15px]">{icon}</span>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-white mb-1">{title}</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </GlowCard>
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

/* ── Department Card Component ────────────────────────────── */
function DepartmentCard({ 
  img, 
  subtitle, 
  titlePart1, 
  titlePart2 
}: { 
  img: string
  subtitle: string
  titlePart1?: string
  titlePart2: string
}) {
  return (
    <div className="relative group overflow-hidden rounded-2xl w-full aspect-[3/4] border border-white/10 shadow-lg cursor-pointer bg-neutral-900">
      <img
        src={img}
        alt={titlePart2}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 z-[-1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-[1]" />
      <div className="absolute bottom-4 left-4 right-4 flex flex-col text-left z-10">
        <span className="text-[9px] tracking-widest text-white/50 uppercase font-semibold mb-1">
          {subtitle}
        </span>
        {titlePart1 && (
          <span className="text-xs text-white/80 font-normal leading-tight">
            {titlePart1}
          </span>
        )}
        <span className="text-sm text-white font-bold leading-tight mt-0.5">
          {titlePart2}
        </span>
      </div>
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
    <div className="dark bg-black min-h-screen flex flex-col text-white relative">
      <BackgroundPixelStars />
      <Navbar />

      {/* ═══════════════════════════════════════════════════ HERO */}
      <section className="relative w-full min-h-screen flex flex-col overflow-hidden animate-fade-in">
        
        {/* Video Background (RAW, z-10 overlays on top of fixed stars z-0) */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-10"
          autoPlay
          loop
          muted
          playsInline
          src="/hero-bg.mp4"
        />

        {/* Content pushed to bottom (z-20 sits on top of video) */}
        <div className="relative z-20 flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 pt-28">
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
      <section id="features" className="relative z-20 w-full bg-transparent py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureGlowCard icon="water_drop"    glowColor="blue"   title="Auto Routing" desc="AI classifies your issues and routes them to the correct municipal department." />
            <FeatureGlowCard icon="analytics"     glowColor="purple" title="Live Tracking" desc="Track the stage of your ticket in real time with SMS updates." />
            <FeatureGlowCard icon="merge"         glowColor="orange" title="Duplicate Detection" desc="We automatically group similar reports located in the same area." />
            <FeatureGlowCard icon="notifications" glowColor="red"    title="System Alerts" desc="Get instantly notified when the task force starts solving your issue." />
            <FeatureGlowCard icon="mic"           glowColor="green"  title="Voice Support" desc="Speak your issues in Hindi or English directly on the report card." />
            <FeatureGlowCard icon="location_on"   glowColor="blue"   title="GPS Pinpoint" desc="Auto-locates where the incident occurred so workers arrive on target." />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════ HOW IT WORKS */}
      <section id="how-it-works" className="relative z-20 w-full bg-transparent py-16 px-6 md:px-12 lg:px-16">
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
      <section className="relative z-20 w-full bg-transparent py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8">
            <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 font-semibold">Municipal Coverage</p>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">16 IMC Departments &amp; Branches</h2>
            <p className="text-xs text-gray-300 max-w-md">Our backend connects all main offices and sub-branches under a unified workflow.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <DepartmentCard img="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=400&q=80" subtitle="INDORE" titlePart1="Water Work &amp;" titlePart2="Drainage Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80" subtitle="INFRASTRUCTURE" titlePart1="Public" titlePart2="Works Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=400&q=80" subtitle="INDORE" titlePart1="Health &amp; Solid Waste" titlePart2="Sanitation Management" />
            <DepartmentCard img="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80" subtitle="PUBLIC UTILITIES" titlePart1="Electrical &amp;" titlePart2="Mechanical Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80" subtitle="EMERGENCY" titlePart1="Indore" titlePart2="Fire Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80" subtitle="IMC OFFICE" titlePart1="Taxation &amp;" titlePart2="Revenue Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=400&q=80" subtitle="DIGITAL" titlePart1="Information" titlePart2="Technology Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80" subtitle="URBAN" titlePart1="Housing &amp;" titlePart2="Environmental Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80" subtitle="SUPPLIES" titlePart1="Food &amp; Civil" titlePart2="Supplies Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80" subtitle="COMMUNITY" titlePart1="Municipal" titlePart2="Education Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80" subtitle="ADMIN" titlePart1="Law &amp; General" titlePart2="Administration Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80" subtitle="URBAN PLANNING" titlePart1="Planning &amp;" titlePart2="Rehabilitation Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" subtitle="FINANCE" titlePart1="Audits &amp;" titlePart2="Accounts Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80" subtitle="SUB BRANCH" titlePart1="Encroachment" titlePart2="Removal Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=400&q=80" subtitle="SUB BRANCH" titlePart1="Kamla Nehru" titlePart2="Zoo Department" />
            <DepartmentCard img="https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=400&q=80" subtitle="SUB BRANCH" titlePart1="Garden Department &amp;" titlePart2="Regional Park" />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════ CTA BAND */}
      <section className="relative z-20 w-full bg-white text-black py-12 px-6 md:px-12 lg:px-16">
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

