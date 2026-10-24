# IPL Auction Arena — Multiplayer Cricket Auction Simulator

A real-time, mobile-first multiplayer IPL Auction web application where friends can join the same online auction room from their phones or laptops, choose official franchises, retain star players, bid against each other in real-time, and build their ultimate squads.

## Features

- **All 10 Official IPL Franchises**:
  - Chennai Super Kings (CSK)
  - Mumbai Indians (MI)
  - Royal Challengers Bengaluru (RCB)
  - Kolkata Knight Riders (KKR)
  - Sunrisers Hyderabad (SRH)
  - Rajasthan Royals (RR)
  - Delhi Capitals (DC)
  - Punjab Kings (PBKS)
  - Gujarat Titans (GT)
  - Lucknow Super Giants (LSG)
  Each with official primary and secondary team branding, authentic stadiums, championship counters, and purse limits.

- **Verified Active Player Pool (2025/2026 Cutoff)**:
  - Curated active, eligible, non-retired players across Marquee, Batters, Fast Bowlers, Spinners, All-Rounders, Wicketkeepers, and Uncapped stars.
  - Authentic base prices, real-world current teams (for RTM logic), overseas flags, batting and bowling styles.
  - In-app Player Management modal with CSV/JSON import, duplicate prevention, and real-time custom player addition.

- **Multiplayer Synchronized Rooms**:
  - Private rooms with 6-character room codes and one-click shareable invitation links.
  - 1-Franchise-per-user enforcement with live readiness indicators.
  - Computer AI Bots: Unassigned franchises can be automated with Easy, Normal, or Competitive AI strategies.
  - Solo Simulation Mode: Test the entire auction against 9 AI franchises instantly.

- **Mega Auction & Mini Auction Rulesets**:
  - **Mega Auction**: Pre-auction player retention phase (up to 6 players per team), official retention deduction slabs, and live Right To Match (RTM) opportunities.
  - **Mini Auction**: Direct auction with ₹100 Cr purse.
  - Minimum squad reserve purse validation (reserves at least ₹0.30 Cr per remaining required slot so teams can fill their squads).
  - Maximum overseas constraint (max 8 overseas per squad).

- **Broadcast-Grade Live Auction Room**:
  - Authoritative synchronized countdown deadline.
  - Next minimum valid increment calculation (+10L, +20L, +25L, +50L).
  - Web Audio procedural sound engine (hammer gavel knocks, bid chimes, countdown ticks, celebration fanfare, unsold buzzers) — zero external audio dependencies.
  - Confetti celebration on high-profile signings.
  - Optional Gemini AI broadcast commentary stream with tactical scouting insights.

- **Post-Auction Analytics & Shareable Results**:
  - Complete 10-team roster breakdown with roles, overseas limits, and expenditure.
  - Leaderboards for most expensive buys and bargain acquisitions.
  - Automated squad balance rating evaluating batting, bowling, all-round, and wicketkeeper depth.

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Google Gen AI SDK (`@google/genai`) for live commentary.
- **Database & Sync**: Firebase Cloud Firestore with hardened ABAC security rules and real-time document listeners.
- **Authentication**: Firebase Authentication supporting Google Sign-In and instant Guest Player profiles.

## Environment Variables

Defined in `.env.example`:
- `GEMINI_API_KEY`: API key for Gemini commentary and player scouting insights.
- `APP_URL`: The hosted public URL.

## Database & Security Rules

Firestore security rules in `firestore.rules` protect room creation, membership authorization, team states, bids, and chat messages using the Eight Pillars of Zero-Trust Security. Rules are deployed directly to Firebase Firestore.

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
