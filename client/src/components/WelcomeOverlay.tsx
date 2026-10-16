import React, { useState, useEffect } from 'react';
import { ArrowRight, Compass, ShieldCheck, Zap } from 'lucide-react';

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the welcome overlay
    const hasSeen = localStorage.getItem('parko_welcome_seen');
    if (!hasSeen) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('parko_welcome_seen', 'true');
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-parko-charcoal/40 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-lg w-full bg-parko-ivory border border-parko-border rounded-3xl p-8 shadow-2xl overflow-hidden">
        
        {/* Soft pink top accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-parko-pink/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-parko-coral/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-parko-border shadow-xs mb-6">
            <span className="w-2 h-2 rounded-full bg-parko-coral animate-pulse" />
            <span className="text-xs font-bold text-parko-charcoal uppercase tracking-wider">
              Vellore Live Demonstration
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-parko-charcoal tracking-tight leading-tight mb-3">
            Shared parking, <br />
            <span className="text-parko-coral">made effortlessly simple.</span>
          </h1>

          <p className="text-sm text-parko-charcoal/70 leading-relaxed mb-6">
            Parko connects drivers directly with verified private spaces, driveways, and shaded bays. Instant booking, exact route previews, and transparent pricing.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="p-3 bg-white/80 rounded-2xl border border-parko-border text-center">
              <Zap className="w-5 h-5 mx-auto text-parko-coral mb-1" />
              <div className="text-[11px] font-bold text-parko-charcoal">Instant Hold</div>
              <div className="text-[10px] text-parko-muted">3-min checkout</div>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-parko-border text-center">
              <Compass className="w-5 h-5 mx-auto text-parko-charcoal mb-1" />
              <div className="text-[11px] font-bold text-parko-charcoal">Route Preview</div>
              <div className="text-[10px] text-parko-muted">Private addresses</div>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-parko-border text-center">
              <ShieldCheck className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <div className="text-[11px] font-bold text-parko-charcoal">Verified Spots</div>
              <div className="text-[10px] text-parko-muted">Admin monitored</div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-parko-charcoal hover:bg-black text-white font-bold text-sm shadow-lift transition-all transform active:scale-[0.98]"
          >
            Find your parking
            <ArrowRight className="w-4 h-4 text-parko-coral" />
          </button>
        </div>
      </div>
    </div>
  );
};
