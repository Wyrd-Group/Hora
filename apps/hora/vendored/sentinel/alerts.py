"""Alert dataclass and formatting."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import json


@dataclass
class Alert:
    alert_type: str          # 'value_bet' | 'arbitrage' | 'forecast_breakout' | 'portfolio_drift' | 'macro_event'
    severity: str            # 'low' | 'medium' | 'high' | 'critical'
    title: str               # Short title for the notification
    summary: str             # 1-2 sentence summary
    details: dict            # Full data from the scanner
    recommendation: str      # What to do
    stake_eur: Optional[float] = None  # Recommended stake if applicable
    edge_pct: Optional[float] = None   # Model edge if applicable
    confidence: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    acknowledged: bool = False
    
    def format_whatsapp(self) -> str:
        """Format alert for WhatsApp message (plain text, no markdown)."""
        severity_emoji = {'low': 'ℹ️', 'medium': '⚠️', 'high': '🔴', 'critical': '🚨'}
        emoji = severity_emoji.get(self.severity, '📊')
        
        msg = f"{emoji} {self.title}\n\n"
        msg += f"{self.summary}\n\n"
        
        if self.edge_pct:
            msg += f"Edge: {self.edge_pct:.1f}%\n"
        if self.confidence:
            msg += f"Confidence: {self.confidence:.0%}\n"
        if self.stake_eur:
            msg += f"Suggested stake: €{self.stake_eur:.0f}\n"
        
        msg += f"\n{self.recommendation}\n"
        msg += f"\n⏰ {self.timestamp[:16]}"
        
        return msg
    
    def format_console(self) -> str:
        """Format alert for console output."""
        severity_emoji = {'low': 'ℹ️', 'medium': '⚠️', 'high': '🔴', 'critical': '🚨'}
        emoji = severity_emoji.get(self.severity, '📊')
        
        msg = f"\n{emoji} [{self.alert_type.upper()}] {self.title}\n"
        msg += f"{'─' * 60}\n"
        msg += f"Severity: {self.severity.upper()}\n"
        msg += f"Summary:  {self.summary}\n"
        
        if self.edge_pct:
            msg += f"Edge:     {self.edge_pct:.1f}%\n"
        if self.confidence:
            msg += f"Confidence: {self.confidence:.0%}\n"
        if self.stake_eur:
            msg += f"Stake:    €{self.stake_eur:.0f}\n"
        
        msg += f"\nAction:   {self.recommendation}\n"
        msg += f"Time:     {self.timestamp}\n"
        msg += f"{'─' * 60}\n"
        
        return msg
    
    def to_dict(self):
        return {
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'summary': self.summary,
            'details': self.details,
            'recommendation': self.recommendation,
            'stake_eur': self.stake_eur,
            'edge_pct': self.edge_pct,
            'confidence': self.confidence,
            'timestamp': self.timestamp,
            'acknowledged': self.acknowledged,
        }
