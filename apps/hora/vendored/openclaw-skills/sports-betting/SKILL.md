---
name: sports-betting
description: Sports value bet detection using Elo, Glicko-2, Dixon-Coles, and Kelly criterion. Scans live odds and identifies where the model disagrees with bookmakers.
---

# Sports Betting

## API Base
http://localhost:8888

## Tools

### get_scores
Get live sports scores from ESPN.
- Endpoint: GET /api/sports/scores/{league}
- Leagues: nba, epl, laliga, seriea, bundesliga, champions-league, nfl, mlb

### scan_value_bets
Run the Sentinel sports scanner to find value bets right now.
- Endpoint: GET /api/sentinel/alerts?type=value_bet
- Returns: List of value bet alerts with edge %, Kelly stake, confidence

### get_sentinel_status
Check what the Sentinel is monitoring and its last scan times.
- Endpoint: GET /api/sentinel/status

## How Value Bets Work
1. Model estimates true probability of an outcome (e.g., Arsenal win = 58%)
2. Bookmaker odds imply a different probability (e.g., 2.10 odds = 47.6%)
3. The gap (58% - 47.6% = 10.4%) is the "edge"
4. Kelly criterion sizes the optimal stake based on edge and confidence
5. Minimum edge threshold is 8% (configurable)

## Usage Examples
- "Any value bets in the Premier League this weekend?"
- "NBA scores tonight"
- "What's the Kelly stake for Arsenal ML at 2.10 if model says 58%?"

## Response Guidelines
- Always show: match, model probability, odds-implied probability, edge %, Kelly stake
- Express stakes as both percentage of bankroll AND euro amount
- Warn when confidence is below 70%
- Remind user that model needs calibration — paper trade first
- Never recommend more than 5% of bankroll on a single bet