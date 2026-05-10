/**
 * F1 Circuit SVG Renderer Component
 * 
 * Uses real F1 circuit SVG path data from:
 * https://github.com/julesr0y/f1-circuits-svg
 * 
 * Includes 24 F1 circuits with detailed, high-quality SVG paths
 */

import React, { useState } from 'react';
import circuitsData from '../../../../data/f1_circuits_data.json';

const F1CircuitRenderer = () => {
  const [selectedCircuit, setSelectedCircuit] = useState('monaco-6');
  const circuits = circuitsData.circuits;
  const currentCircuit = circuits[selectedCircuit];

  return (
    <div className="f1-circuit-renderer">
      <div className="controls">
        <label htmlFor="circuit-select">Select Circuit:</label>
        <select 
          id="circuit-select"
          value={selectedCircuit}
          onChange={(e) => setSelectedCircuit(e.target.value)}
        >
          {Object.entries(circuits).map(([key, circuit]) => (
            <option key={key} value={key}>
              {circuit.name} ({circuit.country})
            </option>
          ))}
        </select>
      </div>

      {currentCircuit && (
        <div className="circuit-info">
          <h2>{currentCircuit.name}</h2>
          <p>Country: {currentCircuit.country}</p>
          <p>Layout Version: {currentCircuit.layout_version}</p>
          <p>SVG Path Length: {currentCircuit.svg_path_d.length} characters</p>
        </div>
      )}

      <svg 
        viewBox="0 0 800 600" 
        className="circuit-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {currentCircuit && (
          <path
            d={currentCircuit.svg_path_d}
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
};

export default F1CircuitRenderer;

/*
 * USAGE:
 * 
 * 1. Place f1_circuits_data.json in the same directory as this component
 * 2. Import and use the component:
 * 
 *    import F1CircuitRenderer from './F1CircuitRenderer';
 *    
 *    function App() {
 *      return <F1CircuitRenderer />;
 *    }
 * 
 * 3. Add CSS styling:
 * 
 *    .f1-circuit-renderer {
 *      padding: 20px;
 *      max-width: 1000px;
 *      margin: 0 auto;
 *    }
 * 
 *    .controls {
 *      margin-bottom: 20px;
 *    }
 * 
 *    .controls select {
 *      padding: 8px;
 *      font-size: 14px;
 *      margin-left: 10px;
 *    }
 * 
 *    .circuit-info {
 *      margin-bottom: 20px;
 *      font-family: monospace;
 *    }
 * 
 *    .circuit-svg {
 *      width: 100%;
 *      max-width: 800px;
 *      border: 1px solid #ccc;
 *      background: #f9f9f9;
 *    }
 */
