import React, { useMemo, useRef, useEffect } from 'react';
import { rsi } from '../../lib/indicators';

/**
 * RSIPanel — Sub-chart showing RSI(14) line with overbought/oversold zones.
 *
 * Props:
 *   priceHistory: number[] — closing prices
 *   width: number          — pixel width
 */
const RSIPanel = ({ priceHistory = [], width = 600 }) => {
  const canvasRef = useRef(null);
  const height = 80;

  const rsiValues = useMemo(
    () => rsi(priceHistory, 14),
    [priceHistory],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 15) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 4, bottom: 14, left: 8, right: 50 };
    const cW = width - pad.left - pad.right;
    const cH = height - pad.top - pad.bottom;

    const toY = (v) => pad.top + (1 - v / 100) * cH;
    const toX = (i) => pad.left + (i / Math.max(rsiValues.length - 1, 1)) * cW;

    // Overbought zone fill (70-100)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
    ctx.fillRect(pad.left, toY(100), cW, toY(70) - toY(100));

    // Oversold zone fill (0-30)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.06)';
    ctx.fillRect(pad.left, toY(30), cW, toY(0) - toY(30));

    // Horizontal zone lines at 30, 50, 70
    [70, 50, 30].forEach((level) => {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(level));
      ctx.lineTo(width - pad.right, toY(level));
      ctx.stroke();
      ctx.setLineDash([]);

      // Level label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(level.toString(), width - pad.right + 6, toY(level) + 3);
    });

    // RSI line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    rsiValues.forEach((v, i) => {
      if (v === null) { started = false; return; }
      const x = toX(i);
      const y = toY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '9px monospace';
    ctx.fillText('RSI(14)', pad.left, height - 3);

    // Current value
    const lastVal = [...rsiValues].reverse().find((v) => v !== null);
    if (lastVal !== null && lastVal !== undefined) {
      const color = lastVal > 70 ? '#ef4444' : lastVal < 30 ? '#22c55e' : '#94a3b8';
      ctx.fillStyle = color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(lastVal.toFixed(1), width - pad.right + 6, height - 3);
    }
  }, [rsiValues, priceHistory, width]);

  return (
    <div className="w-full border-t border-tactical-border/30">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block"
      />
    </div>
  );
};

export default RSIPanel;
