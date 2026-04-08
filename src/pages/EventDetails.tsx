import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Event, Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    if (user) {
      setAttendeeName(user.displayName || '');
      setAttendeeEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'events', id), (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() } as Event);
      } else {
        toast.error('Event not found');
        navigate('/');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `events/${id}`);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  const handleBooking = async () => {
    if (!user || !event || !id) {
      toast.error('Please sign in to book tickets');
      return;
    }

    if (ticketCount > event.availableSeats) {
      toast.error('Not enough seats available');
      return;
    }

    if (!attendeeName || !attendeeEmail) {
      toast.error('Please fill in attendee details');
      return;
    }

    setIsBooking(true);
    try {
      await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', id);
        let eventDoc;
        try {
          eventDoc = await transaction.get(eventRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `events/${id}`);
          return; // Should not reach here due to throw
        }
        
        if (!eventDoc.exists()) throw new Error('Event does not exist');
        
        const currentAvailable = eventDoc.data().availableSeats;
        if (currentAvailable < ticketCount) throw new Error('Not enough seats');

        const bookingRef = doc(collection(db, 'bookings'));
        const bookingData: Omit<Booking, 'id'> = {
          eventId: id,
          userId: user.uid,
          eventTitle: event.title,
          eventDate: event.date,
          ticketCount,
          totalPrice,
          attendeeName,
          attendeeEmail,
          status: 'confirmed',
          createdAt: serverTimestamp() as any,
          qrCode: bookingRef.id // Use the document ID as the QR code
        };

        const notificationRef = doc(collection(db, 'notifications'));
        const notificationData = {
          userId: event.organizerId,
          title: 'New Booking!',
          message: `${attendeeName} just booked ${ticketCount} ticket(s) for ${event.title}.`,
          read: false,
          createdAt: serverTimestamp(),
          type: 'booking'
        };

        transaction.set(bookingRef, bookingData);
        transaction.set(notificationRef, notificationData);
        transaction.update(eventRef, {
          availableSeats: currentAvailable - ticketCount
        });
      });

      toast.success('Tickets booked successfully!');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        navigate('/my-bookings');
      }, 3000);
    } catch (error) {
      console.error('Booking error:', error);
      if (error instanceof Error && error.message.includes('Firestore Error')) {
        // Already handled and logged
      } else {
        toast.error('Failed to book tickets. Please try again.');
      }
      setIsBooking(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!event) return null;

  const basePrice = event.price || 0;
  const earlyBirdCapacity = Math.floor(event.totalSeats * 0.25);
  const ticketsSold = event.totalSeats - event.availableSeats;
  
  let totalPrice = 0;
  let currentSold = ticketsSold;
  let earlyBirdTicketsApplied = 0;

  for (let i = 0; i < ticketCount; i++) {
    if (event.hasEarlyBird && currentSold < earlyBirdCapacity) {
      totalPrice += basePrice * 0.25; // 75% discount means they pay 25%
      earlyBirdTicketsApplied++;
    } else {
      totalPrice += basePrice;
    }
    currentSold++;
  }

  const isEarlyBirdActive = event.hasEarlyBird && ticketsSold < earlyBirdCapacity;
  const earlyBirdTicketsLeft = Math.max(0, earlyBirdCapacity - ticketsSold);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Media & Core Info */}
        <div className="lg:col-span-7 space-y-8">
          {/* Hero Poster Section */}
          <section className="overflow-hidden rounded-2xl bg-surface-container-high shadow-lg">
            <img 
              src={event.imageUrl} 
              alt={event.title}
              className="w-full h-[300px] md:h-[400px] object-cover"
            />
          </section>

          <div>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tighter mb-6 text-on-surface">{event.title}</h1>
            <div className="flex flex-col gap-4 text-on-surface-variant font-medium mb-8">
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                {event.date.toDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {event.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">location_on</span>
                {event.venue}
              </span>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
              <h3 className="font-headline text-xl font-bold mb-4">About the Event</h3>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Booking */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 bg-surface-container-lowest rounded-2xl p-8 shadow-xl border border-outline-variant/10">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-headline text-2xl font-black tracking-tight">Reserve Your Spot</h2>
                {isEarlyBirdActive && (
                  <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                    Early Bird Active
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                {event.availableSeats} seats remaining
              </p>
              
              {isEarlyBirdActive && (
                <div className="bg-primary-container/30 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">local_activity</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">75% Off Early Bird Discount!</p>
                    <p className="text-xs text-on-surface-variant">Only {earlyBirdTicketsLeft} discounted ticket{earlyBirdTicketsLeft !== 1 ? 's' : ''} remaining.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 mb-8">
              {/* Attendee Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary outline-none text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Email Address</label>
                  <input 
                    type="email" 
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-surface-container-low px-4 py-3 rounded-xl border border-outline-variant/20 focus:ring-2 focus:ring-primary outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>

              {/* Ticket Counter */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low/50">
                <span className="font-bold">Number of Tickets</span>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold hover:bg-surface-container-high transition-colors"
                  >-</button>
                  <span className="font-bold w-4 text-center">{ticketCount}</span>
                  <button 
                    onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold hover:bg-surface-container-high transition-colors"
                  >+</button>
                </div>
              </div>

              {/* Total Price */}
              <div className="pt-4 border-t border-outline-variant/10 space-y-2">
                {earlyBirdTicketsApplied > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Early Bird ({earlyBirdTicketsApplied}x)</span>
                    <span className="font-bold text-primary">₹{(basePrice * 0.25 * earlyBirdTicketsApplied).toFixed(2)}</span>
                  </div>
                )}
                {ticketCount - earlyBirdTicketsApplied > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Standard ({ticketCount - earlyBirdTicketsApplied}x)</span>
                    <span className="font-bold">₹{(basePrice * (ticketCount - earlyBirdTicketsApplied)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-on-surface-variant">Total Price</span>
                  <span className="font-headline text-3xl font-black text-primary">
                    {totalPrice === 0 ? 'Free' : `₹${totalPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Book Button */}
            <button 
              onClick={handleBooking}
              disabled={isBooking || event.availableSeats === 0}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBooking ? 'Processing...' : event.availableSeats === 0 ? 'Sold Out' : 'Book Tickets'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-primary/20 text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-6"
              >
                <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </motion.div>
              <h2 className="text-3xl font-black font-headline tracking-tighter mb-2">Confirmed!</h2>
              <p className="text-on-surface-variant font-medium mb-8">Your tickets are secured.</p>
              
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-primary"
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-4 animate-pulse">
                Redirecting to your tickets...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default EventDetails;
