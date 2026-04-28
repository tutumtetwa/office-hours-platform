import React from 'react';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Office Hours Booking Platform · CS370</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
:root{--navy:#1a3352;--navy-deep:#0f2239;--navy-mid:#1e3d63;--gold:#c9a227;--gold-light:#f0c842;--gold-pale:rgba(201,162,39,0.12);--cream:#fdf9f0;--light:#f0f4fa;--white:#ffffff;--gray:#6b7280;--gray-light:#e5eaf2;--green:#15803d;--green-pale:rgba(21,128,61,0.1);--red:#b91c1c;--blue:#1d4ed8;--blue-pale:rgba(29,78,216,0.08)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Inter',system-ui,sans-serif;background:#000}
.deck-wrap{width:100%;height:100%}
.slide-viewport{width:100%;height:100%;position:relative;overflow:hidden}
.slide{position:absolute;inset:0;width:100%;height:100%;display:none;font-size:clamp(11px,1.35vw,18px);animation:fadeIn 0.28s ease}
.slide.active{display:flex}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.progress-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--gold),var(--gold-light));transition:width 0.35s cubic-bezier(0.4,0,0.2,1);z-index:100}
.slide-badge{position:absolute;bottom:1.2em;right:1.4em;font-size:0.62em;font-weight:600;letter-spacing:0.06em;color:rgba(255,255,255,0.25);z-index:5}
.slide-badge.on-light{color:rgba(0,0,0,0.18)}
.l-cover{flex-direction:column;justify-content:center;padding:7% 9%;background:linear-gradient(135deg,var(--navy-deep) 0%,#0d2240 50%,#172d4a 100%);position:relative;overflow:hidden}
.l-cover .bg-ring-1{position:absolute;width:55vh;height:55vh;border-radius:50%;border:1px solid rgba(201,162,39,0.1);right:-8vh;top:-8vh}
.l-cover .bg-ring-2{position:absolute;width:38vh;height:38vh;border-radius:50%;background:radial-gradient(circle,rgba(201,162,39,0.07) 0%,transparent 70%);right:4vh;bottom:-4vh}
.l-cover .bg-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px);background-size:28px 28px}
.l-split{flex-direction:row}
.l-split .s-left{width:40%;flex-shrink:0;background:linear-gradient(160deg,var(--navy) 0%,var(--navy-deep) 100%);display:flex;flex-direction:column;justify-content:center;padding:7% 6%;position:relative;overflow:hidden}
.l-split .s-left::after{content:'';position:absolute;bottom:-30%;right:-20%;width:60%;height:60%;border-radius:50%;background:radial-gradient(circle,rgba(201,162,39,0.08) 0%,transparent 65%)}
.l-split .s-right{flex:1;background:var(--white);display:flex;flex-direction:column;justify-content:center;padding:6% 6%;overflow:hidden}
.l-light{flex-direction:column;padding:5.5% 7%;background:var(--white)}
.l-tinted{flex-direction:column;padding:5.5% 7%;background:var(--light)}
.l-dark{flex-direction:column;padding:5.5% 7%;background:linear-gradient(135deg,var(--navy-deep) 0%,#0e2236 100%);position:relative;overflow:hidden}
.l-dark::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px);background-size:24px 24px}
.eyebrow{font-size:0.65em;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold);margin-bottom:0.5em}
.h1{font-size:3em;font-weight:900;line-height:1.05;color:var(--white);letter-spacing:-0.02em}
.h1 .accent{color:var(--gold-light)}
.h2{font-size:1.9em;font-weight:800;line-height:1.1;color:var(--navy);letter-spacing:-0.02em}
.h2.on-dark{color:var(--white)}
.h2 .accent{color:var(--gold)}
.sub{font-size:0.82em;color:var(--gray);line-height:1.55;margin-top:0.35em}
.sub.on-dark{color:rgba(255,255,255,0.5)}
.rule{height:2px;background:linear-gradient(90deg,var(--gold) 0%,transparent 100%);border-radius:1px;margin:0.9em 0 1em}
.rule.dim{background:linear-gradient(90deg,rgba(255,255,255,0.15) 0%,transparent 100%)}
.tag-row{display:flex;flex-wrap:wrap;gap:0.45em;margin-top:1.8em}
.tag{font-size:0.68em;font-weight:600;padding:0.32em 0.85em;border-radius:100px;background:rgba(201,162,39,0.13);border:1px solid rgba(201,162,39,0.35);color:rgba(255,220,100,0.9);letter-spacing:0.02em}
.meta-strip{display:flex;gap:2.5em;margin-top:2em;padding-top:1.6em;border-top:1px solid rgba(255,255,255,0.1)}
.meta-label{font-size:0.6em;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--gold)}
.meta-val{font-size:0.85em;color:rgba(255,255,255,0.8);margin-top:0.2em;font-weight:500}
.feat-list{list-style:none;display:flex;flex-direction:column;gap:0.65em}
.feat-list li{display:flex;align-items:flex-start;gap:0.7em;font-size:0.85em;color:#374151;line-height:1.45}
.feat-dot{flex-shrink:0;width:1.5em;height:1.5em;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72em;font-weight:700;margin-top:0.15em;background:var(--navy);color:white}
.feat-dot.g{background:var(--gold);color:var(--navy-deep)}
.feat-dot.gr{background:var(--green)}
.role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1em;flex:1}
.role-card{border-radius:12px;padding:1.1em 1.1em 1.2em;display:flex;flex-direction:column;gap:0.5em;border:1px solid transparent}
.role-card.navy{background:linear-gradient(145deg,#1e3a5f 0%,#152d4a 100%);border-color:rgba(255,255,255,0.07)}
.role-card.gold{background:linear-gradient(145deg,#7a5c00 0%,#5a4200 100%);border-color:rgba(201,162,39,0.3)}
.role-card.green{background:linear-gradient(145deg,#14532d 0%,#0d3d20 100%);border-color:rgba(21,128,61,0.3)}
.role-head{display:flex;align-items:center;gap:0.6em;margin-bottom:0.3em}
.role-icon{width:1.8em;height:1.8em;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1em;background:rgba(255,255,255,0.1)}
.role-title{font-size:0.88em;font-weight:700;color:white}
.role-item{font-size:0.76em;color:rgba(255,255,255,0.65);display:flex;align-items:baseline;gap:0.45em;line-height:1.4}
.role-item::before{content:'·';color:rgba(255,255,255,0.3);flex-shrink:0}
.stack-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0.8em}
.stack-card{background:var(--white);border:1px solid var(--gray-light);border-radius:10px;padding:1em 0.9em;display:flex;flex-direction:column;gap:0.25em;position:relative;overflow:hidden}
.stack-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--navy)}
.stack-card.gold::before{background:linear-gradient(90deg,var(--gold),var(--gold-light))}
.stack-layer{font-size:0.6em;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--gray)}
.stack-name{font-size:0.9em;font-weight:700;color:var(--navy)}
.stack-detail{font-size:0.72em;color:var(--gray);line-height:1.4;margin-top:0.1em}
.tier{border-radius:10px;padding:0.9em 1.1em;display:flex;flex-direction:column;gap:0.2em}
.tier.t-blue{background:#eff6ff;border:1.5px solid #bfdbfe}
.tier.t-navy{background:var(--light);border:1.5px solid #c7d9f0}
.tier.t-gold{background:#fefce8;border:1.5px solid #fde68a}
.tier-label{font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray)}
.tier-name{font-size:0.88em;font-weight:700;color:var(--navy)}
.tier-desc{font-size:0.75em;color:var(--gray);line-height:1.4;margin-top:0.15em}
.arrow-down{text-align:center;font-size:1em;color:#9ca3af;margin:0.1em 0}
.db-pill{font-size:0.75em;padding:0.35em 0.75em;border-radius:6px;display:flex;align-items:center;gap:0.5em;background:var(--white);border:1px solid var(--gray-light);color:var(--navy);font-weight:500}
.db-pill .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.flow-steps{display:flex;flex-direction:column;gap:0.45em}
.flow-step{display:flex;align-items:flex-start;gap:0.75em}
.fnum{flex-shrink:0;width:1.6em;height:1.6em;border-radius:50%;background:var(--navy);color:white;font-size:0.72em;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:0.05em}
.fnum.red{background:#dc2626}
.fnum.grn{background:var(--green)}
.fnum.gold{background:var(--gold);color:var(--navy-deep)}
.ftext{font-size:0.82em;color:#374151;line-height:1.45}
.ftext strong{color:var(--navy)}
.ftext code{font-family:'JetBrains Mono',monospace;font-size:0.88em;background:var(--light);padding:0.1em 0.35em;border-radius:4px;color:#1e40af}
.callout{border-radius:8px;padding:0.8em 1em;font-size:0.78em;line-height:1.5;color:#374151}
.callout.blue{background:var(--blue-pale);border-left:3px solid #3b82f6}
.callout.gold{background:var(--gold-pale);border-left:3px solid var(--gold)}
.callout.green{background:var(--green-pale);border-left:3px solid var(--green)}
.callout strong{color:var(--navy)}
.test-tbl{width:100%;border-collapse:collapse;font-size:0.78em}
.test-tbl th{background:var(--navy);color:white;padding:0.55em 0.8em;text-align:left;font-weight:600;font-size:0.85em}
.test-tbl th:first-child{border-radius:6px 0 0 0}
.test-tbl th:last-child{border-radius:0 6px 0 0}
.test-tbl td{padding:0.42em 0.8em;border-bottom:1px solid #f0f4fa;color:#374151;line-height:1.3}
.test-tbl tr:nth-child(even) td{background:#f9fbfe}
.pass{color:var(--green);font-weight:700}
.bug-card{border-radius:10px;padding:1em 1.1em;background:white;border:1px solid #fecaca;border-left:4px solid #dc2626;display:flex;flex-direction:column;gap:0.35em}
.bug-title{font-size:0.82em;font-weight:700;color:#991b1b}
.bug-body{font-size:0.77em;color:#374151;line-height:1.5}
.bug-fix{font-size:0.77em;color:#166534;line-height:1.5;font-weight:500}
.bug-fix code{font-family:'JetBrains Mono',monospace;font-size:0.92em;background:#f0fdf4;padding:0.1em 0.3em;border-radius:3px}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1em}
.stat-box{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:1.4em 1em;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.3em}
.stat-num{font-size:3em;font-weight:900;color:var(--gold-light);line-height:1;letter-spacing:-0.03em}
.stat-lbl{font-size:0.72em;color:rgba(255,255,255,0.5);line-height:1.4;max-width:10em}
.team-grid{display:flex;gap:1.2em;justify-content:center}
.team-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:1.6em 1.8em;display:flex;flex-direction:column;align-items:center;gap:0.5em;min-width:13em}
.team-av{width:3em;height:3em;border-radius:50%;background:linear-gradient(135deg,var(--gold) 0%,var(--gold-light) 100%);color:var(--navy-deep);font-size:1.2em;font-weight:900;display:flex;align-items:center;justify-content:center}
.team-name{font-size:1em;font-weight:700;color:white}
.team-role{font-size:0.72em;color:rgba(255,255,255,0.45);text-align:center;line-height:1.4;max-width:12em}
.url-badge{display:inline-flex;align-items:center;gap:0.5em;background:rgba(201,162,39,0.12);border:1px solid rgba(201,162,39,0.4);border-radius:100px;padding:0.45em 1.2em;font-size:0.82em;font-weight:600;color:#f0c842;font-family:'JetBrains Mono',monospace}
.nav-overlay{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 24px 18px;background:linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 100%);z-index:50;opacity:0;transition:opacity 0.25s ease}
.nav-overlay:hover,.nav-overlay.visible{opacity:1}
.nav-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.85);padding:7px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:500;transition:background 0.15s,border-color 0.15s;backdrop-filter:blur(8px);letter-spacing:0.01em}
.nav-btn:hover:not(:disabled){background:rgba(255,255,255,0.18);border-color:rgba(255,255,255,0.35);color:white}
.nav-btn:disabled{opacity:0.25;cursor:default}
.nav-counter{font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;letter-spacing:0.08em;min-width:48px;text-align:center}
.nav-dots{display:flex;gap:7px;align-items:center}
.nav-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.25);cursor:pointer;transition:background 0.2s,transform 0.2s}
.nav-dot.active{background:var(--gold);transform:scale(1.35)}
.nav-dot:hover:not(.active){background:rgba(255,255,255,0.5)}
</style>
</head>
<body>
<div class="deck-wrap">
<div class="slide-viewport">
  <div class="progress-bar" id="progress"></div>

<div class="slide l-cover active" id="s1">
  <div class="bg-dots"></div><div class="bg-ring-1"></div><div class="bg-ring-2"></div>
  <div class="eyebrow">CS370 · Software Engineering · Final Presentation</div>
  <div class="h1">Office Hours<br><span class="accent">Booking Platform</span></div>
  <div style="color:rgba(255,255,255,0.5);font-size:0.95em;margin-top:0.9em;line-height:1.5;max-width:32em">A production-deployed web application that replaces email-based scheduling with a real-time booking system for students, instructors, and administrators.</div>
  <div class="tag-row"><span class="tag">React 18</span><span class="tag">Node.js + Express</span><span class="tag">PostgreSQL 15</span><span class="tag">JWT Auth</span><span class="tag">Resend Email</span><span class="tag">Railway</span><span class="tag">node-cron</span></div>
  <div class="meta-strip">
    <div class="meta-item"><div class="meta-label">Presented by</div><div class="meta-val">Tutu &amp; Dennis</div></div>
    <div class="meta-item"><div class="meta-label">Live at</div><div class="meta-val">officehourscs370.online</div></div>
    <div class="meta-item"><div class="meta-label">Version</div><div class="meta-val">v2.1.0</div></div>
    <div class="meta-item"><div class="meta-label">Status</div><div class="meta-val" style="color:#6ee7b7">All features shipped</div></div>
  </div>
  <div class="slide-badge">1 / 12</div>
</div>

<div class="slide l-split" id="s2">
  <div class="s-left">
    <div class="eyebrow">The Problem</div>
    <div class="h2 on-dark" style="font-size:1.8em">Scheduling office<br>hours is <span class="accent">broken</span></div>
    <div style="color:rgba(255,255,255,0.45);font-size:0.82em;line-height:1.6;margin-top:1.1em">The current process relies on emails, Canvas messages, and guesswork. Students do not know when instructors are free, and instructors have no reliable way to manage demand.</div>
  </div>
  <div class="s-right">
    <div class="eyebrow">What goes wrong today</div><div class="rule"></div>
    <ul class="feat-list">
      <li><div class="feat-dot">1</div><div><strong>No central availability.</strong> Students send emails hoping to catch an open slot. Instructors reply manually to each one.</div></li>
      <li><div class="feat-dot">2</div><div><strong>Double-booking happens constantly.</strong> Two students show up to the same slot because there is no system enforcing exclusivity.</div></li>
      <li><div class="feat-dot">3</div><div><strong>Cancellations go to waste.</strong> When a session is cancelled, no one else is told the slot opened up.</div></li>
      <li><div class="feat-dot">4</div><div><strong>No history or accountability.</strong> Completed sessions, no-shows, and cancellations are never recorded anywhere.</div></li>
      <li><div class="feat-dot">5</div><div><strong>Admin overhead every semester.</strong> Staff manually reset passwords and provision accounts with no automated workflow.</div></li>
    </ul>
  </div>
  <div class="slide-badge on-light">2 / 12</div>
</div>

<div class="slide l-light" id="s3">
  <div class="eyebrow">What We Built</div>
  <div class="h2">Three roles. One platform. <span class="accent">Everything connected.</span></div>
  <div class="sub">Every role gets exactly the tools it needs, nothing more. Role-based access control is enforced on every API route.</div>
  <div class="rule"></div>
  <div class="role-grid">
    <div class="role-card navy"><div class="role-head"><div class="role-icon">🎓</div><div class="role-title">Student</div></div><div class="role-item">Browse availability by instructor and date</div><div class="role-item">Book open slots in one click</div><div class="role-item">Join a waitlist when a slot is full</div><div class="role-item">Get email confirmation and reminders</div><div class="role-item">Cancel upcoming appointments</div><div class="role-item">Download .ics calendar files</div><div class="role-item">View full appointment history</div></div>
    <div class="role-card gold"><div class="role-head"><div class="role-icon">👩‍🏫</div><div class="role-title">Instructor</div></div><div class="role-item">Post individual availability slots</div><div class="role-item">Set recurring weekly office hours</div><div class="role-item">Configure slot duration and buffer time</div><div class="role-item">Mark sessions completed or no-show</div><div class="role-item">Cancel with a reason, student is notified</div><div class="role-item">Download full schedule as .ics</div><div class="role-item">View who is booked for each slot</div></div>
    <div class="role-card green"><div class="role-head"><div class="role-icon">🔒</div><div class="role-title">Administrator</div></div><div class="role-item">Provision users with welcome email</div><div class="role-item">Edit, activate, or deactivate accounts</div><div class="role-item">Force password reset on first login</div><div class="role-item">View system-wide booking statistics</div><div class="role-item">Access the full audit log</div></div>
  </div>
  <div class="slide-badge on-light">3 / 12</div>
</div>

<div class="slide l-tinted" id="s4">
  <div class="eyebrow">How It Is Built</div>
  <div class="h2">Technology Stack</div>
  <div class="sub">Each layer chosen for reliability and zero-cost production deployment on Railway</div>
  <div class="rule"></div>
  <div class="stack-grid" style="margin-bottom:0.8em">
    <div class="stack-card"><div class="stack-layer">Frontend</div><div class="stack-name">React 18</div><div class="stack-detail">React Router v6 · Axios · Lucide icons · date-fns · 15 pages</div></div>
    <div class="stack-card gold"><div class="stack-layer">Backend</div><div class="stack-name">Node.js + Express</div><div class="stack-detail">Express v4 · express-validator · Helmet · rate-limit · CORS</div></div>
    <div class="stack-card"><div class="stack-layer">Database</div><div class="stack-name">PostgreSQL 15</div><div class="stack-detail">pg driver · idempotent migrations on every server start</div></div>
    <div class="stack-card gold"><div class="stack-layer">Authentication</div><div class="stack-name">JWT + bcryptjs</div><div class="stack-detail">jsonwebtoken v9 · RBAC middleware · 6-digit OTP verification</div></div>
  </div>
  <div class="stack-grid">
    <div class="stack-card gold"><div class="stack-layer">Email</div><div class="stack-name">Resend</div><div class="stack-detail">Confirmations · 24hr and 1hr reminders · waitlist alerts · OTP codes</div></div>
    <div class="stack-card"><div class="stack-layer">Scheduling</div><div class="stack-name">node-cron</div><div class="stack-detail">Fires every 15 minutes to dispatch due reminder emails</div></div>
    <div class="stack-card gold"><div class="stack-layer">Calendar Export</div><div class="stack-name">ical-generator</div><div class="stack-detail">Generates .ics files for students and instructors on demand</div></div>
    <div class="stack-card"><div class="stack-layer">Hosting</div><div class="stack-name">Railway</div><div class="stack-detail">Frontend, backend, and PostgreSQL all deployed independently</div></div>
  </div>
  <div class="slide-badge on-light">4 / 12</div>
</div>

<div class="slide l-light" id="s5">
  <div class="eyebrow">System Design</div>
  <div class="h2">Three-Tier Architecture</div>
  <div class="sub">Each tier deployed independently. Any one can be updated without touching the others.</div>
  <div class="rule"></div>
  <div style="display:grid;grid-template-columns:1fr 1.05fr;gap:1.4em;flex:1;align-items:start">
    <div style="display:flex;flex-direction:column;gap:0.5em">
      <div class="tier t-blue"><div class="tier-label">Client Layer</div><div class="tier-name">React SPA</div><div class="tier-desc">15 pages · AuthContext + ThemeContext · centralized Axios instance auto-attaches JWT · notification bell polls every 30s for unread alerts</div></div>
      <div class="arrow-down">↕ HTTPS · REST JSON</div>
      <div class="tier t-navy"><div class="tier-label">Application Layer</div><div class="tier-name">Express REST API</div><div class="tier-desc">Helmet sets security headers · CORS enforces origin allowlist · rate-limit caps auth at 20 req / 15 min · authenticateToken + authorize(role) on every protected route · 7 route modules</div></div>
      <div class="arrow-down">↕ pg connection pool</div>
      <div class="tier t-gold"><div class="tier-label">Data Layer</div><div class="tier-name">PostgreSQL 15</div><div class="tier-desc">9 tables · idempotent migrations run on every server start · DATE columns parsed as strings to prevent UTC offset shifts</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.55em">
      <div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--gray);margin-bottom:0.1em">Database Tables (9)</div>
      <div style="display:flex;flex-direction:column;gap:0.35em">
        <div class="db-pill"><span class="dot" style="background:#1d4ed8"></span>users &nbsp;<span style="color:var(--gray);font-weight:400">all accounts · student · instructor · admin</span></div>
        <div class="db-pill"><span class="dot" style="background:#7c3aed"></span>availability_slots &nbsp;<span style="color:var(--gray);font-weight:400">instructor time blocks (FK users)</span></div>
        <div class="db-pill"><span class="dot" style="background:#0891b2"></span>appointments &nbsp;<span style="color:var(--gray);font-weight:400">booked sessions (FK slots + users x2)</span></div>
        <div class="db-pill"><span class="dot" style="background:#d97706"></span>recurring_patterns &nbsp;<span style="color:var(--gray);font-weight:400">weekly schedule templates</span></div>
        <div class="db-pill"><span class="dot" style="background:#dc2626"></span>waitlist &nbsp;<span style="color:var(--gray);font-weight:400">queue for fully-booked slots</span></div>
        <div class="db-pill"><span class="dot" style="background:#15803d"></span>notifications &nbsp;<span style="color:var(--gray);font-weight:400">in-app alerts (FK users)</span></div>
        <div class="db-pill"><span class="dot" style="background:#6b7280"></span>audit_logs &nbsp;<span style="color:var(--gray);font-weight:400">full action history (nullable user FK)</span></div>
        <div class="db-pill"><span class="dot" style="background:#9333ea"></span>email_verifications &nbsp;<span style="color:var(--gray);font-weight:400">OTP codes · 1 row per user</span></div>
        <div class="db-pill"><span class="dot" style="background:#b45309"></span>password_resets &nbsp;<span style="color:var(--gray);font-weight:400">reset tokens + admin setup tokens</span></div>
      </div>
    </div>
  </div>
  <div class="slide-badge on-light">5 / 12</div>
</div>

<div class="slide l-split" id="s6">
  <div class="s-left">
    <div class="eyebrow">Security</div>
    <div class="h2 on-dark" style="font-size:1.7em">Auth &amp;<br><span class="accent">Verification</span><br>Flows</div>
    <div style="color:rgba(255,255,255,0.45);font-size:0.8em;line-height:1.6;margin-top:1em">Two onboarding paths: one for self-registered users, one for admin-provisioned accounts. Each enforces verification in the right order before granting access.</div>
  </div>
  <div class="s-right">
    <div style="display:flex;flex-direction:column;gap:1.3em">
      <div><div class="eyebrow">Self-Registration</div><div class="rule" style="margin-top:0.4em"></div>
        <div class="flow-steps">
          <div class="flow-step"><div class="fnum gold">1</div><div class="ftext">User registers. Account created with <strong>is_active = 0</strong> and <strong>email_verified = 0</strong>.</div></div>
          <div class="flow-step"><div class="fnum gold">2</div><div class="ftext">6-digit OTP sent via Resend. User enters it on the Verify Email page.</div></div>
          <div class="flow-step"><div class="fnum gold">3</div><div class="ftext">OTP valid. <strong>email_verified = 1, is_active = 1</strong>. JWT issued. User lands on dashboard.</div></div>
        </div>
      </div>
      <div><div class="eyebrow">Admin-Provisioned Account</div><div class="rule" style="margin-top:0.4em"></div>
        <div class="flow-steps">
          <div class="flow-step"><div class="fnum">1</div><div class="ftext">Admin creates account. Welcome email with temp password sent. <strong>must_change_password = 1</strong>.</div></div>
          <div class="flow-step"><div class="fnum">2</div><div class="ftext">User logs in. Immediately redirected to <strong>Setup Password</strong> before any other page.</div></div>
          <div class="flow-step"><div class="fnum">3</div><div class="ftext">Password updated. Redirected to email verification (OTP flow).</div></div>
          <div class="flow-step"><div class="fnum">4</div><div class="ftext">OTP verified. JWT issued. Full access granted.</div></div>
        </div>
      </div>
      <div class="callout gold"><strong>Security layer:</strong> authenticateToken then authorize('role') on every protected route. Deactivated accounts are rejected at login. Auth endpoints are rate-limited to 20 requests per 15 minutes.</div>
    </div>
  </div>
  <div class="slide-badge on-light">6 / 12</div>
</div>

<div class="slide l-light" id="s7">
  <div class="eyebrow">Core Feature</div>
  <div class="h2">Booking a Slot: End to End</div>
  <div class="sub">Every side effect is wrapped in try/catch. A Resend outage cannot roll back a confirmed booking.</div>
  <div class="rule"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.6em;flex:1;align-items:start">
    <div class="flow-steps" style="gap:0.5em">
      <div class="flow-step"><div class="fnum">1</div><div class="ftext">POST /api/appointments/book received from client</div></div>
      <div class="flow-step"><div class="fnum">2</div><div class="ftext">authenticateToken() verifies JWT and attaches req.user</div></div>
      <div class="flow-step"><div class="fnum">3</div><div class="ftext">authorize('student', 'admin') checks the role</div></div>
      <div class="flow-step"><div class="fnum">4</div><div class="ftext">Validate slot exists and is in the future</div></div>
      <div class="flow-step"><div class="fnum">5</div><div class="ftext">Check slot not already booked. Return 409 if taken.</div></div>
      <div class="flow-step"><div class="fnum">6</div><div class="ftext">Check student has no time conflict. Return 409 if overlap.</div></div>
      <div class="flow-step"><div class="fnum">7</div><div class="ftext"><strong>INSERT</strong> into appointments table</div></div>
      <div class="flow-step"><div class="fnum">8</div><div class="ftext"><strong>DELETE</strong> from waitlist if student was queued</div></div>
      <div class="flow-step"><div class="fnum">9</div><div class="ftext">createNotification() for both student and instructor</div></div>
      <div class="flow-step"><div class="fnum">10</div><div class="ftext">sendEmail() via Resend to both parties</div></div>
      <div class="flow-step"><div class="fnum">11</div><div class="ftext">logAction() writes to audit_logs</div></div>
      <div class="flow-step"><div class="fnum">12</div><div class="ftext">Return <strong>201 { appointment: { id } }</strong></div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:1em">
      <div><div class="eyebrow" style="margin-bottom:0.5em">Waitlist Auto-Promotion</div>
        <div class="flow-steps" style="gap:0.45em">
          <div class="flow-step"><div class="fnum red">1</div><div class="ftext">Student or instructor cancels an appointment</div></div>
          <div class="flow-step"><div class="fnum red">2</div><div class="ftext">Slot status set back to <strong>available</strong></div></div>
          <div class="flow-step"><div class="fnum grn">3</div><div class="ftext">notifyNextOnWaitlist() called inside try/catch</div></div>
          <div class="flow-step"><div class="fnum grn">4</div><div class="ftext">First student in the queue receives an email notification</div></div>
          <div class="flow-step"><div class="fnum grn">5</div><div class="ftext">Student clicks the link and books the now-open slot</div></div>
        </div>
      </div>
      <div><div class="eyebrow" style="margin-bottom:0.5em">Automated Reminders</div>
        <div class="callout blue">A <strong>node-cron</strong> job fires every 15 minutes. It queries upcoming appointments and sends reminder emails at <strong>24 hours</strong> before and <strong>1 hour</strong> before each session. A sent-flag prevents duplicates.</div>
      </div>
    </div>
  </div>
  <div class="slide-badge on-light">7 / 12</div>
</div>

<div class="slide l-split" id="s8">
  <div class="s-left">
    <div class="eyebrow">Instructor Feature</div>
    <div class="h2 on-dark" style="font-size:1.7em">Recurring<br><span class="accent">Office Hours</span></div>
    <div style="color:rgba(255,255,255,0.45);font-size:0.8em;line-height:1.6;margin-top:1em">Instructors define a pattern once. The platform auto-generates concrete, bookable slots for the next two weeks so students always see current availability.</div>
    <div style="margin-top:1.5em;background:rgba(201,162,39,0.1);border:1px solid rgba(201,162,39,0.25);border-radius:10px;padding:0.9em 1em">
      <div style="font-size:0.68em;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:0.5em">Example</div>
      <div style="font-size:0.78em;color:rgba(255,255,255,0.7);line-height:1.6"><strong style="color:rgba(255,255,255,0.9)">Pattern:</strong> Tuesday 14:00 to 16:00<br>30-min slots with 10-min buffer<br><br><strong style="color:rgba(255,255,255,0.9)">Generated:</strong><br>14:00-14:30 · 14:40-15:10 · 15:20-15:50<br><span style="color:rgba(255,255,255,0.4)">3 bookable slots per Tuesday, auto-refreshed</span></div>
    </div>
  </div>
  <div class="s-right">
    <div class="eyebrow">How It Works</div><div class="rule"></div>
    <div class="flow-steps" style="margin-bottom:1.4em">
      <div class="flow-step"><div class="fnum">1</div><div class="ftext">Instructor sets <strong>day of week, start time, end time, slot duration, and buffer</strong></div></div>
      <div class="flow-step"><div class="fnum">2</div><div class="ftext">Pattern saved to <strong>recurring_patterns</strong> table</div></div>
      <div class="flow-step"><div class="fnum">3</div><div class="ftext">Server generates individual slots for the next 14 days immediately on save</div></div>
      <div class="flow-step"><div class="fnum">4</div><div class="ftext">A daily cron job rolls the window forward so there are always 14 days of slots ahead</div></div>
      <div class="flow-step"><div class="fnum">5</div><div class="ftext">Slots appear in <strong>availability_slots</strong> and students can book them like any other slot</div></div>
      <div class="flow-step"><div class="fnum">6</div><div class="ftext">Instructor can pause, edit, or delete the pattern at any time</div></div>
    </div>
    <div class="callout green">Buffer time between slots prevents back-to-back sessions. A 30-min slot with 10-min buffer occupies 40 minutes of the instructor's calendar.</div>
  </div>
  <div class="slide-badge on-light">8 / 12</div>
</div>

<div class="slide l-light" id="s9">
  <div class="eyebrow">Quality</div>
  <div class="h2">Testing Strategy &amp; Results</div>
  <div class="sub">Structured manual testing with cross-team verification. Each feature was tested on the happy path, then actively broken.</div>
  <div class="rule"></div>
  <div style="display:grid;grid-template-columns:1.7fr 1fr;gap:1.3em;flex:1;overflow:hidden">
    <div style="overflow:hidden">
      <table class="test-tbl"><thead><tr><th>ID</th><th>Feature</th><th>Scenario</th><th>Result</th></tr></thead>
      <tbody>
        <tr><td>TC-01</td><td>Registration</td><td>Valid name, email, password submitted</td><td class="pass">Pass</td></tr>
        <tr><td>TC-02</td><td>Email Verify</td><td>Correct 6-digit OTP entered</td><td class="pass">Pass</td></tr>
        <tr><td>TC-03</td><td>Login unverified</td><td>Valid creds, unverified account: 403 returned</td><td class="pass">Pass</td></tr>
        <tr><td>TC-04</td><td>Booking</td><td>Valid future slot booked, both parties notified</td><td class="pass">Pass</td></tr>
        <tr><td>TC-05</td><td>Time Conflict</td><td>Student books two overlapping slots: 409</td><td class="pass">Pass</td></tr>
        <tr><td>TC-06</td><td>Past Slot</td><td>Slot in the past: 400 returned</td><td class="pass">Pass</td></tr>
        <tr><td>TC-07</td><td>Double Booking</td><td>Two students, same slot: second gets 409</td><td class="pass">Pass</td></tr>
        <tr><td>TC-08</td><td>Cancellation</td><td>Student cancels, instructor notified</td><td class="pass">Pass</td></tr>
        <tr><td>TC-09</td><td>Waitlist Promo</td><td>Slot cancelled, queued student auto-notified</td><td class="pass">Pass</td></tr>
        <tr><td>TC-10</td><td>Deactivate</td><td>Admin sets is_active = 0: user rejected at login</td><td class="pass">Pass</td></tr>
        <tr><td>TC-11</td><td>Role Guard</td><td>Student hits /availability route: 403</td><td class="pass">Pass</td></tr>
        <tr><td>TC-12</td><td>Rate Limiting</td><td>21 login requests in 15 minutes: 429 on #21</td><td class="pass">Pass</td></tr>
      </tbody></table>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.8em">
      <div><div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--gray);margin-bottom:0.5em">Tools Used</div>
        <div style="display:flex;flex-direction:column;gap:0.35em">
          <div style="font-size:0.78em;padding:0.4em 0.75em;background:var(--light);border-radius:7px;color:#374151">Browser: full user journey flows</div>
          <div style="font-size:0.78em;padding:0.4em 0.75em;background:var(--light);border-radius:7px;color:#374151">Postman: API endpoint testing</div>
          <div style="font-size:0.78em;padding:0.4em 0.75em;background:var(--light);border-radius:7px;color:#374151">Resend dashboard: email delivery checks</div>
          <div style="font-size:0.78em;padding:0.4em 0.75em;background:var(--light);border-radius:7px;color:#374151">Railway logs: server-side event inspection</div>
        </div>
      </div>
      <div><div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--gray);margin-bottom:0.5em">Process</div>
        <div style="font-size:0.78em;color:#374151;line-height:1.55">Each feature was built by one person and independently tested by the other with no shared checklist. This caught edge cases the author had missed.</div>
      </div>
      <div class="callout green" style="margin-top:auto"><strong>12 / 12 test cases passed.</strong> All error states, role boundaries, and edge conditions verified.</div>
    </div>
  </div>
  <div class="slide-badge on-light">9 / 12</div>
</div>

<div class="slide l-tinted" id="s10">
  <div class="eyebrow">Engineering Challenges</div>
  <div class="h2">Bugs Found &amp; Fixed</div>
  <div class="sub">Three non-obvious defects found during integration testing, each with a targeted fix</div>
  <div class="rule"></div>
  <div style="display:flex;flex-direction:column;gap:1em;flex:1;justify-content:center">
    <div class="bug-card">
      <div class="bug-title">Bug 1 &nbsp;·&nbsp; Date Offset (Off-by-One Day)</div>
      <div class="bug-body">PostgreSQL DATE columns returned as JS Date objects by the pg driver. When the server timezone was behind UTC, dates shifted back by one day. Appointments appeared on the wrong date for every user.</div>
      <div class="bug-fix">Fix: types.setTypeParser(1082, val =&gt; val) at DB init. Returns DATE as a plain YYYY-MM-DD string, bypassing the Date constructor entirely.</div>
    </div>
    <div class="bug-card">
      <div class="bug-title">Bug 2 &nbsp;·&nbsp; Migration Lockout (All Existing Accounts Blocked)</div>
      <div class="bug-body">After adding the email_verified column with a default of 0, every existing demo and test account was immediately locked out with no way to re-verify.</div>
      <div class="bug-fix">Fix: Idempotent UPDATE on server start sets email_verified = 1 for any user with no entry in email_verifications. Safe on both fresh and existing databases.</div>
    </div>
    <div class="bug-card">
      <div class="bug-title">Bug 3 &nbsp;·&nbsp; Waitlist Not Notified on Cancellation</div>
      <div class="bug-body">notifyNextOnWaitlist() in waitlist.js was not included in module.exports. Cancellations completed but the next student in queue was never told a slot had opened.</div>
      <div class="bug-fix">Fix: Added the function to exports, called it inside a try/catch in the cancellation handler. A notification failure cannot block or roll back the cancellation.</div>
    </div>
  </div>
  <div class="slide-badge on-light">10 / 12</div>
</div>

<div class="slide l-dark" id="s11">
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%">
    <div class="eyebrow" style="text-align:center">What We Delivered</div>
    <div class="h2 on-dark" style="text-align:center">By the Numbers</div>
    <div class="rule dim" style="max-width:160px;margin:0.8em auto 1.4em"></div>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-num">15</div><div class="stat-lbl">React pages across three user roles</div></div>
      <div class="stat-box"><div class="stat-num">7</div><div class="stat-lbl">Express route modules (auth, slots, appointments, recurring, waitlist, admin, notifications)</div></div>
      <div class="stat-box"><div class="stat-num">9</div><div class="stat-lbl">Database tables with idempotent migrations</div></div>
      <div class="stat-box"><div class="stat-num">12</div><div class="stat-lbl">Test cases executed, all passing</div></div>
    </div>
    <div class="stat-grid" style="margin-top:1em">
      <div class="stat-box"><div class="stat-num">5</div><div class="stat-lbl">Email trigger types (OTP, confirm, cancel, reminder, waitlist)</div></div>
      <div class="stat-box"><div class="stat-num">3</div><div class="stat-lbl">User roles with full RBAC enforcement on every route</div></div>
      <div class="stat-box"><div class="stat-num">100%</div><div class="stat-lbl">Features scoped in requirements phase, all shipped</div></div>
      <div class="stat-box"><div class="stat-num" style="font-size:2em;padding-top:0.2em">live</div><div class="stat-lbl">Production deployment on Railway</div></div>
    </div>
  </div>
  <div class="slide-badge">11 / 12</div>
</div>

<div class="slide l-dark" id="s12">
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;gap:1em">
    <div class="eyebrow">CS370 · Software Engineering</div>
    <div class="h1" style="font-size:2.8em">Thank You</div>
    <div style="color:rgba(255,255,255,0.45);font-size:0.9em;max-width:34em;line-height:1.6;margin-top:0.3em">Questions? Try the live demo using the credentials in the README. All three roles are accessible.</div>
    <div class="url-badge" style="margin-top:0.6em;font-size:0.88em;padding:0.55em 1.6em">officehourscs370.online</div>
    <div class="team-grid" style="margin-top:1.2em">
      <div class="team-card"><div class="team-av">T</div><div class="team-name">Tutu</div><div class="team-role">Auth + email verification, waitlist, security, deployment</div></div>
      <div class="team-card"><div class="team-av">D</div><div class="team-name">Dennis</div><div class="team-role">Slot and appointment flows, admin UI, calendar export</div></div>
    </div>
  </div>
  <div class="slide-badge">12 / 12</div>
</div>

</div></div>
<div class="nav-overlay" id="nav-overlay">
  <button class="nav-btn" id="btn-prev" onclick="go(-1)" disabled>&#8592; Prev</button>
  <div class="nav-dots" id="dots"></div>
  <span class="nav-counter" id="counter">1 / 12</span>
  <button class="nav-btn" id="btn-next" onclick="go(1)">Next &#8594;</button>
</div>
<script>
const TOTAL=12;let cur=1;
const dotsEl=document.getElementById('dots');
for(let i=1;i<=TOTAL;i++){const d=document.createElement('div');d.className='nav-dot'+(i===1?' active':'');d.onclick=()=>jump(i);dotsEl.appendChild(d);}
function jump(n){document.getElementById('s'+cur).classList.remove('active');dotsEl.children[cur-1].classList.remove('active');cur=Math.max(1,Math.min(TOTAL,n));document.getElementById('s'+cur).classList.add('active');dotsEl.children[cur-1].classList.add('active');document.getElementById('counter').textContent=cur+' / '+TOTAL;document.getElementById('btn-prev').disabled=cur===1;document.getElementById('btn-next').disabled=cur===TOTAL;document.getElementById('progress').style.width=(cur/TOTAL*100)+'%';}
function go(dir){jump(cur+dir);}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();go(1);}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(-1);}else if(e.key==='f'||e.key==='F'){if(!document.fullscreenElement)document.documentElement.requestFullscreen();else document.exitFullscreen();}});
const nav=document.getElementById('nav-overlay');let hideTimer;
document.addEventListener('mousemove',()=>{nav.classList.add('visible');clearTimeout(hideTimer);hideTimer=setTimeout(()=>nav.classList.remove('visible'),2000);});
document.getElementById('progress').style.width=(1/TOTAL*100)+'%';
</script>
</body>
</html>`;

const PresentationPage = () => (
  <iframe
    srcDoc={html}
    style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
    title="CS370 Slides Presentation"
  />
);

export default PresentationPage;
