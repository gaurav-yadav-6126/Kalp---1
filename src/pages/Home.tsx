import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Event } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, MapPin, Calendar, ArrowRight, Star, Verified } from 'lucide-react';
import { cn } from '../lib/utils';

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const eventsGridRef = React.useRef<HTMLDivElement>(null);

  const categories = [
    { name: 'All', icon: 'apps' },
    { name: 'Music', icon: 'festival' },
    { name: 'Tech', icon: 'devices' },
    { name: 'Sports', icon: 'sports_soccer' },
    { name: 'Workshop', icon: 'architecture' },
    { name: 'Arts', icon: 'palette' }
  ];

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredEvent = filteredEvents[0];

  return (
    <div className="max-w-7xl mx-auto w-full px-8 pt-8 pb-24 md:pb-12">
      {/* Hero Search & Categories */}
      <section className="mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight mb-8 leading-[1.1]"
        >
          The Kinetic <span className="text-primary italic">Pulse</span> <br/>of your City.
        </motion.h1>
        
        <div className="flex flex-wrap gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={cn(
                "px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all duration-300",
                selectedCategory === cat.name
                  ? "bg-primary text-on-primary shadow-lg scale-105"
                  : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
              )}
            >
              <span className="material-symbols-outlined">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative max-w-2xl mb-12">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </div>
          <input
            type="text"
            placeholder="Search nearby events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-low px-12 py-4 rounded-full border border-outline-variant/15 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium transition-all"
          />
        </div>
      </section>

      <div className="w-full">
        {/* Discover Weekly Content */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-bold">Discover Weekly</h2>
            <button 
              onClick={() => {
                eventsGridRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-primary font-bold text-sm uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {featuredEvent && (
            <Link to={`/event/${featuredEvent.id}`} className="block relative group overflow-hidden rounded-xl h-[400px] shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-t from-on-background via-on-background/20 to-transparent z-10"></div>
              <img 
                src={featuredEvent.imageUrl} 
                alt={featuredEvent.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <div className="flex gap-2 mb-4">
                  <span className="bg-tertiary text-on-tertiary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Green Badge
                  </span>
                  <span className="bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Early Bird</span>
                </div>
                <h3 className="text-background font-headline text-3xl font-bold mb-2">{featuredEvent.title}</h3>
                <p className="text-background/80 text-sm mb-4 max-w-md line-clamp-2">{featuredEvent.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-background/80">group</span>
                        <span className="text-background font-bold text-lg">
                          {featuredEvent.totalSeats - featuredEvent.availableSeats}
                        </span>
                      </div>
                      <span className="text-background/90 text-xs font-bold uppercase tracking-tight">People attending</span>
                    </div>
                    <span className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-colors">Join Event</span>
                  </div>
              </div>
            </Link>
          )}

          {/* Grid of smaller cards */}
          <div ref={eventsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.slice(1).map((event) => (
              <Link 
                key={event.id} 
                to={`/event/${event.id}`}
                className="bg-surface-container-lowest rounded-xl p-4 shadow-sm group hover:shadow-lg transition-shadow"
              >
                <div className="relative overflow-hidden rounded-lg h-40 mb-4">
                  <img 
                    src={event.imageUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-surface-container-low/90 backdrop-blur-sm p-1.5 rounded-full">
                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-headline font-bold text-lg leading-tight line-clamp-1">{event.title}</h4>
                  <span className="text-primary font-black text-sm">
                    {event.price === 0 || !event.price ? 'Free' : `₹${event.price.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant text-xs mb-4">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_month</span> 
                    {event.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span> 
                    {event.venue}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">{event.availableSeats} seats left</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {event.totalSeats - event.availableSeats} attending
                    </span>
                  </div>
                  <button className="bg-primary text-on-primary px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform">
                    Join
                  </button>
                </div>
              </Link>
            ))}
          </div>

          {filteredEvents.length === 0 && !loading && (
            <div className="text-center py-20 bg-surface-container-low rounded-2xl">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
              <p className="text-on-surface-variant font-medium">No events found matching your criteria.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
