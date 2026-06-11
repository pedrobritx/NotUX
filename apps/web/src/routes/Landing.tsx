import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@notux/ui";
import "./landing.css";

/* ---------- asset paths (served from /public/landing/) ------------------- */
const base = import.meta.env.BASE_URL;
const IMG = {
  canvas: `${base}landing/hero-canvas.png`,
  library: `${base}landing/hero-library.png`,
  collab: `${base}landing/hero-collab.png`,
};

/* ---------- intersection-observer reveal helper -------------------------- */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    el.querySelectorAll(".lp-reveal").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ======================================================================== */

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const wrap = useReveal();

  return (
    <div className="lp" ref={wrap}>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="lp-nav" id="lp-nav">
        <div className="lp-nav__brand">
          <span className="lp-nav__logo" aria-hidden>N</span>
          <span className="lp-nav__wordmark">NotUX</span>
        </div>
        <div className="lp-nav__links">
          <a href="#features" className="lp-nav__link">Features</a>
          <a href="#why" className="lp-nav__link">Why NotUX</a>
          <button
            type="button"
            className="lp-nav__theme"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            className="lp-cta lp-cta--sm"
            onClick={() => navigate("/")}
            id="lp-open-app-nav"
          >
            Open App
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="lp-hero" id="lp-hero">
        <div className="lp-hero__glow" aria-hidden />
        <h1 className="lp-hero__title lp-reveal">
          The whiteboard built<br />for <em>teaching</em>.
        </h1>
        <p className="lp-hero__sub lp-reveal">
          An infinite canvas where teachers and students draw, annotate, and
          learn together — in real time.
        </p>
        <div className="lp-hero__actions lp-reveal">
          <button
            className="lp-cta lp-cta--lg"
            onClick={() => navigate("/")}
            id="lp-get-started"
          >
            Get started — it's free
          </button>
          <a href="#features" className="lp-cta lp-cta--ghost">
            See features ↓
          </a>
        </div>
        <div className="lp-hero__img lp-reveal">
          <img
            src={IMG.canvas}
            alt="NotUX collaborative whiteboard showing a calculus lecture with live annotations, sticky notes, and multiple cursors"
            width="960"
            height="960"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </header>

      {/* ── Feature sections ───────────────────────────────────────────── */}
      <section className="lp-section" id="features">
        <Feature
          tag="Infinite canvas"
          title="Draw, write, annotate — without limits."
          body="Pen, shapes, text, sticky notes, and an infinite canvas that never runs out of space. Import PDFs, images, and embed YouTube videos right onto your board."
          img={IMG.canvas}
          imgAlt="NotUX canvas with pen tools, shapes, and PDF annotations"
        />

        <Feature
          tag="Real-time collaboration"
          title="Teach and learn together."
          body="Share a board with one click. See each other's cursors, follow the teacher's viewport, and contribute simultaneously — no installs, no accounts required."
          img={IMG.collab}
          imgAlt="Real-time collaboration with teacher and student cursors annotating a biology diagram"
          reverse
        />

        <Feature
          tag="Board library"
          title="Organize your knowledge."
          body="Every board autosaves. Organize with folders, star your favorites, and search instantly. Your workspace is always waiting — across devices."
          img={IMG.library}
          imgAlt="NotUX board library showing organized board cards with previews"
        />
      </section>

      {/* ── Capabilities grid ──────────────────────────────────────────── */}
      <section className="lp-section lp-caps" id="lp-capabilities">
        <h2 className="lp-section__title lp-reveal">
          Everything you need, nothing you don't.
        </h2>
        <div className="lp-caps__grid lp-reveal">
          <Cap icon="✏️" title="Pen & Highlighter" desc="Pressure-sensitive drawing with customizable brushes and colors." />
          <Cap icon="📐" title="Shapes & Arrows" desc="Rectangles, ellipses, polygons, lines, and smart connectors." />
          <Cap icon="📝" title="Rich Text" desc="Type anywhere with formatting — bold, italic, multiple fonts and sizes." />
          <Cap icon="📄" title="PDF Import" desc="Drop a PDF onto the canvas and annotate it directly." />
          <Cap icon="🎥" title="Media Embeds" desc="Embed YouTube videos, Google Drive files, images, and audio." />
          <Cap icon="👥" title="Multiplayer" desc="Real-time sync via CRDT — conflict-free, instant collaboration." />
          <Cap icon="📁" title="Folders & Search" desc="Organize boards into folders, star favorites, search everything." />
          <Cap icon="🌗" title="Dark & Light" desc="Liquid Glass design system with seamless dark/light theme switching." />
        </div>
      </section>

      {/* ── Why section ────────────────────────────────────────────────── */}
      <section className="lp-section lp-why" id="why">
        <h2 className="lp-section__title lp-reveal">
          Why we built NotUX.
        </h2>
        <div className="lp-why__content lp-reveal">
          <blockquote className="lp-why__quote">
            "We wanted a tool that felt as natural as a real whiteboard,
            but without the limits — one that teachers and students could
            open in a browser and start learning together, instantly."
          </blockquote>
          <div className="lp-why__points">
            <WhyPoint
              title="For the classroom"
              text="Designed for teaching from day one — PDF annotation, follow-teacher mode, and infinite space for every lecture."
            />
            <WhyPoint
              title="Open & free"
              text="No paywall, no account required to start. Works on any device with a browser. Deploy your own instance from GitHub."
            />
            <WhyPoint
              title="Privacy first"
              text="Your boards stay yours. Self-hostable with Supabase. No tracking, no ads, no data harvesting."
            />
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────── */}
      <section className="lp-section lp-banner lp-reveal" id="lp-cta-banner">
        <div className="lp-banner__glow" aria-hidden />
        <h2 className="lp-banner__title">Ready to try it?</h2>
        <p className="lp-banner__sub">
          Open NotUX, create a board, and start drawing — no sign-up needed.
        </p>
        <button
          className="lp-cta lp-cta--lg"
          onClick={() => navigate("/")}
          id="lp-cta-final"
        >
          Launch NotUX
        </button>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="lp-footer" id="lp-footer">
        <span className="lp-footer__brand">
          <span className="lp-nav__logo lp-nav__logo--sm" aria-hidden>N</span>
          NotUX
        </span>
        <span className="lp-footer__copy">
          Open source · Built for educators · {new Date().getFullYear()}
        </span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-footer__link"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function Feature({
  tag,
  title,
  body,
  img,
  imgAlt,
  reverse,
}: {
  tag: string;
  title: string;
  body: string;
  img: string;
  imgAlt: string;
  reverse?: boolean;
}) {
  return (
    <div className={`lp-feat lp-reveal${reverse ? " lp-feat--reverse" : ""}`}>
      <div className="lp-feat__text">
        <span className="lp-feat__tag">{tag}</span>
        <h3 className="lp-feat__title">{title}</h3>
        <p className="lp-feat__body">{body}</p>
      </div>
      <div className="lp-feat__img-wrap">
        <img src={img} alt={imgAlt} width="560" height="560" loading="lazy" />
      </div>
    </div>
  );
}

function Cap({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="lp-cap">
      <span className="lp-cap__icon">{icon}</span>
      <h4 className="lp-cap__title">{title}</h4>
      <p className="lp-cap__desc">{desc}</p>
    </div>
  );
}

function WhyPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="lp-why__point">
      <h4 className="lp-why__point-title">{title}</h4>
      <p className="lp-why__point-text">{text}</p>
    </div>
  );
}
