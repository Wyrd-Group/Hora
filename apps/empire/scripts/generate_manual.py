#!/usr/bin/env python3
"""Generate AEGIS Empire Player Manual PDF.

Resolves output paths relative to this script's location so it works from any
git worktree. Writes to apps/empire/docs/ which is the canonical location that
the repo ships.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Colors
BG_DARK = HexColor('#0a0e18')
CYAN = HexColor('#00e5ff')
TEXT_LIGHT = HexColor('#333333')
TEXT_MID = HexColor('#555555')
ACCENT = HexColor('#0891b2')
SECTION_BG = HexColor('#f0f9ff')
WARN_BG = HexColor('#fef3c7')

# Resolve output path relative to the script so worktrees Just Work.
# scripts/generate_manual.py → apps/empire/docs/AEGIS_Empire_Alpha_Manual.pdf
_EMPIRE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
output_path = os.path.join(_EMPIRE_ROOT, "docs", "AEGIS_Empire_Player_Manual.pdf")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    topMargin=2*cm, bottomMargin=2*cm,
    leftMargin=2.2*cm, rightMargin=2.2*cm,
    title="AEGIS Empire - Player Manual",
    author="Quadratic Labs",
)

# Styles
title_style = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=28, textColor=HexColor('#0a0e18'), alignment=TA_CENTER, spaceAfter=4)
subtitle_style = ParagraphStyle('Subtitle', fontName='Helvetica', fontSize=11, textColor=HexColor('#6b7280'), alignment=TA_CENTER, spaceAfter=20)
h1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=16, textColor=ACCENT, spaceBefore=18, spaceAfter=8)
h2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=11, textColor=HexColor('#1e3a5f'), spaceBefore=10, spaceAfter=4)
body = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, textColor=TEXT_LIGHT, leading=15, spaceAfter=6)
bullet = ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10, textColor=TEXT_LIGHT, leading=15, leftIndent=16, spaceAfter=3, bulletIndent=4, bulletFontName='Helvetica')
bold_bullet = ParagraphStyle('BoldBullet', fontName='Helvetica', fontSize=10, textColor=TEXT_LIGHT, leading=15, leftIndent=16, spaceAfter=3, bulletIndent=4)
small = ParagraphStyle('Small', fontName='Helvetica', fontSize=8, textColor=HexColor('#9ca3af'), alignment=TA_CENTER, spaceBefore=20)
url_style = ParagraphStyle('URL', fontName='Courier', fontSize=12, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=12, spaceBefore=8)

story = []

# ── Header ──
story.append(Spacer(1, 1.5*cm))
story.append(Paragraph("AEGIS EMPIRE", title_style))
story.append(Paragraph("Player Manual  |  v1.0", subtitle_style))
story.append(HRFlowable(width="60%", thickness=1, color=ACCENT, spaceBefore=0, spaceAfter=20, hAlign='CENTER'))

# ── What is AEGIS Empire ──
story.append(Paragraph("What is AEGIS Empire?", h1))
story.append(Paragraph(
    "AEGIS Empire is a browser-based business simulation game where you start with "
    "<b>100,000 in personal capital</b> and build a global corporate empire. Trade stocks and crypto on "
    "the Exchange, acquire businesses across the 3D world map, run R&amp;D projects, manage your board "
    "of directors, recruit employees through card packs, and even dabble in shadow operations. "
    "Every decision shapes your four core axes: Growth, Governance, Impact, and Power.",
    body
))

# ── Getting Started ──
story.append(Paragraph("Getting Started", h1))
story.append(Paragraph('<b>1.</b> Open your browser and go to:', body))
story.append(Paragraph("https://aegis-empire.netlify.app", url_style))
story.append(Paragraph('<b>2.</b> Click <b>"Create Account"</b> and enter your email, password, and commander name.', body))
story.append(Paragraph('<b>3.</b> On first launch, <b>pick your country</b> so tax wrappers, retirement accounts, and regulatory figures match your domicile. You can change it anytime in Settings.', body))
story.append(Paragraph('<b>4.</b> You begin with <b>100,000 personal balance</b> and a clean slate - no company funds, no owned businesses, no employees.', body))
story.append(Paragraph('<b>5.</b> Your progress <b>saves automatically</b> to the cloud every few seconds. Log in from any device to continue.', body))

# ── Core Tabs ──
story.append(Paragraph("Core Tabs", h1))

tabs = [
    ("Overview", "Dashboard showing your empire stats, balances, axes, and key performance metrics at a glance."),
    ("Globe", "Interactive 3D world map. Browse and purchase nodes (businesses) across 13 industry sectors. Upgrade them 1-5 for more income."),
    ("Learn", "ECFL Academy with structured courses, lessons, and exams. Boost your Financial Literacy of Understanding (FLOU) level."),
    ("Exchange", "Buy and sell stocks, crypto, forex, bonds, and other financial instruments with real-time price ticks."),
    ("Lab", "Launch R&amp;D projects and experimental investments. Discover new technologies and revenue streams."),
    ("Social", "BizTok social feed with NPC profiles, posts, clips, and daily challenges. Build reputation and followers."),
    ("Battle Pass", "50-tier seasonal progression with free and premium tracks. Earn XP from matches, trades, and daily activities."),
    ("MarketWire", "Yahoo Finance-style news, screener, portfolio tracker, and agent-written journalism on your holdings."),
]

for name, desc in tabs:
    story.append(Paragraph(f'<bullet>&bull;</bullet> <b>{name}</b> &mdash; {desc}', bold_bullet))

# ── Key Mechanics ──
story.append(Paragraph("Key Mechanics", h1))

mechanics = [
    ("Nodes", "Businesses on the globe you can purchase, build, and upgrade (levels 1-5). Each generates monthly income based on its sector and level."),
    ("Board of Directors", "Four board members set quarterly goals. Meet their targets to keep satisfaction high. Drop below 25% and you get sacked (game over for that career)."),
    ("Heat (0-100)", "Criminal and shadow activities raise your Heat. Above 60: income penalty. Above 80: assets frozen. Heat decays slowly over time."),
    ("Agent Cards &amp; Q-Coins", "Open packs (Q-Coins or cash) to mint AI agent cards from Common to Mythic. Assign them to nodes, office rooms, or PvP squads for performance bonuses."),
    ("Corporate Structure", "Start as a Sole Trader. Restructure to Partnership, LLC, Public Company, Social Enterprise, or NGO. Each has different tax rates and perks."),
    ("Jurisdiction", "Your country drives the tax wrappers, retirement accounts, and regulators you see in Learn and Exchange. Pick it on first launch, change it anytime in Settings."),
    ("Game Tick", "The economy updates every 30 seconds: income arrives, expenses deduct, board patience shifts, and heat decays."),
    ("Shadow Ops", "High-risk covert operations (cyber, financial, physical). Big rewards but raises heat significantly."),
]

for name, desc in mechanics:
    story.append(Paragraph(f'<bullet>&bull;</bullet> <b>{name}</b> &mdash; {desc}', bold_bullet))

# ── Controls ──
story.append(Paragraph("Controls", h1))

controls_data = [
    ["Action", "Desktop", "Mobile"],
    ["Navigate tabs", "Top nav bar", "Bottom nav bar"],
    ["Command Terminal", "Cmd+K / Ctrl+K", "Tap CMD button"],
    ["Dev Panel (beta / admin only)", "F2", "Tap DEV button"],
    ["Change jurisdiction", "Settings > Country", "Settings > Country"],
    ["Sign Out", "Click EXIT", "Click EXIT"],
    ["Retract nav", "Click RETRACT handle", "Tap RETRACT handle"],
]

t = Table(controls_data, colWidths=[4.5*cm, 5.5*cm, 5.5*cm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_LIGHT),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e5e7eb')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(t)

# ── Player Notes ──
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("Player Notes", h1))

warn_style = ParagraphStyle('Warn', fontName='Helvetica', fontSize=10, textColor=HexColor('#92400e'), leading=15, spaceAfter=4, leftIndent=16, bulletIndent=4)

notes = [
    "If the game gets stuck or shows stale data, clear localStorage: <b>DevTools &rarr; Application &rarr; Storage &rarr; Clear site data</b>.",
    "Your save is synced to Supabase automatically; logging in on another device restores your progress.",
    "Localized content (UK ISAs, US IRAs, FR PEA, DE Riester, etc.) appears only for countries we've mapped - pick a supported country for the richest experience.",
    "The <b>Dev Panel</b> (F2) is gated to admins and approved beta testers.",
    "Works on desktop and mobile browsers. Chrome, Safari, Firefox, and Edge are all supported.",
    "Found a bug or have feedback? Open an issue at the game's support page - screenshots and reproduction steps are gold.",
]

for note in notes:
    story.append(Paragraph(f'<bullet>&bull;</bullet> {note}', warn_style))

# ── Footer ──
story.append(Spacer(1, 1*cm))
story.append(HRFlowable(width="40%", thickness=0.5, color=HexColor('#d1d5db'), spaceBefore=10, spaceAfter=10, hAlign='CENTER'))
story.append(Paragraph("AEGIS Empire  |  Quadratic Labs  |  April 2026", small))
story.append(Paragraph("v1.0 - Public Release", small))

# Build
doc.build(story)
print(f"PDF created: {output_path}")
