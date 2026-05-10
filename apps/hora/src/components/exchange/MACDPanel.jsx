import React, { useMemo, useRef, useEffect } from 'react';
import { macd } from '../../lib/indicators';

/**
 * MACDPanel — Sub-chart showing MACD line, signal line, and histogram bars.
 *
 * Props:
 *   priceHistory: number[] — closing prices
 *   width: number          — pixel width
 */
const MACDPanel = ({ priceHistory = [], width = 600 }) => {
  const canvasRef = useRef(null);
  const height = 80;

  const macdData = useMemo(
    () => macd(priceHistory, 12, 26, 9),
    [priceHistory],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 27) return;

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

    const { macd: ml, signal: sl, histogram: hist } = macdData;

    // Find max absolute value for Y scaling
    const allVals = [...ml, ...sl, ...hist].filter((v) => v !== null);
    if (allVals.length === 0) return;
    const absMax = Math.max(
      Math.abs(Math.min(...allVals)),
      Math.abs(Math.max(...allVals)),
    ) || 1;

    const toY = (v) => pad.top + (1 - (v + absMax) / (2 * absMax)) * cH;
    const toX = (i) => pad.left + (i / Math.max(ml.length - 1, 1)) * cW;

    // Zero line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, toY(0));
    ctx.lineTo(width - pad.right, toY(0));
    ctx.stroke();

    // Histogram bars
    const barW = Math.max(1, (cW / ml.length) * 0.5);
    hist.forEach((v, i) => {
      if (v === null) return;
      ctx.fillStyle = v >= 0 ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.5)';
      const x = toX(i);
      const y0 = toY(0);
      const y1 = toY(v);
      ctx.fillRect(x - barW / 2, Math.min(y0, y1), barW, Math.abs(y1 - y0));
    });

    // MACD line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    ml.forEach((v, i) => {
      if (v === null) { started = false; return; }
      if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
      else ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // Signal line
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    started = false;
    sl.forEach((v, i) => {
      if (v === null) { started = false; return; }
      if (!started) { ctx.moveTo(toX(i), toY(v)); started = true; }
      else ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '9px monospace';
    ctx.fillText('MACD(12,26,9)', pad.left, height - 3);

    // Legend dots
    const legendY = height - 3;
    const labelOffset = 95;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(pad.left + labelOffset, legendY - 5, 6, 2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.fillText('MACD', pad.left + labelOffset + 8, legendY);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(pad.left + labelOffset + 40, legendY - 5, 6, 2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.fillText('Signal', pad.left + labelOffset + 48, legendY);
  }, [macdData, priceHistory, width]);

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

export default MACDPanel;
