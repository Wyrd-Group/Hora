"""
Sentinel Daemon — Autonomous opportunity scanner.
Runs all scanners on their configured intervals and dispatches alerts.

Usage:
    python -m sentinel.daemon           # Run daemon
    python -m sentinel.daemon --once    # Run all scanners once and exit
    python -m sentinel.daemon --test    # Generate test alert
"""

import logging
import json
import argparse
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Callable
from zoneinfo import ZoneInfo

from .config import SENTINEL_CONFIG
from .alerts import Alert
from .scanners.prediction_scanner import scan_prediction_markets
from .scanners.sports_scanner import scan_sports_value_bets
from .scanners.forecast_scanner import scan_forecast_breakout
from .scanners.portfolio_scanner import scan_portfolio_drift
from .scanners.macro_scanner import scan_macro_events

# ─── Setup logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger(__name__)

# ─── Alert storage ───────────────────────────────────────────────
ALERTS_LOG_FILE = Path(__file__).parent / 'alerts_log.json'


def load_alerts_log() -> List[dict]:
    """Load historical alerts from JSON log."""
    if ALERTS_LOG_FILE.exists():
        try:
            with open(ALERTS_LOG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load alerts log: {e}")
    return []


def save_alerts_log(alerts: List[dict]) -> None:
    """Append new alerts to JSON log."""
    try:
        log = load_alerts_log()
        log.extend(alerts)
        
        ALERTS_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ALERTS_LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save alerts log: {e}")


def is_within_active_hours() -> bool:
    """Check if current time is within configured active hours."""
    try:
        tz = ZoneInfo(SENTINEL_CONFIG['timezone'])
        now = datetime.now(tz)
        current_time = now.strftime('%H:%M')
        
        start, end = SENTINEL_CONFIG['active_hours']
        
        # Simple string comparison works if hours are 24-hour format
        if start <= end:
            return start <= current_time <= end
        else:
            # Handle wrap-around (e.g., 22:00 to 05:00)
            return current_time >= start or current_time <= end
    
    except Exception as e:
        logger.error(f"Failed to check active hours: {e}")
        return True  # Default to allowing alerts


def filter_alerts(alerts: List[Alert]) -> List[Alert]:
    """
    Filter alerts by:
    - Active hours
    - Minimum confidence
    - Minimum edge (for value bets)
    """
    filtered = []
    
    for alert in alerts:
        # Check active hours
        if not is_within_active_hours():
            logger.debug(f"Filtered {alert.title} (outside active hours)")
            continue
        
        # Check minimum confidence
        if alert.confidence < SENTINEL_CONFIG['min_confidence']:
            logger.debug(f"Filtered {alert.title} (confidence {alert.confidence:.0%} < {SENTINEL_CONFIG['min_confidence']:.0%})")
            continue
        
        # Check minimum edge for value bets
        if alert.alert_type == 'value_bet' and alert.edge_pct:
            if alert.edge_pct < SENTINEL_CONFIG['min_edge_pct']:
                logger.debug(f"Filtered {alert.title} (edge {alert.edge_pct:.1f}% < {SENTINEL_CONFIG['min_edge_pct']:.1f}%)")
                continue
        
        filtered.append(alert)
    
    return filtered


def dispatch_alert(alert: Alert) -> None:
    """Send alert via configured channel."""
    channel = SENTINEL_CONFIG['alert_channel']
    
    if channel == 'console':
        print(alert.format_console())
        logger.info(f"Alert dispatched: {alert.title}")
    
    elif channel == 'whatsapp':
        phone = SENTINEL_CONFIG['phone_number']
        if not phone:
            logger.warning("WhatsApp channel selected but no phone_number configured")
            print(alert.format_console())
        else:
            # Integration point: would call OpenClaw or Twilio here
            logger.info(f"WhatsApp alert to {phone}: {alert.title}")
            # send_whatsapp(phone, alert.format_whatsapp())
    
    elif channel == 'telegram':
        # Integration point: would call Telegram bot here
        logger.info(f"Telegram alert: {alert.title}")
        # send_telegram(alert.format_console())
    
    else:
        logger.warning(f"Unknown channel: {channel}")
        print(alert.format_console())


def run_all_scanners() -> List[Alert]:
    """Run all scanners and collect alerts."""
    all_alerts = []
    scanners: List[tuple[str, Callable]] = [
        ('prediction_markets', scan_prediction_markets),
        ('sports_value_bets', scan_sports_value_bets),
        ('forecast_breakout', scan_forecast_breakout),
        ('portfolio_drift', scan_portfolio_drift),
        ('macro_events', scan_macro_events),
    ]
    
    for name, scanner_func in scanners:
        try:
            logger.info(f"Running {name} scanner...")
            alerts = scanner_func()
            if alerts:
                logger.info(f"{name} scanner returned {len(alerts)} alert(s)")
                all_alerts.extend(alerts)
            else:
                logger.info(f"{name} scanner returned no alerts")
        
        except Exception as e:
            logger.error(f"{name} scanner crashed: {e}", exc_info=True)
    
    return all_alerts


def run_daemon():
    """Run the Sentinel daemon indefinitely."""
    logger.info("Sentinel daemon starting...")
    logger.info(f"Configuration: {SENTINEL_CONFIG['timezone']}, {SENTINEL_CONFIG['active_hours']}, channel={SENTINEL_CONFIG['alert_channel']}")
    
    # Track last run times for each scanner
    last_runs = {}
    intervals = SENTINEL_CONFIG['intervals']
    
    try:
        while True:
            now = time.time()
            
            # Check which scanners should run
            alerts = []
            
            # Prediction markets (5 min)
            if now - last_runs.get('prediction_markets', 0) >= intervals['prediction_markets']:
                try:
                    a = scan_prediction_markets()
                    alerts.extend(a)
                    last_runs['prediction_markets'] = now
                except Exception as e:
                    logger.error(f"Prediction scanner failed: {e}")
            
            # Sports value bets (15 min)
            if now - last_runs.get('sports_value_bets', 0) >= intervals['sports_value_bets']:
                try:
                    a = scan_sports_value_bets()
                    alerts.extend(a)
                    last_runs['sports_value_bets'] = now
                except Exception as e:
                    logger.error(f"Sports scanner failed: {e}")
            
            # Forecast breakout (60 min)
            if now - last_runs.get('forecast_breakout', 0) >= intervals['forecast_breakout']:
                try:
                    a = scan_forecast_breakout()
                    alerts.extend(a)
                    last_runs['forecast_breakout'] = now
                except Exception as e:
                    logger.error(f"Forecast scanner failed: {e}")
            
            # Portfolio drift (24h)
            if now - last_runs.get('portfolio_drift', 0) >= intervals['portfolio_drift']:
                try:
                    a = scan_portfolio_drift()
                    alerts.extend(a)
                    last_runs['portfolio_drift'] = now
                except Exception as e:
                    logger.error(f"Portfolio scanner failed: {e}")
            
            # Macro events (24h)
            if now - last_runs.get('macro_events', 0) >= intervals['macro_events']:
                try:
                    a = scan_macro_events()
                    alerts.extend(a)
                    last_runs['macro_events'] = now
                except Exception as e:
                    logger.error(f"Macro scanner failed: {e}")
            
            # Filter and dispatch
            if alerts:
                filtered = filter_alerts(alerts)
                logger.info(f"Generated {len(alerts)} alerts, {len(filtered)} passed filters")
                
                for alert in filtered:
                    dispatch_alert(alert)
                    save_alerts_log([alert.to_dict()])
            
            # Sleep briefly before checking again
            time.sleep(10)
    
    except KeyboardInterrupt:
        logger.info("Sentinel daemon shutting down...")
    except Exception as e:
        logger.error(f"Daemon crashed: {e}", exc_info=True)
        sys.exit(1)


def run_once():
    """Run all scanners once and exit."""
    logger.info("Running all scanners once...")
    alerts = run_all_scanners()
    
    filtered = filter_alerts(alerts)
    logger.info(f"Generated {len(alerts)} alerts, {len(filtered)} passed filters")
    
    for alert in filtered:
        dispatch_alert(alert)
    
    save_alerts_log([alert.to_dict() for alert in alerts])


def generate_test_alert():
    """Generate a test alert to verify alert dispatch."""
    test_alert = Alert(
        alert_type='value_bet',
        severity='medium',
        title='TEST ALERT: Sentinel is operational',
        summary='This is a test alert from the Sentinel daemon.',
        details={
            'test': True,
            'timestamp': datetime.utcnow().isoformat(),
        },
        recommendation='No action needed. This is just a test.',
        stake_eur=100,
        edge_pct=12.5,
        confidence=0.85,
    )
    
    logger.info("Test alert generated")
    dispatch_alert(test_alert)
    save_alerts_log([test_alert.to_dict()])
    logger.info("Test alert saved")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Sentinel — Autonomous opportunity scanner')
    parser.add_argument('--once', action='store_true', help='Run all scanners once and exit')
    parser.add_argument('--test', action='store_true', help='Generate a test alert')
    args = parser.parse_args()
    
    if args.test:
        generate_test_alert()
    elif args.once:
        run_once()
    else:
        run_daemon()


if __name__ == '__main__':
    main()
