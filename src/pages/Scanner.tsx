import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const Scanner: React.FC = () => {
  const { user, profile, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<any>(null);
  const isProcessingRef = React.useRef(false);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      navigate('/');
      return;
    }

    // Redirect if not an organizer
    const isOrganizer = profile?.email === 'gy426408@gmail.com' || profile?.role === 'admin';
    if (!isOrganizer) {
      navigate('/');
      toast.error('Access denied. Organizer privileges required.');
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    async function onScanSuccess(decodedText: string) {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
      try {
        // The QR code contains the booking ID
        const bookingId = decodedText;
        const bookingRef = doc(db, 'bookings', bookingId);
        let bookingSnap;
        try {
          bookingSnap = await getDoc(bookingRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `bookings/${bookingId}`);
          return;
        }

        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          
          if (bookingData.status === 'used') {
            setScanResult({ status: 'error', message: 'Ticket already used!' });
            toast.error('Ticket already used!');
          } else if (bookingData.status === 'cancelled') {
            setScanResult({ status: 'error', message: 'Ticket has been cancelled!' });
            toast.error('Ticket has been cancelled!');
          } else {
            // Mark as used
            try {
              await updateDoc(bookingRef, { status: 'used' });
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
            }
            setScanResult({ 
              status: 'success', 
              message: 'Ticket Validated!',
              details: {
                event: bookingData.eventTitle,
                guests: bookingData.ticketCount,
                attendee: bookingData.attendeeName,
                email: bookingData.attendeeEmail
              }
            });
            toast.success('Ticket Validated Successfully!');
            
            // Navigate to the booking details page after a longer delay so they can read the name
            setTimeout(() => {
              navigate(`/booking/${bookingId}`);
            }, 4000);
          }
        } else {
          setScanResult({ status: 'error', message: 'Invalid Ticket QR Code' });
          toast.error('Invalid Ticket');
        }
      } catch (error) {
        console.error('Scan error:', error);
        if (error instanceof Error && error.message.includes('Firestore Error')) {
          // Already handled
        } else {
          toast.error('Error validating ticket');
        }
      } finally {
        isProcessingRef.current = false;
      }
    }

    function onScanFailure(error: any) {
      // Ignore scan failures
    }

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [user, isAuthReady, navigate, profile]);

  if (!user) return <div className="p-8 text-center">Please sign in to access the scanner.</div>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface mb-2">Ticket Scanner</h1>
          <p className="text-on-surface-variant font-medium">Validate entry passes in real-time.</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-3 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 overflow-hidden">
        <div id="reader" className="rounded-2xl overflow-hidden border-4 border-surface-container-low"></div>

        <AnimatePresence mode="wait">
          {scanResult && (
            <motion.div 
              key={scanResult.status + scanResult.message}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "mt-8 p-6 rounded-2xl border-2 flex items-start gap-4",
                scanResult.status === 'success' 
                  ? "bg-tertiary-container/10 border-tertiary/20 text-on-tertiary-container" 
                  : "bg-error-container/10 border-error/20 text-error"
              )}
            >
              <span className="material-symbols-outlined text-3xl">
                {scanResult.status === 'success' ? 'check_circle' : 'error'}
              </span>
              <div className="flex-grow">
                <h3 className="font-bold text-lg">{scanResult.message}</h3>
                {scanResult.details && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-surface-container-lowest/60 p-4 rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Attendee Info</p>
                      <p className="text-2xl font-black">{scanResult.details.attendee}</p>
                      <p className="text-sm font-medium opacity-80">{scanResult.details.email}</p>
                    </div>
                    <div className="text-sm opacity-80 space-y-1 px-1">
                      <p><strong>Event:</strong> {scanResult.details.event}</p>
                      <p><strong>Guests:</strong> {scanResult.details.guests}</p>
                    </div>
                    <p className="text-xs font-bold opacity-60 mt-4 animate-pulse">Navigating to details...</p>
                  </div>
                )}
                {scanResult.status === 'error' && (
                  <button 
                    onClick={() => setScanResult(null)}
                    className="mt-4 text-xs font-black uppercase tracking-widest underline"
                  >
                    Scan Next Ticket
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 bg-surface-container-low p-6 rounded-2xl">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">info</span>
            How to scan
          </h3>
          <ul className="text-sm text-on-surface-variant space-y-2">
            <li>• Position the QR code within the camera frame</li>
            <li>• Ensure there is enough lighting</li>
            <li>• Once validated, the ticket will be marked as "Used"</li>
          </ul>
        </div>
      </div>
    </main>
  );
};

export default Scanner;
