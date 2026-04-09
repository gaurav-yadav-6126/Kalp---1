import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { INDIAN_CITIES, CITY_COLLEGES } from '../constants';

export default function CreateEvent() {
  const { user, profile, isAuthReady } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    bookingCloseDate: '',
    bookingCloseTime: '',
    venue: '',
    city: '',
    category: 'Music',
    totalSeats: 100,
    price: 0,
    hasEarlyBird: false,
    imageUrl: ''
  });

  const categories = ['Music', 'Tech', 'Sports', 'Workshop', 'Arts'];

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

    if (eventId) {
      const loadEvent = async () => {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          const date = data.date.toDate();
          const closeDate = data.bookingCloseTime ? data.bookingCloseTime.toDate() : null;
          setFormData({
            title: data.title,
            description: data.description,
            date: date.toISOString().split('T')[0],
            time: date.toTimeString().split(' ')[0].substring(0, 5),
            bookingCloseDate: closeDate ? closeDate.toISOString().split('T')[0] : '',
            bookingCloseTime: closeDate ? closeDate.toTimeString().split(' ')[0].substring(0, 5) : '',
            venue: data.venue,
            city: data.city || '',
            category: data.category,
            totalSeats: data.totalSeats,
            price: data.price || 0,
            hasEarlyBird: data.hasEarlyBird || false,
            imageUrl: data.imageUrl
          });
        }
      };
      loadEvent();
    }
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`);
      const closeDate = formData.bookingCloseDate && formData.bookingCloseTime 
        ? new Date(`${formData.bookingCloseDate}T${formData.bookingCloseTime}`) 
        : null;
        
      const eventData: any = {
        title: formData.title,
        description: formData.description,
        date: Timestamp.fromDate(eventDate),
        venue: formData.venue,
        city: formData.city,
        category: formData.category,
        totalSeats: Number(formData.totalSeats),
        price: Number(formData.price),
        hasEarlyBird: formData.hasEarlyBird,
        imageUrl: formData.imageUrl || `https://picsum.photos/seed/${formData.title}/800/600`,
        organizerId: user.uid,
        organizerName: user.displayName || 'Anonymous',
        bookingCloseTime: closeDate ? Timestamp.fromDate(closeDate) : deleteField()
      };

      if (eventId) {
        try {
          const eventRef = doc(db, 'events', eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            const oldData = eventSnap.data();
            const seatDiff = Number(formData.totalSeats) - oldData.totalSeats;
            eventData.availableSeats = Math.max(0, oldData.availableSeats + seatDiff);
          }
          await updateDoc(eventRef, eventData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
        }
        toast.success('Event updated successfully!');
      } else {
        try {
          eventData.availableSeats = Number(formData.totalSeats);
          eventData.createdAt = serverTimestamp();
          await addDoc(collection(db, 'events'), eventData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'events');
        }
        toast.success('Event created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-colors font-bold"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>

      <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 sm:p-12 shadow-xl border border-outline-variant/10">
        <h1 className="text-4xl font-black text-on-surface mb-8 tracking-tighter font-headline">
          {eventId ? 'Edit Event' : 'Host a New Event'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Event Title</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Annual Tech Symposium 2026"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Description</label>
              <textarea 
                required
                rows={4}
                placeholder="Tell people what your event is about..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Date</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">calendar_today</span>
                <input 
                  required
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time</label>
              <input 
                required
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Booking Close Date (Optional)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">event_busy</span>
                <input 
                  type="date" 
                  value={formData.bookingCloseDate}
                  onChange={(e) => setFormData({...formData, bookingCloseDate: e.target.value})}
                  className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Booking Close Time (Optional)</label>
              <input 
                type="time" 
                value={formData.bookingCloseTime}
                onChange={(e) => setFormData({...formData, bookingCloseTime: e.target.value})}
                className="w-full px-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">City</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">location_city</span>
                <select 
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value, venue: ''})}
                  className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium appearance-none"
                >
                  <option value="">Select a city</option>
                  {INDIAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Venue / Location</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">location_on</span>
                {formData.city && CITY_COLLEGES[formData.city] ? (
                  <select
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({...formData, venue: e.target.value})}
                    className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium appearance-none"
                  >
                    <option value="">Select a venue</option>
                    {CITY_COLLEGES[formData.city].map(college => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Main Auditorium, Block C"
                    value={formData.venue}
                    onChange={(e) => setFormData({...formData, venue: e.target.value})}
                    className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Capacity</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">groups</span>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={formData.totalSeats}
                  onChange={(e) => setFormData({...formData, totalSeats: Number(e.target.value)})}
                  className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ticket Price (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">payments</span>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15">
            <input
              type="checkbox"
              id="earlyBird"
              checked={formData.hasEarlyBird}
              onChange={(e) => setFormData({...formData, hasEarlyBird: e.target.checked})}
              className="w-5 h-5 rounded border-outline-variant/30 text-primary focus:ring-primary"
            />
            <label htmlFor="earlyBird" className="flex flex-col cursor-pointer">
              <span className="font-bold text-sm">Enable Early Bird Pricing</span>
              <span className="text-xs text-on-surface-variant">The first 25% of tickets booked will be at a 75% discount.</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">tag</span>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none font-medium"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cover Image URL (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">image</span>
              <input 
                type="url" 
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full pl-12 pr-6 py-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
              />
            </div>
          </div>

          <div className="pt-8 flex gap-4">
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 bg-surface-container text-on-surface font-bold rounded-2xl hover:bg-surface-container-high transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-primary text-on-primary font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : (eventId ? 'Update Event' : 'Launch Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
