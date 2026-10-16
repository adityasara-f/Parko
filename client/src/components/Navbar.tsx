import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, LayoutDashboard, User as UserIcon, ShieldAlert, LogOut, PlusCircle, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-parko-ivory/90 backdrop-blur-md border-b border-parko-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-parko-charcoal flex items-center justify-center text-white shadow-soft group-hover:bg-parko-coral transition-colors">
            <span className="font-extrabold text-lg tracking-tighter">P</span>
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-parko-charcoal">
            parko<span className="text-parko-coral">.</span>
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal/80 hover:text-parko-charcoal hover:bg-parko-sand/60 transition-colors"
          >
            <MapPin className="w-4 h-4 text-parko-coral" />
            Find Parking
          </Link>

          {user && (
            <Link
              to="/bookings"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal/80 hover:text-parko-charcoal hover:bg-parko-sand/60 transition-colors"
            >
              <Calendar className="w-4 h-4 text-parko-charcoal/60" />
              My Bookings
            </Link>
          )}

          <Link
            to="/owner"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal/80 hover:text-parko-charcoal hover:bg-parko-sand/60 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-parko-charcoal/60" />
            Owner View
          </Link>

          {user?.is_admin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* User / Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/owner/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-parko-charcoal/15 text-xs font-bold text-parko-charcoal hover:border-parko-charcoal hover:bg-white transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-parko-coral" />
            List your space
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-parko-sand/60 hover:bg-parko-sand text-xs font-semibold text-parko-charcoal transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-parko-charcoal text-white flex items-center justify-center font-bold text-[11px]">
                  {user.name.charAt(0)}
                </div>
                <span>{user.name.split(' ')[0]}</span>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-xl text-parko-muted hover:text-parko-charcoal hover:bg-parko-sand/60 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-parko-charcoal text-white text-xs font-bold hover:bg-black transition-colors shadow-soft"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-parko-charcoal hover:bg-parko-sand"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-parko-border bg-parko-ivory px-4 py-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal hover:bg-parko-sand"
          >
            Find Parking
          </Link>
          {user && (
            <Link
              to="/bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal hover:bg-parko-sand"
            >
              My Bookings
            </Link>
          )}
          <Link
            to="/owner"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-parko-charcoal hover:bg-parko-sand"
          >
            Owner View
          </Link>
          {user?.is_admin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50"
            >
              Admin Portal
            </Link>
          )}
          <div className="pt-2 border-t border-parko-border flex justify-between items-center">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-bold text-parko-charcoal"
                >
                  {user.name} ({user.phone})
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-600 font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-xl bg-parko-charcoal text-white text-sm font-bold"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
