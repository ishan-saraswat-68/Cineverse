import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaTicketAlt, FaHome, FaFilm, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaGlobeAmericas, FaTv } from 'react-icons/fa';
import BlurCircle from './BlurCircle';
import { useAppContext } from '../context/AppContext';

export default function BookingConfirmation() {
  const location = useLocation();
  const [animateIn, setAnimateIn] = useState(false);
  const {image_base_url} = useAppContext()

  // Read booking from navigation state (passed by MyBookings)
  const rawBooking = location.state?.booking;

  // Normalize the booking data to a consistent shape
  const booking = rawBooking ? {
    show: {
      movie: {
        title: rawBooking.show.movie.title,
        poster: rawBooking.show.movie.poster_path || rawBooking.show.movie.poster || rawBooking.show.movie.backdrop_path,
      },
      theatre: { name: rawBooking.show.theatre?.name || '—', city: rawBooking.show.theatre?.city || '—' },
      date: rawBooking.show.showDateTime
        ? new Date(rawBooking.show.showDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : rawBooking.show.date || '—',
      time: rawBooking.show.showDateTime
        ? new Date(rawBooking.show.showDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : rawBooking.show.time || '—',
      language: rawBooking.show.movie.original_language || rawBooking.show.language || '—',
      format: rawBooking.show.format || 'Standard',
    },
    seats: rawBooking.bookedSeats || rawBooking.seats || [],
    totalAmount: rawBooking.amount ?? rawBooking.totalAmount ?? 0,
    bookingId: rawBooking._id || rawBooking.bookingId || '—',
    createdAt: rawBooking.createdAt || new Date().toISOString(),
  } : {
    // Fallback demo data when accessed directly
    show: {
      movie: { title: 'Inception', poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800' },
      theatre: { name: 'PVR Cinemas', city: 'Mumbai' },
      date: '10 Sep 2026',
      time: '07:30 PM',
      language: 'English',
      format: 'IMAX 3D',
    },
    seats: ['E4', 'E5', 'E6'],
    totalAmount: 1350,
    bookingId: 'CVS-2026-XK7M9',
    createdAt: new Date().toISOString(),
  };

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { show, seats, totalAmount, bookingId: bId, createdAt } = booking;


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-20 md:py-28 overflow-hidden">
      {/* Decorative background blurs */}
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="40px" right="-60px" />

      <div className={`w-full max-w-md transition-all duration-700 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-400/20 rounded-full blur-2xl scale-150 animate-pulse" />
            <FaCheckCircle className="relative text-green-400 text-7xl mx-auto mb-5 drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Booking Confirmed!</h1>
          <p className="text-muted text-sm">Your tickets have been booked successfully</p>
        </div>

        {/* Ticket Card */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_60px_rgba(6,182,212,0.12)]">
          {/* Movie Banner */}
          <div className="relative h-36 overflow-hidden">
            <img
              src={`${image_base_url}${show.movie.poster}`}
              alt={show.movie.title}
              className="w-full h-full object-cover brightness-[0.35] scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            <div className="absolute inset-0 flex items-end p-5">
              <div className="flex items-center gap-3">
                <FaFilm className="text-accent text-lg" />
                <h2 className="text-white text-xl font-bold tracking-tight">{show.movie.title}</h2>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="bg-card p-6 space-y-5">
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Detail icon={<FaMapMarkerAlt className="text-primary" />} label="Theatre" value={show.theatre.name} />
              <Detail icon={<FaMapMarkerAlt className="text-primary" />} label="City" value={show.theatre.city} />
              <Detail icon={<FaCalendarAlt className="text-primary" />} label="Date" value={show.date} />
              <Detail icon={<FaClock className="text-primary" />} label="Time" value={show.time} />
              <Detail icon={<FaGlobeAmericas className="text-primary" />} label="Language" value={show.language} />
              <Detail icon={<FaTv className="text-primary" />} label="Format" value={show.format} />
            </div>

            {/* Dashed Divider */}
            <div className="border-t border-dashed border-white/10" />

            {/* Booking Info */}
            <div className="space-y-3">
              <Detail label="Seats" value={
                <span className="flex flex-wrap gap-1.5">
                  {seats.map(s => (
                    <span key={s} className="bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">{s}</span>
                  ))}
                </span>
              } />
              <Detail label="Booking ID" value={bId} mono />
              <Detail label="Booked On" value={new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            </div>

            {/* Total Amount */}
            <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
              <span className="text-muted font-semibold text-sm">Total Amount</span>
              <span className="text-accent text-2xl font-bold tracking-tight">₹{totalAmount}</span>
            </div>
          </div>

          {/* Ticket Tear — cutout circles + dashed line */}
          <div className="relative h-0">
            <div className="absolute -left-4 -top-4 w-8 h-8 bg-dark rounded-full" />
            <div className="absolute -right-4 -top-4 w-8 h-8 bg-dark rounded-full" />
            <div className="border-t border-dashed border-white/10 mx-6 -mt-[1px]" />
          </div>

          {/* Bottom — Ticket icon & barcode ID */}
          <div className="bg-card p-6 text-center">
            <FaTicketAlt className="text-4xl text-primary/40 mx-auto mb-2" />
            <p className="text-muted text-xs tracking-wide uppercase">Show this at the counter</p>
            <p className="font-mono text-white/30 text-sm mt-1.5 tracking-widest">{bId}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <Link
            to="/my-bookings"
            className="flex-1 text-center py-3 rounded-full border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 active:scale-95"
          >
            My Bookings
          </Link>
          <Link
            to="/"
            className="btn-primary flex-1 text-center flex items-center justify-center gap-2 py-3 text-sm active:scale-95"
          >
            <FaHome /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value, mono }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span className="text-[10px]">{icon}</span>}
        <p className="text-muted text-[10px] uppercase tracking-widest font-medium">{label}</p>
      </div>
      {typeof value === 'string' ? (
        <p className={`text-white text-sm font-medium ${mono ? 'font-mono tracking-wider text-white/70' : ''}`}>{value}</p>
      ) : (
        value
      )}
    </div>
  );
}
