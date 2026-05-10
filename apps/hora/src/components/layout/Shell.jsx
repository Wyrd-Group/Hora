import React from 'react';

const Shell = ({ children }) => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-tactical-bg text-tactical-text font-mono selection:bg-tactical-cyan/20 selection:text-white">
      {/* 
        This shell establishes the absolute bounds.
        Map sits at z-0 behind everything.
        Rails and Tickers sit at z-10 over the Map.
      */}
      {children}
    </div>
  );
};

export default Shell;
