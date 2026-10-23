import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Phone, Lock, ArrowRight, ShieldCheck, User as UserIcon, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'otp' or 'password'
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');

  // OTP flow state
  const [phone, setPhone] = useState('+919876543210'); // Default demo phone
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [demoCode, setDemoCode] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Password flow state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Return to previous page or intended booking
  const from = (location.state as any)?.from?.pathname || '/';

  // Request Demo OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (res.success) {
        setDemoCode(res.demo_otp);
        setEnteredOtp(res.demo_otp); // Auto-populate for extreme convenience in demonstration
        setOtpStep('verify');
      } else {
        setError(res.error || 'Failed to request OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Verify Demo OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code: enteredOtp, name: userName }),
      });

      if (res.success && res.user) {
        login(res.user);
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Email/Password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.user) {
        login(res.user);
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-parko-ivory">
      <div className="max-w-md w-full bg-white rounded-3xl border border-parko-border shadow-lift p-8 relative overflow-hidden">
        
        {/* Soft pink accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-parko-pink/30 rounded-bl-full pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-parko-charcoal text-white flex items-center justify-center mx-auto mb-3 font-extrabold text-xl shadow-soft">
            P
          </div>
          <h2 className="text-2xl font-extrabold text-parko-charcoal tracking-tight">
            Welcome to Parko
          </h2>
          <p className="text-xs text-parko-muted mt-1">
            Access bookings, route disclosures, and space listings
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-parko-sand/60 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setAuthMode('otp'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              authMode === 'otp'
                ? 'bg-white text-parko-charcoal shadow-xs'
                : 'text-parko-muted hover:text-parko-charcoal'
            }`}
          >
            Phone & Demo OTP
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              authMode === 'password'
                ? 'bg-white text-parko-charcoal shadow-xs'
                : 'text-parko-muted hover:text-parko-charcoal'
            }`}
          >
            Email & Password
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Primary flow: Phone OTP */}
        {authMode === 'otp' && (
          <div>
            {otpStep === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-parko-charcoal mb-1">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-parko-muted absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-parko-border bg-parko-sand/30 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-parko-coral"
                    />
                  </div>
                  <p className="text-[11px] text-parko-muted mt-1">
                    Simulated prototype: An on-screen demo code will be generated.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Generating...' : 'Get Demo Code'}
                  <ArrowRight className="w-3.5 h-3.5 text-parko-coral" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Clearly labeled Demo Area */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Simulated Demo OTP
                  </div>
                  <div className="text-2xl font-black tracking-widest text-emerald-700 font-mono">
                    {demoCode}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">
                    Valid for 5 minutes. No real SMS dispatched.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-parko-charcoal mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-full py-2.5 text-center tracking-widest text-lg font-bold rounded-xl border border-parko-border bg-white focus:outline-none focus:ring-2 focus:ring-parko-coral"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-parko-charcoal mb-1">
                    Your Name (optional for new drivers)
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Aditya Saraf"
                    className="w-full px-3 py-2 rounded-xl border border-parko-border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-parko-coral"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpStep('request')}
                    className="w-1/3 py-2.5 rounded-xl border border-parko-border text-xs font-bold text-parko-charcoal hover:bg-parko-sand"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 rounded-xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-soft"
                  >
                    {loading ? 'Verifying...' : 'Sign In with OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Alternative flow: Email & Password */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-parko-muted absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@parko.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-parko-border bg-parko-sand/30 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-parko-coral"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-parko-charcoal mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-parko-muted absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-parko-border bg-parko-sand/30 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-parko-coral"
                />
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <span className="font-bold">Demo Admin Credentials:</span><br />
              Email: <code>admin@parko.com</code> &bull; Password: <code>password123</code>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-parko-charcoal hover:bg-black text-white font-bold text-xs shadow-soft transition-all"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-[11px] text-parko-muted">
          By signing in, you agree to Parko simulated terms & policies.
        </div>
      </div>
    </div>
  );
};
