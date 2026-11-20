"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  FolderGit2,
  Mail,
  Sparkles,
} from "lucide-react";
import CelestialAstrolabe from "@/components/CelestialAstrolabe";
import Navbar from "@/components/Navbar";
import {
  CREATIVE_WORKS,
  PROFILE_DATA,
  PROJECTS,
  TECH_STACK,
} from "@/data/portfolioData";

export default function PortfolioPage() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light") {
      setIsDark(false);
    } else {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("portfolio-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("portfolio-theme", "light");
    }
  }, [isDark]);

  return (
    <div className="bg-orbital-grid relative min-h-screen w-full selection:bg-sky-500/25">
      {/* Ambient Radial Glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-all duration-500"
        style={{
          background:
            "radial-gradient(circle at 75% 35%, var(--accent-glow), transparent 55%)",
        }}
      />

      <Navbar
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      {/* HERO SECTION */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 pt-10 pb-20 lg:grid-cols-12 lg:pt-14">
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-primary)] shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{PROFILE_DATA.role}</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl lg:leading-[1.12]">
            Hi, I&apos;m{" "}
            <span className="text-[var(--accent-primary)]">
              {PROFILE_DATA.fullName}
            </span>
            .
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {PROFILE_DATA.tagline} {PROFILE_DATA.bio}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: isDark ? "#0284c7" : "#4f46e5",
              }}
            >
              <span>View Projects</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <span>Contact</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <CelestialAstrolabe isDark={isDark} />
        </div>
      </section>

      {/* SELECTED PROJECTS SECTION */}
      <section
        id="projects"
        className="mx-auto max-w-6xl border-t border-[var(--border-subtle)] px-6 py-20"
      >
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
              <FolderGit2 className="h-4 w-4" />
              <span>Selected Software</span>
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Engineered Web Applications
            </h2>
          </div>
          <p className="max-w-md text-sm text-[var(--text-secondary)]">
            Practical tools focused on personal finance, daily routines, and
            shared accounting.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PROJECTS.map((project) => (
            <article
              key={project.id}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 shadow-xs transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-md bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
                    {project.category}
                  </span>
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${project.title}`}
                      className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {project.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                  {project.subtitle}
                </p>

                <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {project.description}
                </p>

                <ul className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-secondary)]">
                  {project.highlights.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 pt-2">
                {project.tech.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* WRITING & MEDIA SECTION */}
      <section
        id="creative"
        className="mx-auto max-w-6xl border-t border-[var(--border-subtle)] px-6 py-20"
      >
        <div className="mb-12">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
            <BookOpen className="h-4 w-4" />
            <span>Beyond Code</span>
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Writing, Philosophy & Media Studies
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CREATIVE_WORKS.map((work, index) => (
            <div
              key={index}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6"
            >
              <span className="text-xs font-semibold text-[var(--accent-primary)]">
                {work.medium}
              </span>
              <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                {work.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {work.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT & CAPABILITIES */}
      <section
        id="about"
        className="mx-auto max-w-6xl border-t border-[var(--border-subtle)] px-6 py-20"
      >
        <div className="grid grid-cols-1 gap-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 sm:p-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
              <Compass className="h-4 w-4" />
              <span>Multidisciplinary Approach</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              Where structured engineering meets human communication.
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              Pursuing Media, Communication, and Journalism at North South
              University while building modern web software gives me a dual
              lens: architecting reliable, fast applications under the hood
              while keeping every interface clear, intentional, and readable on
              the surface.
            </p>
          </div>

          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              <Code2 className="h-4 w-4" />
              <span>Core Stack & Disciplines</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((skill) => (
                <span
                  key={skill}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & FOOTER */}
      <footer
        id="contact"
        className="mx-auto max-w-6xl border-t border-[var(--border-subtle)] px-6 py-14"
      >
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Let&apos;s build something meaningful.
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Open for software collaborations, web projects, and creative
              discussions.
            </p>
          </div>

          <a
            href={`mailto:${PROFILE_DATA.email}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]"
          >
            <Mail className="h-4 w-4 text-[var(--accent-primary)]" />
            <span>{PROFILE_DATA.email}</span>
          </a>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-[var(--border-subtle)] pt-6 text-xs text-[var(--text-muted)] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {PROFILE_DATA.fullName}. All rights
            reserved.
          </p>
          <p>{PROFILE_DATA.location}</p>
        </div>
      </footer>
    </div>
  );
}
