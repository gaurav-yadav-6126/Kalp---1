import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { Notification } from './types';
import Home from './pages/Home';
import EventDetails from './pages/EventDetails';
import MyBookings from './pages/MyBookings';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateEvent from './pages/CreateEvent';
import Scanner from './pages/Scanner';
import BookingDetails from './pages/BookingDetails';
import { LogOut } from 'lucide-react';
import { cn } from './lib/utils';

const AppContent: React.FC = () => {
  const { user, profile, signOut, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const isOrganizer = profile?.email === 'gy426408@gmail.com' || profile?.role === 'admin' || profile?.role === 'organizer';

  const navLinks = [
    { name: 'Discover', path: '/', icon: 'explore' },
    { name: 'Tickets', path: '/my-bookings', icon: 'confirmation_number' },
    ...(isOrganizer ? [{ name: 'Host', path: '/dashboard', icon: 'add_circle' }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body">
      {/* TopNavBar */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 shadow-[0_12px_32px_rgba(78,33,32,0.05)]">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-black text-primary tracking-tighter font-headline">Eventify</Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "font-headline font-bold text-sm tracking-tight transition-colors duration-300 pb-1",
                    isActive(link.path) 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-on-background/70 hover:text-primary"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="material-symbols-outlined text-on-surface-variant p-2 scale-95 active:opacity-80 transition-transform relative"
                  >
                    notifications
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-error rounded-full border-2 border-background"></span>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 z-50 overflow-hidden">
                      <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-xs bg-primary text-on-primary px-2 py-0.5 rounded-full">{unreadCount} new</span>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                if (!notif.read) markAsRead(notif.id);
                              }}
                              className={cn(
                                "p-4 border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors cursor-pointer",
                                !notif.read ? "bg-primary/5" : ""
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={cn("text-sm", !notif.read ? "font-bold text-primary" : "font-medium text-on-surface")}>
                                  {notif.title}
                                </h4>
                                {!notif.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5"></span>}
                              </div>
                              <p className="text-xs text-on-surface-variant leading-relaxed">{notif.message}</p>
                              <p className="text-[10px] text-on-surface-variant/70 mt-2 uppercase tracking-widest font-bold">
                                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just now'}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="group relative">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-primary-container cursor-pointer"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-4 border-b border-outline-variant/10">
                      <p className="font-bold text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/5 flex items-center gap-2 transition-colors rounded-b-xl"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => signInWithGoogle()}
                className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/dashboard" element={<OrganizerDashboard />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/edit-event/:eventId" element={<CreateEvent />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/booking/:bookingId" element={<BookingDetails />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full mt-auto">
        <div className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <span className="text-xl font-bold text-primary font-headline">Eventify</span>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-sm text-on-background opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Terms</a>
            <a className="text-sm text-on-background opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Privacy</a>
            <a className="text-sm text-on-background opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Safety Hub</a>
            <a className="text-sm text-on-background opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Green Badges</a>
          </div>
          <p className="text-sm text-on-background opacity-70">© 2024 Eventify Kinetic. Discover. Book. Belong.</p>
        </div>
      </footer>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 md:hidden bg-background/90 backdrop-blur-xl z-50 rounded-t-[1.5rem] shadow-[0_-8px_24px_rgba(78,33,32,0.08)] border-t border-outline-variant/15">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl px-4 py-2 transition-all",
              isActive(link.path)
                ? "bg-surface-container-low text-primary"
                : "text-on-background/60 hover:bg-surface-container-low"
            )}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{link.name}</span>
          </Link>
        ))}
        <Link
          to="/my-bookings"
          className={cn(
            "flex flex-col items-center justify-center rounded-xl px-4 py-2 transition-all",
            isActive('/my-bookings') ? "bg-surface-container-low text-primary" : "text-on-background/60 hover:bg-surface-container-low"
          )}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default AppContent;
