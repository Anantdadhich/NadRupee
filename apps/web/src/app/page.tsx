"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import {
  ArrowRight,
  Activity,
  Check,
  IndianRupee,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const Mark = ({ compact = false }: { compact?: boolean }) => (
  <span className="brand-lockup" aria-label="NadRupee">
    <span className="brand-mark">
      <i />
      <i />
      <i />
    </span>
    {!compact && <b>NadRupee</b>}
  </span>
);

const Action = ({
  children,
  dark = false,
  href = "/freelancer",
  onClick,
}: {
  children: React.ReactNode;
  dark?: boolean;
  href?: string;
  onClick?: () => void;
}) => {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={dark ? "action action-dark" : "action"}
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={href}
      className={dark ? "action action-dark" : "action"}
    >
      {children}
    </Link>
  );
};

export default function HomePage() {
  const {
    address,
    isConnected,
    isConnecting,
    storedCredentialId,
    signUp,
    signIn,
    connectTestnetPasskey,
    signOut,
  } = useAccount();

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -5%" }
    );
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add("is-visible");
      } else {
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  const handleAuthAction = () => {
    if (isConnected) {
      signOut();
    } else if (storedCredentialId) {
      signIn();
    } else {
      signUp("freelancer@nadrupee");
    }
  };

  return (
    <main>
      {/* 1. HERO SECTION */}
      <section className="hero" id="home">
        <nav className="nav-shell" aria-label="Main navigation">
          <div className="desktop-links">
            <a href="#funding">Product</a>
            <a href="#funding">How it works</a>
            <Link href="/freelancer">For Freelancers</Link>
            <Link href="/client">For Clients</Link>
            <Link href="/offramp">Instant INR Payout</Link>
            <Link href="/auth-test">Protocol Lab</Link>
          </div>

          <a href="#home" className="nav-brand">
            <Mark />
          </a>

          <div className="desktop-links nav-actions">
            <a href="mailto:hello@nadrupee.xyz">Contact us</a>
            {isConnected ? (
              <div className="auth-status">
                <span className="auth-dot" />
                <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}</span>
                <button onClick={signOut} className="auth-signout" title="Sign out">
                  Sign out
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={connectTestnetPasskey}
                  disabled={isConnecting}
                  className="signin"
                  style={{
                    background: "color-mix(in oklab, var(--mint) 15%, transparent)",
                    border: "1px solid var(--mint)",
                    color: "var(--mint)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Instant 1-Click Passkey for Local & Testnet Testing"
                >
                  ⚡ Testnet Passkey
                </button>
                <button
                  onClick={handleAuthAction}
                  disabled={isConnecting}
                  className="signin"
                >
                  {isConnecting ? "Verifying..." : "Biometric"}
                </button>
              </div>
            )}
            <Action href="/freelancer">Get Started</Action>
          </div>

          <button
            className="menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </nav>

        {menuOpen && (
          <div className="mobile-menu" id="mobile-navigation">
            <a href="#funding" onClick={() => setMenuOpen(false)}>Product</a>
            <a href="#funding" onClick={() => setMenuOpen(false)}>How it works</a>
            <Link href="/freelancer" onClick={() => setMenuOpen(false)}>For Freelancers</Link>
            <Link href="/client" onClick={() => setMenuOpen(false)}>For Clients</Link>
            <Link href="/offramp" onClick={() => setMenuOpen(false)}>Instant INR Payout</Link>
            <Link href="/auth-test" onClick={() => setMenuOpen(false)}>Protocol Lab</Link>
            <Link href="/freelancer" onClick={() => setMenuOpen(false)}>Get Started</Link>
          </div>
        )}

        <div className="hero-content">
          <div className="eyebrow dark-eyebrow">
            <Sparkles size={12} /> NADRUPEE · BUILT ON MONAD <span>TESTNET</span>
          </div>
          <h1>
            <em>Get paid the moment</em>
            <br />
            work is funded.
          </h1>
          <p>
            Instant, escrow-backed payments for Indian freelancers working with global clients —
            settled onchain, cashed out to your bank, no wallet required.
          </p>
          <div className="button-row">
            <Action href="/freelancer">Get Started</Action>
            <a className="text-link" href="#funding">
              See how it works <ArrowRight />
            </a>
          </div>
        </div>

        <div className="hero-product-wrap">
          <img
            className="hero-product"
            src="/nadrupee-hero.png"
            alt="Glowing rupee, escrow lock, and fingerprint tiles"
            width={1408}
            height={912}
          />
        </div>
      </section>

      {/* 2. KEY FEATURES SECTION */}
      <section className="light-section features" id="funding">
        <div className="section-heading" data-reveal="up">
          <div>
            <div className="eyebrow">
              <Sparkles size={12} /> KEY FEATURES
            </div>
            <h2>
              <em>NadRupee was built to remove</em>
              <br />
              the two things that hurt
              <br />
              freelancers most
            </h2>
          </div>
          <p>
            Getting paid shouldn't require
            <br />
            trust, delay, or a crash
            <br />
            course in crypto.
          </p>
        </div>

        <div className="feature-grid" data-reveal="up">
          <img
            className="feature-photo"
            src="/assets/freelancer-desk.jpg"
            alt="Indian freelance developer working on a laptop"
            loading="lazy"
            width={912}
            height={1104}
          />

          <article className="funding-card">
            <h3>
              Certainty
              <br />
              before you start
            </h3>
            <p>Your client locks payment in escrow before work begins — visible onchain.</p>

            <div className="funding-widget">
              <span>JOB ESCROW · ACME STUDIO</span>
              <strong>₹68,000</strong>
              <div className="chips">
                <small>Locked</small>
                <small>
                  <Check size={11} /> Onchain
                </small>
              </div>

              <div className="range">
                <i />
              </div>
              <div className="range-label">
                <span>80% INSTANT</span>
                <span>20% ON COMPLETION</span>
              </div>

              <Link href="/client">
                <button type="button">
                  Confirmed <Check size={13} />
                </button>
              </Link>
            </div>

            <div className="lifetime">
              <IndianRupee />
              <span>
                INSTANT RELEASE · 80%<strong>₹54,400</strong>
              </span>
              <i />
            </div>
          </article>

          <article className="risk-card">
            <div className="card-topline">
              <span>REDUCING RISK WITH NADRUPEE</span>
              <small>Compare scenarios</small>
            </div>
            <h3>Payment risk</h3>
            <div className="risk-chart">
              <div className="risk-column partial">
                <b>50%</b>
                <span>PARTIAL DEPOSIT</span>
              </div>
              <div className="risk-column danger">
                <b>100%</b>
                <span>NO ESCROW</span>
              </div>
              <div className="risk-column safe">
                <b>~0%</b>
                <span>NADRUPEE</span>
              </div>
            </div>
            <h3>Full payment locked</h3>
            <p>Funds are locked before work starts and 80% releases instantly on confirmation.</p>
          </article>

          <article className="brand-panel">
            <Mark compact />
          </article>
        </div>
      </section>

      {/* 3. TESTIMONIALS & INDUSTRY */}
      <section className="industry" id="company">
        <div className="industry-copy" data-reveal="up">
          <span className="eyebrow">INDUSTRY</span>
          <h2>Freelancers on NadRupee say</h2>
        </div>

        <div className="founder-gallery" data-reveal="up">
          {[
            {
              img: "/assets/founder-curly.jpg",
              name: "Early user",
              co: "Web development",
              q: "I used to wait three weeks after a project shipped. Now I see the money the second the client confirms.",
            },
            {
              img: "/assets/founder-office.jpg",
              name: "Early user ",
              co: "Design",
              q: "I don't have to explain crypto to my clients. They just pay, and I just get paid.",
            },
            {
              img: "/assets/founder-outdoor.jpg",
              name: "Early user  ",
              co: "Content",
              q: "The first time I saw the escrow lock happen live, I actually trusted the process for once.",
            },
          ].map((f) => (
            <figure className="founder-card" key={f.co}>
              <img src={f.img} alt={`${f.name}, ${f.co}`} loading="lazy" />
              <figcaption>
                <p>“{f.q}”</p>
                <b>{f.name}</b>
                <span>{f.co}</span>
              </figcaption>
            </figure>
          ))}

          <div className="industry-stat">
            <strong>~60s</strong>
            <span>average time from escrow release to stablecoins in wallet</span>
          </div>
        </div>
      </section>

      {/* 4. PAYMENT INFRASTRUCTURE & DASHBOARD STACK */}
      <section className="platform" id="insights">
        <div className="platform-copy" data-reveal="left">
          <div className="eyebrow dark-eyebrow">
            <Activity size={12} /> PAYMENT INFRASTRUCTURE
          </div>
          <h2>
            Built for
            <br />
            real-time
            <br />
            settlement
          </h2>
          <p>
            Every payment runs through Monad's x402 protocol. Gas is covered by the facilitator — freelancers never pay network fees.
          </p>
          <a className="text-link" href="#contact">
            See the live feed <ArrowRight />
          </a>
        </div>

        <div className="dashboard-stack" data-reveal="right">
          <div className="dash-card dash-main">
            <div className="dash-title">
              <Mark compact />
              <span>Live transaction feed · Envio</span>
            </div>
            <div className="metric">
              <span>Escrow locked</span>
              <strong>₹42,000</strong>
            </div>
            <div className="bars">
              {[28, 42, 35, 62, 54, 79, 70].map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div className="dash-card dash-small">
            <ShieldCheck />
            <span>Partial released (80%)</span>
            <strong>₹33,600</strong>
          </div>

          <div className="dash-card dash-toolkit">
            {[
              ["Finality", "<1s"],
              ["Off-ramp", "Onmeta"],
              ["Gas fees", "₹0"],
              ["Cash out", "UPI"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. BUILT FOR TRUST & VERIFIABILITY */}
      <section className="ambition">
        <div className="section-heading ambition-heading" data-reveal="up">
          <div>
            <div className="eyebrow">
              <Sparkles size={12} /> BUILT FOR TRUST, NOT JUST SPEED
            </div>
            <h2>
              <em>At the core of NadRupee is</em>
              <br />
              a commitment to
              <br />
              verifiable payments
            </h2>
          </div>
          <p>
            No black boxes. Every lock, release,
            <br />
            and cash-out is checkable onchain.
          </p>
        </div>

        <div className="ambition-grid" data-reveal="up">
          <article className="target-card">
            <div className="target">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span>RAILS · MONAD · MERA · AGORA · ONMETA</span>
          </article>

          <article className="growth-card">
            <span>LOG IN WITH A PASSKEY</span>
            <strong>0 seed phrases</strong>
            <p>
              Mera passkey identity, AUSD stablecoins by Agora, and licensed INR payouts to your bank via UPI.
            </p>
          </article>

          <img
            src="/assets/freelancer-phone.jpg"
            alt="Freelancer checking a payment on her phone"
            loading="lazy"
            width={1200}
            height={800}
          />
        </div>
      </section>

      {/* 6. STATEMENT AURA BANNER */}
      <section className="statement">
        <div className="statement-inner" data-reveal="scale">
          <Mark compact />
          <h2>
            <em>NadRupee — get paid your way:</em>
            <br />
            payments that work the way
            <br />
            freelancers actually need them to
          </h2>
          <p>
            A payments platform for Indian freelancers working with global clients — certainty
            before you start, instant payout after.
          </p>
          <div className="button-row">
            <Action href="/freelancer">Get Started</Action>
            <a className="text-link" href="#funding">
              Learn more <ArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* 7. CLOSING BANNER & FOOTER */}
      <section className="closing" id="contact">
        <div className="closing-banner" data-reveal="up">
          <div>
            <div className="eyebrow dark-eyebrow">
              <Sparkles size={12} /> EMPOWER YOUR WORK
            </div>
            <h2>
              Get paid
              <br />
              without the wait
            </h2>
            <p>Stop chasing invoices. Start getting paid the moment your work is funded.</p>
            <div className="button-row">
              <Action href="/freelancer">Get Started</Action>
              <Action dark onClick={handleAuthAction}>
                {isConnected ? "Sign out" : "Sign in"}
              </Action>
            </div>
          </div>
          <div className="closing-mark">
            <Mark compact />
          </div>
        </div>

        <div className="trusted" data-reveal="up">
          <div>
            <h3>Built for</h3>
            <p>
              Independent talent working
              <br />
              with global clients
            </p>
          </div>
          {["Developers", "Designers", "Writers", "Consultants", "Remote contractors"].map(
            (name) => (
              <b key={name}>{name}</b>
            )
          )}
        </div>

        <footer className="footer" data-reveal="up">
          <div className="footer-tab">
            <Mark />
          </div>
          <div className="footer-lead">
            Instant, escrow-backed
            <br />
            payments for Indian
            <br />
            freelancers — built on Monad.
          </div>
          <div>
            <small>PRODUCT</small>
            <a href="#funding">How it works</a>
            <Link href="/freelancer">For Freelancers</Link>
            <Link href="/client">For Clients</Link>
            <Link href="/offramp">Instant INR Payout</Link>
            <Link href="/auth-test">Protocol Lab</Link>
          </div>
          <div>
            <small>COMPANY</small>
            <a href="#company">About</a>
            <a href="mailto:hello@nadrupee.xyz">Contact</a>
          </div>
          <div>
            <small>RESOURCES</small>
            <a href="#funding">Features</a>
            <a href="#insights">Infrastructure</a>
          </div>
          <div>
            <small>INSIGHTS</small>
            <a href="#insights">NadRupee on Monad</a>
            <a href="#company">Freelancer stories</a>
          </div>
          <div className="footer-meta">
            <span>© 2026 NadRupee</span>
            <a href="mailto:hello@nadrupee.xyz">hello@nadrupee.xyz</a>
          </div>
        </footer>
      </section>
    </main>
  );
}
