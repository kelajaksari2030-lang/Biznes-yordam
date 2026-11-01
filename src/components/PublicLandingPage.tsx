/**
 * BESTO — Premium FGENX-Inspired B2B SaaS Public Marketing Landing Page
 * 
 * Features & Polish:
 * - Reusable, resilient IntersectionObserver scroll-reveal system using cubic-bezier(0.22, 1, 0.36, 1) easing (750ms duration)
 * - Staggered entrance timing (70-110ms per adjacent element) across all sections, headings, cards, and buttons
 * - Re-entrance scroll reveal on reverse scroll with zero flicker or observer loops
 * - Nav links with animated gold underline indicators and smooth mobile drawer transitions
 * - Genuine 3D metallic object in the Hero section rendered via Three.js with mouse/touch drag rotation, smooth inertial decay, and PMREM environment reflection
 * - Dark green / near black (#0B1815 / #0D1C19) FGENX-inspired hero backdrop with vibrant gold (#F5B85C) and mint (#D7F0E5) accents
 * - Full accessibility and prefers-reduced-motion compliance
 * - Preserves all existing BESTO features, Uzbek language content, Firebase auth, Click payment plans, and routes
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Package,
  ShoppingBag,
  ReceiptText,
  Users,
  FlaskConical,
  Compass,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
  Menu,
  AlertCircle,
  BarChart3,
  Lock,
  Filter,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { PLANS } from '../config/plans';
import { useAuth } from '../context/AuthContext';

interface PublicLandingPageProps {
  onSignInClick?: () => void;
}

/**
 * 3D Metallic Interactive Hero Canvas Component
 */
const Hero3DCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Dimensions
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // PMREM Environment Reflections
    let pmremGenerator: THREE.PMREMGenerator | null = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv).texture;
    scene.environment = envTexture;
    roomEnv.dispose();
    pmremGenerator.dispose();
    pmremGenerator = null;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const goldLight = new THREE.DirectionalLight(0xF5B85C, 2.8);
    goldLight.position.set(5, 5, 4);
    scene.add(goldLight);

    const mintLight = new THREE.DirectionalLight(0x23584F, 2.2);
    mintLight.position.set(-5, -5, -2);
    scene.add(mintLight);

    const pointLight = new THREE.PointLight(0xD7F0E5, 2.5, 10);
    pointLight.position.set(0, 2, 3);
    scene.add(pointLight);

    // Main Composite Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Central Metallic Sphere
    const sphereGeo = new THREE.SphereGeometry(1.05, 64, 64);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x173B35,
      metalness: 0.92,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
    });
    const mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
    mainGroup.add(mainSphere);

    // Gold Orbital Torus Ring 1
    const torusGeo1 = new THREE.TorusGeometry(1.55, 0.045, 32, 100);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xF5B85C,
      metalness: 0.95,
      roughness: 0.12,
    });
    const torus1 = new THREE.Mesh(torusGeo1, goldMat);
    torus1.rotation.x = Math.PI / 3;
    torus1.rotation.y = Math.PI / 6;
    mainGroup.add(torus1);

    // Mint Orbital Torus Ring 2
    const torusGeo2 = new THREE.TorusGeometry(1.85, 0.03, 32, 100);
    const mintMat = new THREE.MeshStandardMaterial({
      color: 0xD7F0E5,
      metalness: 0.85,
      roughness: 0.18,
    });
    const torus2 = new THREE.Mesh(torusGeo2, mintMat);
    torus2.rotation.x = -Math.PI / 4;
    torus2.rotation.y = Math.PI / 3.5;
    mainGroup.add(torus2);

    // Orbiting Floating Elements
    const floatGroup = new THREE.Group();
    mainGroup.add(floatGroup);
    const smallGeo = new THREE.SphereGeometry(0.1, 32, 32);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.15;
      const mesh = new THREE.Mesh(smallGeo, i % 2 === 0 ? goldMat : mintMat);
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * 0.45, Math.sin(angle) * radius);
      floatGroup.add(mesh);
    }

    // Pointer Interaction Handling
    let isPointerDown = false;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;
    let velocityX = 0;
    let velocityY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      previousPointerX = e.clientX;
      previousPointerY = e.clientY;
      velocityX = 0;
      velocityY = 0;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const deltaX = e.clientX - previousPointerX;
      const deltaY = e.clientY - previousPointerY;
      previousPointerX = e.clientX;
      previousPointerY = e.clientY;

      velocityX = deltaX * 0.006;
      velocityY = deltaY * 0.006;

      targetRotationY += velocityX;
      targetRotationX += velocityY;
    };

    const handlePointerUp = () => {
      isPointerDown = false;
    };

    const domCanvas = renderer.domElement;
    domCanvas.style.touchAction = 'none'; // Keeps 3D rotation smooth while allowing page scroll outside canvas
    domCanvas.style.cursor = 'grab';

    domCanvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Animation Loop
    let animationFrameId: number;
    let isVisible = true;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      if (!isPointerDown) {
        if (!prefersReducedMotion) {
          targetRotationY += 0.0035; // Idle rotation
        }
        targetRotationY += velocityX;
        targetRotationX += velocityY;
        velocityX *= 0.94;
        velocityY *= 0.94;
      }

      // Smooth damping
      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.08;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.08;

      // Sub-rotations
      floatGroup.rotation.y += 0.008;
      torus1.rotation.z += 0.002;
      torus2.rotation.z -= 0.003;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      domCanvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      sphereGeo.dispose();
      sphereMat.dispose();
      torusGeo1.dispose();
      torusGeo2.dispose();
      goldMat.dispose();
      mintMat.dispose();
      smallGeo.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (container.contains(domCanvas)) {
        container.removeChild(domCanvas);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[460px] flex items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-[#173B35]/40 via-transparent to-transparent blur-3xl pointer-events-none"></div>
      <div ref={mountRef} className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2 right-4 text-[10px] text-[#D7F0E5]/60 font-mono flex items-center gap-1.5 pointer-events-none z-20 bg-[#0B1815]/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10">
        <RotateCcw className="w-3 h-3 text-[#F5B85C]" />
        <span>3D Interaktiv obyekt · Surib aylantiring</span>
      </div>
    </div>
  );
};

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onSignInClick }) => {
  const { signInWithGoogle, loading, authError, clearAuthError } = useAuth();

  // Modal state for direct Google Sign-In
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPlanForAuth, setSelectedPlanForAuth] = useState<string | null>(null);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interactive Product Preview Tab State
  const [previewTab, setPreviewTab] = useState<'overview' | 'inventory' | 'orders' | 'finance' | 'adlab'>('overview');

  // Interactive micro-states inside showcase tabs
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedAdAngle, setSelectedAdAngle] = useState<'discount' | 'problem' | 'social'>('discount');

  // Desktop 3D Tilt State for Showcase
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHoveringShowcase, setIsHoveringShowcase] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);

  // FAQ Accordion State (open question index)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Resilient Premium Scroll Reveal Observer Setup
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else {
            // Un-reveal when scrolled out downwards to allow smooth re-triggering on reverse scroll
            if (entry.boundingClientRect.top > 0) {
              entry.target.classList.remove('is-revealed');
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Keyboard accessibility listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAuthModalOpen) handleCloseAuth();
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, isMobileMenuOpen]);

  // Handle Desktop Mouse Move for subtle showcase tilt
  const handleMouseMoveShowcase = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 1024) {
      return;
    }
    const rect = showcaseRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -2.5;
    const rotateY = ((x - centerX) / centerX) * 2.5;

    setTilt({ x: rotateX, y: rotateY });
    setIsHoveringShowcase(true);
  };

  const handleMouseLeaveShowcase = () => {
    setTilt({ x: 0, y: 0 });
    setIsHoveringShowcase(false);
  };

  const handleOpenAuth = (planId?: string) => {
    setSelectedPlanForAuth(planId || null);
    setIsAuthModalOpen(true);
    if (onSignInClick) onSignInClick();
  };

  const handleCloseAuth = () => {
    setIsAuthModalOpen(false);
    setSelectedPlanForAuth(null);
    if (clearAuthError) clearAuthError();
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Handled in AuthContext and presented via modal state
    }
  };

  const faqItems = [
    {
      q: "BESTO dasturidan foydalanish uchun to‘lov qilish shartmi?",
      a: "Yo‘q. Har bir yangi foydalanuvchi tizimga kirganda Bepul (Free) tarif avtomatik faollashadi. Bepul tarifda tovarlar ombori, savdo buyurtmalari, foyda kalkulyatori va kunlik 5 ta reklama matni cheklovsiz muddatga bepul beriladi."
    },
    {
      q: "Pro yoki Ultra tariflariga qanday to‘lov qilinadi?",
      a: "To‘lovlar O‘zbekistondagi rasmiy Click to‘lov shlyuzi orqali milliy valyuta (so‘m)da amalga oshiriladi. To‘lov tasdiqlangach, tarifingiz va kvotalaringiz server darajasida darhol avtomatlashtirilgan tarzda faollashadi."
    },
    {
      q: "Mening biznes ma’lumotlarim xavfsiz saqlanadimi?",
      a: "Albatta. BESTO Google Cloud va Firebase Enterprise infratuzilmasida ishlaydi. Har bir foydalanuvchi ma’lumotlari (tovarlar, buyurtmalar, kassa) Firestore xavfsizlik qoidalari bilan qat’iy ajratilgan va begona foydalanuvchilar kirishi texnik jihatdan imkonsiz."
    },
    {
      q: "Mavjud tovarlar ro‘yxatini Excel yoki CSV orqali yuklash mumkinmi?",
      a: "Ha. Ombor modulida qulay CSV import imkoniyati mavjud. Siz namunaviy shablonni yuklab olib, o‘z tovarlaringiz nomi, narxi, qoldig‘i va SKU kodlarini bir lahzada tizimga kiritishingiz mumkin."
    },
    {
      q: "Tarkibli mahsulotlar (retsept / BOM) qanday ishlaydi?",
      a: "Agar siz kiyim tikuvchi, qandolatchi yoki ishlab chiqaruvchi bo‘lsangiz, tayyor mahsulotga retsept biriktirasiz. Savdo buyurtmasi tasdiqlanganda, tayyor mahsulotga sarflanadigan barcha xomashyolar ombordan avtomatik yechiladi."
    },
    {
      q: "Smartfon va planshetlarda ishlash qulaymi?",
      a: "Ha. BESTO barcha zamonaviy mobil ekranlar (iPhone, Android) va planshetlarga to‘liq moslashtirilgan. Do‘konda yoki yo‘lda bo‘lsangiz ham buyurtmalarni kiritish va omborni tekshirish juda qulay."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#112521] font-sans antialiased selection:bg-[#D7F0E5] selection:text-[#173B35]">
      {/* 1. DARK STYLED FGENX HEADER */}
      <header className="sticky top-0 z-40 bg-[#0B1815]/95 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#home"
            className="flex items-center gap-2.5 text-white font-extrabold text-xl tracking-tight whitespace-nowrap shrink-0 group focus-visible:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#173B35] border border-[#23584F] flex items-center justify-center text-[#F5B85C] font-black text-sm shadow-2xs group-hover:bg-[#112521] transition-colors font-serif">
              B
            </div>
            <div className="leading-none">
              <span className="font-extrabold text-white text-lg tracking-tight">BES<span className="text-[#F5B85C]">TO</span></span>
              <span className="block text-[9px] font-bold text-[#D7F0E5]/70 tracking-wider uppercase mt-0.5">Boshqaruv Tizimi</span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs sm:text-sm font-semibold text-[#D7F0E5]/80">
            <a href="#capabilities" className="nav-link-animated hover:text-white transition-colors whitespace-nowrap">
              Imkoniyatlar
            </a>
            <a href="#modules" className="nav-link-animated hover:text-white transition-colors whitespace-nowrap">
              Modullar
            </a>
            <a href="#how-it-works" className="nav-link-animated hover:text-white transition-colors whitespace-nowrap">
              Qanday ishlaydi
            </a>
            <a href="#pricing" className="nav-link-animated hover:text-white transition-colors whitespace-nowrap">
              Tariflar
            </a>
            <a href="#faq" className="nav-link-animated hover:text-white transition-colors whitespace-nowrap">
              Savol-javob
            </a>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAuth()}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#F5B85C] hover:bg-[#E2A448] text-[#112521] text-xs sm:text-sm font-bold shadow-2xs transition-all btn-tactile whitespace-nowrap cursor-pointer min-h-[40px] flex items-center gap-2"
            >
              <span>Tizimga kirish</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#112521] hidden xs:inline" />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10 border border-white/10 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Menyu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0B1815] border-b border-white/10 px-4 py-4 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <a
              href="#capabilities"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D7F0E5] hover:bg-white/10 transition-colors"
            >
              Imkoniyatlar
            </a>
            <a
              href="#modules"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D7F0E5] hover:bg-white/10 transition-colors"
            >
              Modullar
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D7F0E5] hover:bg-white/10 transition-colors"
            >
              Qanday ishlaydi
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D7F0E5] hover:bg-white/10 transition-colors"
            >
              Tariflar
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#D7F0E5] hover:bg-white/10 transition-colors"
            >
              Savol-javob
            </a>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WITH 3D INTERACTIVE CANVAS */}
      <section id="home" className="relative bg-[#0B1815] text-white pt-8 sm:pt-14 pb-16 sm:pb-24 px-3.5 sm:px-6 lg:px-8 border-b border-white/10 overflow-hidden">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#173B3515_1px,transparent_1px),linear-gradient(to_bottom,#173B3515_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Hero Text Content */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            {/* Badge */}
            <div
              className="scroll-reveal inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#173B35] text-[#D7F0E5] border border-[#23584F] shadow-2xs"
              style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5B85C] shrink-0" />
              <span>O‘zbekiston kichik biznesi uchun aqlli boshqaruv tizimi</span>
            </div>

            {/* Headline */}
            <h1
              className="scroll-reveal text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12] text-balance"
              style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
            >
              Biznesingizni boshqaring.{' '}
              <span className="text-[#F5B85C] block sm:inline">O‘sishni oldindan ko‘ring.</span>
            </h1>

            {/* Subtitle */}
            <p
              className="scroll-reveal text-xs sm:text-base text-[#D7F0E5]/80 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium"
              style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
            >
              Ombor qoldiqlari, retsept bo‘yicha xomashyo hisobi, tezkor savdo buyurtmalari, CRM mijozlar bazasi va kassa oqimi tahlili — ortiqcha murakkabliklarsiz, bitta qulay platformada.
            </p>

            {/* Dual CTAs */}
            <div
              className="scroll-reveal flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2"
              style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => handleOpenAuth()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#F5B85C] hover:bg-[#E2A448] text-[#112521] text-xs sm:text-sm font-extrabold shadow-card transition-all btn-tactile flex items-center justify-center gap-2.5 cursor-pointer min-h-[44px]"
              >
                <span>Bepul boshlash</span>
                <ArrowRight className="w-4 h-4 text-[#112521]" />
              </button>

              <a
                href="#capabilities"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#173B35] hover:bg-[#112521] border border-[#23584F] text-[#D7F0E5] text-xs sm:text-sm font-bold shadow-subtle transition-all btn-tactile flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Imkoniyatlarni ko‘rish</span>
              </a>
            </div>

            {/* Trust points */}
            <div
              className="scroll-reveal flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[11px] sm:text-xs text-[#D7F0E5]/70 pt-2"
              style={{ '--reveal-delay': '320ms' } as React.CSSProperties}
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#F5B85C] shrink-0" />
                <span>Kredit karta talab qilinmaydi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#F5B85C] shrink-0" />
                <span>Google hisob bilan 10 soniyada kirish</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#F5B85C] shrink-0" />
                <span>Cheksiz bepul asosiy tarif</span>
              </div>
            </div>
          </div>

          {/* Right Hero Interactive 3D Object */}
          <div
            className="scroll-reveal-scale lg:col-span-5 flex justify-center"
            style={{ '--reveal-delay': '150ms' } as React.CSSProperties}
          >
            <Hero3DCanvas />
          </div>
        </div>
      </section>

      {/* 3. ANIMATED, INTERACTIVE macOS-STYLE PRODUCT SHOWCASE */}
      <section id="capabilities" className="scroll-mt-24 py-10 sm:py-16 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          ref={showcaseRef}
          onMouseMove={handleMouseMoveShowcase}
          onMouseLeave={handleMouseLeaveShowcase}
          style={{
            transform: isHoveringShowcase
              ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            transition: isHoveringShowcase
              ? 'transform 0.15s ease-out, box-shadow 0.25s ease-out'
              : 'transform 0.5s ease-out, box-shadow 0.25s ease-out',
          }}
          className="scroll-reveal-scale bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-hover overflow-hidden transition-all duration-300"
        >
          {/* macOS Browser Bar */}
          <div className="bg-[#F6F8F7] border-b border-[#E0ECE8] px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>

            <div className="bg-white border border-[#E0ECE8] rounded-lg px-3 py-1 text-[11px] text-[#52796F] font-mono flex items-center gap-1.5 max-w-xs w-full justify-center shadow-2xs">
              <Lock className="w-3 h-3 text-[#10B981]" />
              <span className="truncate">app.besto.uz/dashboard</span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded font-bold bg-[#D7F0E5] text-[#173B35] border border-[#B5E2D1] hidden sm:inline-flex items-center gap-1 text-[10px]">
                <Sparkles className="w-3 h-3 text-[#173B35]" /> Namunaviy demo
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            </div>
          </div>

          {/* Interactive Showcase Header & Tabs */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="scroll-reveal flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#E0ECE8] gap-3">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-[#173B35] uppercase tracking-wider block">
                  Interaktiv do‘kon ish maydoni
                </span>
                <h3 className="text-sm sm:text-lg font-extrabold text-[#112521] mt-0.5">
                  BESTO Boshqaruv Markazi va Modullari
                </h3>
              </div>

              {/* Accessible Interactive Segmented Control */}
              <div
                role="tablist"
                aria-label="BESTO Modullar ro‘yxati"
                className="flex items-center p-1 bg-[#F6F8F7] border border-[#E0ECE8] rounded-xl overflow-x-auto no-scrollbar scrollbar-thin max-w-full"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-overview"
                  aria-selected={previewTab === 'overview'}
                  aria-controls="panel-overview"
                  onClick={() => setPreviewTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    previewTab === 'overview'
                      ? 'bg-[#173B35] text-white shadow-2xs'
                      : 'text-[#52796F] hover:text-[#112521] hover:bg-white/60'
                  }`}
                >
                  Boshqaruv paneli
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-inventory"
                  aria-selected={previewTab === 'inventory'}
                  aria-controls="panel-inventory"
                  onClick={() => setPreviewTab('inventory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    previewTab === 'inventory'
                      ? 'bg-[#173B35] text-white shadow-2xs'
                      : 'text-[#52796F] hover:text-[#112521] hover:bg-white/60'
                  }`}
                >
                  Ombor & Retsept (BOM)
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-orders"
                  aria-selected={previewTab === 'orders'}
                  aria-controls="panel-orders"
                  onClick={() => setPreviewTab('orders')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    previewTab === 'orders'
                      ? 'bg-[#173B35] text-white shadow-2xs'
                      : 'text-[#52796F] hover:text-[#112521] hover:bg-white/60'
                  }`}
                >
                  Savdo & POS
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-finance"
                  aria-selected={previewTab === 'finance'}
                  aria-controls="panel-finance"
                  onClick={() => setPreviewTab('finance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    previewTab === 'finance'
                      ? 'bg-[#173B35] text-white shadow-2xs'
                      : 'text-[#52796F] hover:text-[#112521] hover:bg-white/60'
                  }`}
                >
                  Moliya & Kassa
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-adlab"
                  aria-selected={previewTab === 'adlab'}
                  aria-controls="panel-adlab"
                  onClick={() => setPreviewTab('adlab')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    previewTab === 'adlab'
                      ? 'bg-[#173B35] text-white shadow-2xs'
                      : 'text-[#52796F] hover:text-[#112521] hover:bg-white/60'
                  }`}
                >
                  Reklama Lab & AI
                </button>
              </div>
            </div>

            {/* Showcase Tab 1: Overview Dashboard */}
            {previewTab === 'overview' && (
              <div
                id="panel-overview"
                role="tabpanel"
                aria-labelledby="tab-overview"
                className="space-y-4 animate-tab-slide"
              >
                {/* 4 Responsive KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  <div
                    className="scroll-reveal p-3 sm:p-4 bg-[#F6F8F7] border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl flex flex-col justify-between transition-all hover:shadow-subtle hover:-translate-y-0.5"
                    style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#52796F]">
                      <span className="truncate">Ombor qoldig‘i</span>
                      <Package className="w-4 h-4 text-[#173B35] shrink-0" />
                    </div>
                    <div className="text-base sm:text-2xl font-black font-mono text-[#112521] mt-1.5 tabular-nums">
                      48 <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">xil tovar</span>
                    </div>
                    <div className="mt-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block w-fit">
                      3 ta tugamoqda
                    </div>
                  </div>

                  <div
                    className="scroll-reveal p-3 sm:p-4 bg-[#F6F8F7] border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl flex flex-col justify-between transition-all hover:shadow-subtle hover:-translate-y-0.5"
                    style={{ '--reveal-delay': '60ms' } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#52796F]">
                      <span className="truncate">Savdo buyurtmalari</span>
                      <ShoppingBag className="w-4 h-4 text-[#173B35] shrink-0" />
                    </div>
                    <div className="text-base sm:text-2xl font-black font-mono text-[#112521] mt-1.5 tabular-nums">
                      14 <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">ta bugun</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#173B35] font-bold font-mono tabular-nums">
                      4 820 000 so‘m
                    </div>
                  </div>

                  <div
                    className="scroll-reveal p-3 sm:p-4 bg-[#F6F8F7] border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl flex flex-col justify-between transition-all hover:shadow-subtle hover:-translate-y-0.5"
                    style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#52796F]">
                      <span className="truncate">Nasiya / Kutilmoqda</span>
                      <Receipt className="w-4 h-4 text-[#173B35] shrink-0" />
                    </div>
                    <div className="text-base sm:text-2xl font-black font-mono text-[#112521] mt-1.5 tabular-nums">
                      1 250 000 <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">so‘m</span>
                    </div>
                    <div className="mt-1 text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block w-fit">
                      2 ta nasiya
                    </div>
                  </div>

                  <div
                    className="scroll-reveal p-3 sm:p-4 bg-[#F6F8F7] border border-[#E0ECE8] hover:border-[#173B35]/40 rounded-2xl flex flex-col justify-between transition-all hover:shadow-subtle hover:-translate-y-0.5"
                    style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#52796F]">
                      <span className="truncate">Mijozlar bazasi</span>
                      <Users className="w-4 h-4 text-[#173B35] shrink-0" />
                    </div>
                    <div className="text-base sm:text-2xl font-black font-mono text-[#112521] mt-1.5 tabular-nums">
                      120 <span className="text-[10px] sm:text-xs font-sans font-medium text-[#52796F] block sm:inline">ta kontakt</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#52796F]">
                      Telegram & doimiy
                    </div>
                  </div>
                </div>

                {/* Animated Chart & Breakdown Bar */}
                <div className="p-3.5 sm:p-5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#173B35]">
                      <BarChart3 className="w-4 h-4 text-[#F5B85C]" />
                      <span>Kassa Tushumi va Sof Foyda Dinamikasi</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] hidden xs:flex">
                      <span className="flex items-center gap-1 text-[#10B981] font-bold"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Tushum</span>
                      <span className="flex items-center gap-1 text-[#F5B85C] font-bold"><span className="w-2 h-2 rounded-full bg-[#F5B85C]"></span> Sof foyda</span>
                    </div>
                  </div>

                  {/* SVG Chart curve with animated path drawing */}
                  <div className="h-28 sm:h-36 w-full pt-1">
                    <svg viewBox="0 0 600 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <line x1="0" y1="30" x2="600" y2="30" stroke="#E0ECE8" strokeDasharray="3 3" />
                      <line x1="0" y1="70" x2="600" y2="70" stroke="#E0ECE8" strokeDasharray="3 3" />
                      <path d="M 0,90 Q 150,70 300,45 T 600,15 L 600,120 L 0,120 Z" fill="#10B981" fillOpacity="0.12" />
                      <path d="M 0,90 Q 150,70 300,45 T 600,15" fill="none" stroke="#10B981" strokeWidth="2.5" className="animate-svg-draw" />
                      <path d="M 0,105 Q 150,85 300,65 T 600,35" fill="none" stroke="#F5B85C" strokeWidth="2" className="animate-svg-draw" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs pt-2 border-t border-[#E0ECE8]">
                    <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#E0ECE8]">
                      <span className="text-[#52796F] block truncate">Jami tushum:</span>
                      <span className="font-bold font-mono text-[#112521] block tabular-nums">38 400 000 so‘m</span>
                    </div>
                    <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#E0ECE8]">
                      <span className="text-[#52796F] block truncate">Taxminiy sof foyda:</span>
                      <span className="font-bold font-mono text-emerald-800 block tabular-nums">14 400 000 so‘m</span>
                    </div>
                    <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#E0ECE8]">
                      <span className="text-[#52796F] block truncate">Tannarx (COGS):</span>
                      <span className="font-bold font-mono text-[#52796F] block tabular-nums">19 200 000 so‘m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Showcase Tab 2: Inventory & BOM */}
            {previewTab === 'inventory' && (
              <div
                id="panel-inventory"
                role="tabpanel"
                aria-labelledby="tab-inventory"
                className="space-y-3.5 animate-tab-slide"
              >
                {/* Interactive Filter Bar */}
                <div className="flex items-center justify-between gap-2 p-2 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] text-xs">
                  <div className="flex items-center gap-1.5 text-[#173B35] font-bold">
                    <Filter className="w-3.5 h-3.5 text-[#173B35]" />
                    <span>Filtrlash:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        inventoryFilter === 'all'
                          ? 'bg-[#173B35] text-white shadow-2xs'
                          : 'bg-white text-[#52796F] border border-[#E0ECE8]'
                      }`}
                    >
                      Barchasi (48)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('low')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        inventoryFilter === 'low'
                          ? 'bg-amber-700 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      ⚠️ Kam qolganlar (3)
                    </button>
                  </div>
                </div>

                <div className="border border-[#E0ECE8] rounded-2xl overflow-hidden bg-white">
                  <div className="px-4 py-2.5 bg-[#F6F8F7] border-b border-[#E0ECE8] flex items-center justify-between text-xs font-bold text-[#173B35]">
                    <span>Ombordagi tovarlar katalogi</span>
                    <span className="text-[11px] text-[#52796F] font-normal">Retsept (BOM) integratsiyalangan</span>
                  </div>
                  <div className="divide-y divide-[#E0ECE8] text-xs">
                    {inventoryFilter !== 'low' && (
                      <div className="p-3 flex items-center justify-between gap-3 hover:bg-[#F6F8F7] transition-colors">
                        <div>
                          <div className="font-bold text-[#112521]">Klassik charm tufli (Qora, 42)</div>
                          <div className="text-[10px] text-[#52796F]">SKU: SHOE-BLK-42 · Retseptli mahsulot (0.4m Charm + 1p Taglik)</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-[#112521]">22 dona</div>
                          <div className="text-[10px] text-emerald-700 font-medium">Sotuv: 380 000 so‘m</div>
                        </div>
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between gap-3 bg-amber-50/50 hover:bg-amber-50/80 transition-colors">
                      <div>
                        <div className="font-bold text-[#112521]">Tabiiy charm xomashyosi (Jigarrang)</div>
                        <div className="text-[10px] text-amber-800 font-medium">⚠️ Qoldiq kam: 4 metr (Min limit: 10m)</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-amber-900">4 metr</div>
                        <div className="text-[10px] text-[#52796F]">Tannarx: 95 000 so‘m/m</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipe / BOM Explanation Box */}
                <div className="p-3.5 bg-[#D7F0E5]/50 border border-[#B5E2D1] rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-[#173B35] block">Tarkibli mahsulotlar (BOM) retsept hisobi:</span>
                  <p className="text-[#2C4C45] leading-relaxed">
                    1 ta charm tufli sotilganda: ombordan 0.4 metr charm va 1 juft taglik avtomatik ravishda yechiladi va COGS tannarxi aniq hisoblanadi.
                  </p>
                </div>
              </div>
            )}

            {/* Showcase Tab 3: Orders & POS */}
            {previewTab === 'orders' && (
              <div
                id="panel-orders"
                role="tabpanel"
                aria-labelledby="tab-orders"
                className="space-y-3.5 animate-tab-slide"
              >
                {/* Filter for Orders */}
                <div className="flex items-center justify-between gap-2 p-2 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] text-xs">
                  <span className="font-bold text-[#173B35]">Buyurtma to‘lov holati:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilter === 'all' ? 'bg-[#173B35] text-white shadow-2xs' : 'bg-white text-[#52796F] border border-[#E0ECE8]'
                      }`}
                    >
                      Barchasi
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter('paid')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilter === 'paid' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      To‘langan
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter('unpaid')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilter === 'unpaid' ? 'bg-amber-700 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Nasiya
                    </button>
                  </div>
                </div>

                <div className="border border-[#E0ECE8] rounded-2xl overflow-hidden bg-white divide-y divide-[#E0ECE8] text-xs">
                  {(orderFilter === 'all' || orderFilter === 'paid') && (
                    <div className="p-3 flex items-center justify-between hover:bg-[#F6F8F7] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#D7F0E5] text-[#173B35] flex items-center justify-center font-bold text-xs shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-[#112521]">Akmal Rahimov <span className="text-[10px] text-[#52796F] font-mono">#ORD-1082</span></div>
                          <div className="text-[10px] text-[#52796F]">2 xil tovar · Bugun 14:20</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-[#112521]">760 000 so‘m</div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">To‘langan</span>
                      </div>
                    </div>
                  )}

                  {(orderFilter === 'all' || orderFilter === 'unpaid') && (
                    <div className="p-3 flex items-center justify-between hover:bg-amber-50/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-[#112521]">Jamshid Karimov <span className="text-[10px] text-[#52796F] font-mono">#ORD-1081</span></div>
                          <div className="text-[10px] text-[#52796F]">1 xil tovar · Bugun 12:05</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-[#112521]">380 000 so‘m</div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Nasiya</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Showcase Tab 4: Finance & Kassa */}
            {previewTab === 'finance' && (
              <div
                id="panel-finance"
                role="tabpanel"
                aria-labelledby="tab-finance"
                className="space-y-3.5 animate-tab-slide"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl space-y-1">
                    <span className="text-[#52796F] block">Kassa tushumi:</span>
                    <span className="text-base font-black font-mono text-[#112521] block tabular-nums">38 400 000 so‘m</span>
                  </div>
                  <div className="p-3.5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl space-y-1">
                    <span className="text-[#52796F] block">Sotilgan COGS:</span>
                    <span className="text-base font-black font-mono text-[#52796F] block tabular-nums">19 200 000 so‘m</span>
                  </div>
                  <div className="p-3.5 bg-[#D7F0E5] border border-[#B5E2D1] rounded-2xl space-y-1">
                    <span className="text-[#173B35] font-bold block">Taxminiy sof foyda:</span>
                    <span className="text-base font-black font-mono text-[#173B35] block tabular-nums">14 400 000 so‘m</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-[#E0ECE8] rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#112521]">
                    <span>Kassa xarajatlari sarflanishi:</span>
                    <span className="text-emerald-700">38% Marja</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E0ECE8] rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#10B981]" style={{ width: '50%' }} title="COGS 50%"></div>
                    <div className="h-full bg-rose-400" style={{ width: '12%' }} title="Xarajatlar 12%"></div>
                    <div className="h-full bg-[#F5B85C]" style={{ width: '38%' }} title="Sof foyda 38%"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Showcase Tab 5: Ad Lab */}
            {previewTab === 'adlab' && (
              <div
                id="panel-adlab"
                role="tabpanel"
                aria-labelledby="tab-adlab"
                className="space-y-3.5 animate-tab-slide"
              >
                {/* Interactive Angle Switcher */}
                <div className="flex items-center justify-between gap-2 p-2 bg-[#F6F8F7] rounded-xl border border-[#E0ECE8] text-xs">
                  <span className="font-bold text-[#173B35] hidden xs:inline">A/B Reklama psixologiyasi:</span>
                  <div className="flex items-center gap-1 w-full xs:w-auto justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedAdAngle('discount')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedAdAngle === 'discount' ? 'bg-[#173B35] text-white shadow-2xs' : 'bg-white text-[#52796F] border border-[#E0ECE8]'
                      }`}
                    >
                      1. Aksiya
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAdAngle('problem')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedAdAngle === 'problem' ? 'bg-[#173B35] text-white shadow-2xs' : 'bg-white text-[#52796F] border border-[#E0ECE8]'
                      }`}
                    >
                      2. Muammo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAdAngle('social')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedAdAngle === 'social' ? 'bg-[#173B35] text-white shadow-2xs' : 'bg-white text-[#52796F] border border-[#E0ECE8]'
                      }`}
                    >
                      3. Isbot
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#E0ECE8] rounded-2xl text-xs space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-2">
                    <span className="font-bold text-[#173B35]">
                      {selectedAdAngle === 'discount' && '1-variant: Aksiya va shoshilinch cheklangan taklif'}
                      {selectedAdAngle === 'problem' && '2-variant: Mijoz muammosi va amaliy yechim'}
                      {selectedAdAngle === 'social' && '3-variant: Ijtimoiy isbot va xaridorlar tavsiyasi'}
                    </span>
                    <span className="text-[10px] text-[#52796F]">Telegram post formati</span>
                  </div>

                  <p className="text-[#112521] leading-relaxed font-sans font-medium whitespace-pre-line">
                    {selectedAdAngle === 'discount' &&
                      "🔥 Faqat 3 kun! Klassik tabiiy charm tuflilarga 20% maxsus chegirma e’lon qilamiz.\n\n✨ Sifatli charm, qulay qolip va barcha o‘lchamlar omborda mavjud. Toshkent bo‘ylab bepul yetkazib berish!"}
                    {selectedAdAngle === 'problem' &&
                      "👟 Kun bo‘yi oyoq og‘rig‘i va noqulay poyabzaldan charchadingizmi?\n\nBizning tabiiy charmdan tayyorlangan ortopedik qolipli tuflilarimiz bilan kun bo‘yi yengillikni his qiling. Bugun buyurtma bering!"}
                    {selectedAdAngle === 'social' &&
                      "⭐ 500 dan ortiq doimiy xaridorlarimiz tomonidan eng yuqori baholangan klassik tufli modeli!\n\nHaqiqiy charm va chidamli choklar. Mijozlarimiz fikrlari bilan kanalda tanishing."}
                  </p>

                  <div className="pt-2 border-t border-[#E0ECE8] flex items-center justify-between text-[11px] text-[#52796F]">
                    <span>AI matn generatori tayyorladi</span>
                    <span className="text-[#173B35] font-bold">Nusxalash va Telegramga joylash →</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. REAL BUSINESS MODULES (Bento Grid with Scroll Reveals & Stagger) */}
      <section id="modules" className="scroll-mt-24 py-14 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E0ECE8]">
        <div className="max-w-2xl mb-10 space-y-2">
          <span className="scroll-reveal text-xs font-bold text-[#173B35] uppercase tracking-wider block" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
            Asosiy modullar
          </span>
          <h2 className="scroll-reveal text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#112521]" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
            Kundalik savdo va boshqaruv uchun to‘liq asboblar
          </h2>
          <p className="scroll-reveal text-xs sm:text-base text-[#2C4C45]" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
            Har bir modul kichik biznesning haqiqiy ehtiyojlaridan kelib chiqib, bir-biri bilan uzluksiz integratsiyalashgan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Ombor & Retsept */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">Ombor & Xomashyo (BOM)</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Tovarlar qoldig‘ini nazorat qiling, xarid va sotuv narxlarini belgilang. Tayyor tovarlar uchun xomashyo retseptini biriktiring va kam qolgan tovarlar bo‘yicha ogohlantirish oling.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>CSV ommaviy import</span>
              <span>Retsept xomashyosi</span>
            </div>
          </div>

          {/* Card 2: Savdo & POS */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">Savdo Buyurtmalari</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Mijoz buyurtmalarini tezkor shakllantiring. Naqd, karta yoki nasiya to‘lov holatlarini kuzating. Buyurtma tasdiqlanganda tovarlar ombordan avtomatik kamayadi.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>Tezkor POS kassa</span>
              <span>Nasiya nazorati</span>
            </div>
          </div>

          {/* Card 3: Moliya & Xarajatlar */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <ReceiptText className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">Moliya & Kassa Tahlili</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Real qabul qilingan tushum, tovarlar tannarxi (COGS), ijara, ish haqi va marketing xarajatlarini hisoblang. Sof foyda va marjangizni doimiy nazorat qiling.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>COGS hisobi</span>
              <span>Sof foyda marjasi</span>
            </div>
          </div>

          {/* Card 4: CRM Mijozlar */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">Mijozlar Bazasi (CRM)</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Xaridorlarning telefon raqami, Telegram profili va buyurtmalar tarixini tartibga soling. Doimiy mijozlarni aniqlang va ularga maxsus takliflar yuboring.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>Telegram profillar</span>
              <span>Xaridlar tarixi</span>
            </div>
          </div>

          {/* Card 5: Reklama Lab & AI */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '320ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">Reklama Laboratoriyasi</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Telegram va Instagram kanallari uchun sotuvchi reklama matnlarini yarating. 3 ta turli xil psixologik yondashuvni A/B sinovdan o‘tkazing va eng yaxshisini tanlang.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>3 ta A/B strategiya</span>
              <span>Post qoralamalari</span>
            </div>
          </div>

          {/* Card 6: Bugun nima qilay? */}
          <div
            className="scroll-reveal card-hover-effect p-5 sm:p-6 bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl shadow-subtle space-y-3.5 flex flex-col justify-between hover:border-[#173B35]/40 transition-all group cursor-default"
            style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D7F0E5] text-[#173B35] flex items-center justify-center group-hover:bg-[#173B35] group-hover:text-[#F5B85C] transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#112521]">“Bugun nima qilay?” Navigatori</h3>
              <p className="text-xs sm:text-sm text-[#52796F] leading-relaxed">
                Har kuni ertalab eng muhim 1 ta fokus vazifani tanlang va 0 so‘mlik byudjet bilan mijoz jalb qilish amaliy harakatlar rejasini oling.
              </p>
            </div>
            <div className="pt-3 border-t border-[#E0ECE8] text-xs font-bold text-[#173B35] flex items-center justify-between">
              <span>0 so‘mlik marketing</span>
              <span>Kunlik fokus</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (QANDAY ISHLAYDI?) */}
      <section id="how-it-works" className="scroll-mt-24 py-14 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E0ECE8]">
        <div className="scroll-reveal-scale bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl p-6 sm:p-12 shadow-subtle space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="scroll-reveal text-xs font-bold text-[#173B35] uppercase tracking-wider block" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
              Ishga tushirish bosqichlari
            </span>
            <h2 className="scroll-reveal text-xl sm:text-3xl font-black text-[#112521]" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
              3 oddiy qadamda ish boshlang
            </h2>
            <p className="scroll-reveal text-xs sm:text-sm text-[#52796F]" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
              Murakkab texnik sozlashlar yoki oylar davomida o‘rganish shart emas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div
              className="scroll-reveal card-hover-effect space-y-3 p-5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl relative"
              style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
            >
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#173B35]">01.</div>
              <h4 className="text-sm sm:text-base font-bold text-[#112521]">Google hisobingiz orqali kiring</h4>
              <p className="text-xs text-[#52796F] leading-relaxed">
                Hech qanday parollar eslab qolish shart emas. Bitta tugma orqali xavfsiz Google akkauntingiz bilan 10 soniyada tizimga kiring.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="scroll-reveal card-hover-effect space-y-3 p-5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl relative"
              style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
            >
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#173B35]">02.</div>
              <h4 className="text-sm sm:text-base font-bold text-[#112521]">Tovarlarni kiriting yoki CSV yuklang</h4>
              <p className="text-xs text-[#52796F] leading-relaxed">
                Mahsulotlaringiz xarid va sotuv narxlarini qo‘lda kiriting yoki tayyor Excel/CSV faylingizni bir lahzada import qiling.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="scroll-reveal card-hover-effect space-y-3 p-5 bg-[#F6F8F7] border border-[#E0ECE8] rounded-2xl relative"
              style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
            >
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#173B35]">03.</div>
              <h4 className="text-sm sm:text-base font-bold text-[#112521]">Savdo qiling va kassa foydasini ko‘ring</h4>
              <p className="text-xs text-[#52796F] leading-relaxed">
                Buyurtmalarni belgilang, xomashyo va tovarlar hisobini avtomatik yuritib, har bir so‘m sof daromadingizni aniq kuzating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT PRICING MATRIX */}
      <section id="pricing" className="scroll-mt-24 py-14 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E0ECE8]">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="scroll-reveal text-xs font-bold text-[#173B35] uppercase tracking-wider block" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
            Shaffof tariflar
          </span>
          <h2 className="scroll-reveal text-xl sm:text-3xl font-black text-[#112521]" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
            Yashirin to‘lovlarsiz, qulay shartlar
          </h2>
          <p className="scroll-reveal text-xs sm:text-sm text-[#52796F]" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
            Kichik sinovdan tortib yirik savdo tarmog‘igacha moslashtirilgan rasmiy tariflar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* FREE PLAN */}
          <div
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-subtle flex flex-col justify-between space-y-6"
            style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#173B35]">{PLANS.free.name}</span>
                <span className="text-xs font-medium text-[#52796F] bg-[#F6F8F7] px-2.5 py-0.5 rounded-full border border-[#E0ECE8]">
                  {PLANS.free.badge}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-[#112521] font-mono">
                  {PLANS.free.priceLabel}
                </div>
                <p className="text-xs text-[#52796F] leading-relaxed">
                  {PLANS.free.description}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E0ECE8] text-xs text-[#2C4C45]">
                {PLANS.free.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAuth('free')}
              className="w-full py-3 rounded-xl bg-[#F6F8F7] hover:bg-[#E0ECE8] text-[#173B35] text-xs sm:text-sm font-bold border border-[#E0ECE8] transition-all btn-tactile cursor-pointer min-h-[40px]"
            >
              Bepul boshlash
            </button>
          </div>

          {/* PRO PLAN (HIGHLIGHTED) */}
          <div
            className="scroll-reveal card-hover-effect bg-white border-2 border-[#173B35] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-card flex flex-col justify-between space-y-6 relative"
            style={{ '--reveal-delay': '100ms' } as React.CSSProperties}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#173B35]">{PLANS.pro.name}</span>
                <span className="text-xs font-bold text-[#173B35] bg-[#D7F0E5] px-2.5 py-0.5 rounded-full border border-[#B5E2D1]">
                  {PLANS.pro.badge}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-[#173B35] font-mono tabular-nums">
                  {PLANS.pro.priceLabel}
                </div>
                <p className="text-xs text-[#2C4C45] leading-relaxed">
                  {PLANS.pro.description}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E0ECE8] text-xs text-[#2C4C45]">
                {PLANS.pro.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
                    <span className="font-semibold text-[#112521]">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAuth('pro')}
              className="w-full py-3 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs sm:text-sm font-bold shadow-xs transition-all btn-tactile cursor-pointer min-h-[40px]"
            >
              Pro tarifiga ulanish
            </button>
          </div>

          {/* ULTRA PLAN */}
          <div
            className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-subtle flex flex-col justify-between space-y-6"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#173B35]">{PLANS.ultra.name}</span>
                <span className="text-xs font-medium text-[#2C4C45] bg-[#F6F8F7] px-2.5 py-0.5 rounded-full border border-[#E0ECE8]">
                  {PLANS.ultra.badge}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-[#112521] font-mono tabular-nums">
                  {PLANS.ultra.priceLabel}
                </div>
                <p className="text-xs text-[#52796F] leading-relaxed">
                  {PLANS.ultra.description}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E0ECE8] text-xs text-[#2C4C45]">
                {PLANS.ultra.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 font-bold text-[#173B35] pt-1">
                  <Check className="w-4 h-4 text-[#173B35] shrink-0 mt-0.5" />
                  <span>Ultra: Aqlli Biznes Prognozi (savdo, ombor, kassa)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAuth('ultra')}
              className="w-full py-3 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs sm:text-sm font-bold shadow-xs transition-all btn-tactile cursor-pointer min-h-[40px]"
            >
              Ultra tarifiga ulanish
            </button>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ Accordion) */}
      <section id="faq" className="scroll-mt-24 py-14 sm:py-20 px-3.5 sm:px-6 lg:px-8 max-w-3xl mx-auto border-t border-[#E0ECE8]">
        <div className="text-center mb-8 space-y-2">
          <span className="scroll-reveal text-xs font-bold text-[#173B35] uppercase tracking-wider block" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
            Savol-javoblar
          </span>
          <h2 className="scroll-reveal text-xl sm:text-3xl font-black text-[#112521]" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
            Eng ko‘p beriladigan savollar
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="scroll-reveal card-hover-effect bg-white border border-[#E0ECE8] rounded-2xl overflow-hidden transition-all shadow-subtle"
                style={{ '--reveal-delay': `${index * 70}ms` } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-[#112521] flex items-center justify-between gap-3 cursor-pointer min-h-[44px]"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#173B35] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#52796F] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-[#2C4C45] leading-relaxed border-t border-[#E0ECE8] pt-3 animate-tab-slide">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FINAL DECISION BLOCK (CTA) */}
      <section className="py-12 sm:py-16 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="scroll-reveal-scale bg-[#173B35] text-white rounded-2xl sm:rounded-3xl p-7 sm:p-12 text-center space-y-5 shadow-card">
          <h2 className="scroll-reveal text-xl sm:text-3xl lg:text-4xl font-black tracking-tight max-w-xl mx-auto text-balance" style={{ '--reveal-delay': '0ms' } as React.CSSProperties}>
            Biznesingizni bugunoq tartibga soling
          </h2>
          <p className="scroll-reveal text-xs sm:text-sm text-[#D7F0E5]/90 max-w-lg mx-auto leading-relaxed" style={{ '--reveal-delay': '80ms' } as React.CSSProperties}>
            Tovarlar qoldig‘i, savdo buyurtmalari va kassa foydasini bitta joyda boshqaring.
          </p>
          <div className="scroll-reveal pt-2" style={{ '--reveal-delay': '160ms' } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => handleOpenAuth()}
              className="px-7 py-3.5 rounded-xl bg-[#F5B85C] hover:bg-[#E2A448] text-[#112521] text-xs sm:text-sm font-extrabold shadow-card transition-all btn-tactile inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>Bepul boshlash</span>
              <ArrowRight className="w-4 h-4 text-[#112521]" />
            </button>
          </div>
          <div className="text-[11px] text-[#D7F0E5]/70 pt-1">
            Google orqali 10 soniyada ro‘yxatdan o‘ting · Hech qanday karta talab qilinmaydi
          </div>
        </div>
      </section>

      {/* 9. CLEAN QUIET FOOTER */}
      <footer className="scroll-reveal border-t border-[#E0ECE8] bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#52796F]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#173B35] border border-[#23584F] flex items-center justify-center text-[#F5B85C] font-black text-xs font-serif">
              B
            </div>
            <span className="font-bold text-[#112521]">BESTO</span>
            <span aria-hidden="true">·</span>
            <span>Biznesingizni boshqaring. O‘sishni oldindan ko‘ring.</span>
          </div>

          <div className="flex items-center gap-5">
            <a href="#capabilities" className="nav-link-animated hover:text-[#112521] transition-colors">
              Imkoniyatlar
            </a>
            <a href="#pricing" className="nav-link-animated hover:text-[#112521] transition-colors">
              Tariflar
            </a>
            <a href="#faq" className="nav-link-animated hover:text-[#112521] transition-colors">
              Savol-javob
            </a>
            <button
              type="button"
              onClick={() => handleOpenAuth()}
              className="hover:text-[#112521] transition-colors font-bold cursor-pointer"
            >
              Kirish
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} BESTO. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>

      {/* 10. AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#112521]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden"
          onClick={handleCloseAuth}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-modal border border-[#E0ECE8] space-y-5 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Tizimga kirish"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E0ECE8] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#173B35] text-[#F5B85C] flex items-center justify-center font-black text-sm font-serif">
                  B
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#112521]">BESTO tizimiga kirish</h3>
                  <p className="text-[11px] text-[#52796F]">Xavfsiz Firebase avtorizatsiyasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAuth}
                className="text-[#52796F] hover:text-[#112521] p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedPlanForAuth && (
              <div className="p-3 bg-[#D7F0E5] border border-[#B5E2D1] rounded-xl text-xs text-[#173B35]">
                Tanlangan tarif: <strong>{selectedPlanForAuth.toUpperCase()}</strong>. Tizimga kirgach, hisobingiz ushbu tarif uchun tayyorlanadi.
              </div>
            )}

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Kirishda xatolik yuz berdi</span>
                </div>
                <p className="text-[11px] leading-relaxed pl-5">{authError}</p>
              </div>
            )}

            <p className="text-xs text-[#2C4C45] leading-relaxed">
              Google hisobingiz orqali bir bosishda kiring. Hech qanday qo‘shimcha parol kiritish talab qilinmaydi.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#173B35] hover:bg-[#112521] text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 btn-tactile cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Kirilmoqda...' : 'Google hisobi bilan kirish'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#52796F]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Firebase xavfsiz protokoli bilan himoyalangan</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
