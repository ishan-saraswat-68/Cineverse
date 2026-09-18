import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Loading from '../components/Loading.jsx'
import { assets } from '../assets/assets'
import { ArrowRightIcon, Armchair, Receipt } from 'lucide-react'
import BlurCircle from '../components/BlurCircle.jsx'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const SeatLayout = () => {
  const { showId } = useParams()
  const navigate = useNavigate()
  const { axios, image_base_url, getToken, user} = useAppContext()
  const [isBooking, setIsBooking] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/single/${showId}`)
      if (data.success && data.show) {
        setShow(data.show)
      } else {
        toast.error('Show not found')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load show details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getShow()
  }, [showId])

  const handleSeatClick = (seatId) => {
    // Check if seat is occupied
    if (show?.occupiedSeats && show.occupiedSeats[seatId]) {
      return toast.error('This seat is already booked')
    }

    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 4) {
      return toast.error('You can only select up to 4 seats at a time')
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    )
  }

  const getSeatPrice = (seatId) => {
    const rowLetter = seatId.replace(/[0-9]/g, '');
    const section = show?.theatre?.seatingSections?.find(sec => sec.rowLetters?.includes(rowLetter));
    if (section && show?.sectionPrices && show.sectionPrices[section.name]) {
      return show.sectionPrices[section.name];
    }
    return show?.showPrice || 0;
  };

  const totalPrice = selectedSeats.reduce((sum, seatId) => sum + getSeatPrice(seatId), 0);

  const getSectionBreakdown = () => {
    const breakdown = {};
    selectedSeats.forEach((seatId) => {
      const rowLetter = seatId.replace(/[0-9]/g, '');
      const section = show?.theatre?.seatingSections?.find((sec) => sec.rowLetters?.includes(rowLetter));
      const sectionName = section?.name || 'Standard';
      const price = (section && show?.sectionPrices && show.sectionPrices[section.name]) || show?.showPrice || 0;

      if (!breakdown[sectionName]) {
        breakdown[sectionName] = { name: sectionName, count: 0, price };
      }
      breakdown[sectionName].count += 1;
    });
    return Object.values(breakdown);
  };

  const bookTickets = async () => {
    if (!user) {
      return toast.error("Please login to proceed with booking")
    }
    if (selectedSeats.length === 0) {
      return toast.error("Please select at least one seat")
    }
    try {
      setIsBooking(true)
      const token = await getToken()
      const { data } = await axios.post(
        '/api/booking/create',
        { showId, selectedSeats },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (data.success) {
        window.location.href = data.url; //redirect to payment page
      } else {
        toast.error(data.message || "Failed to create booking")
      }
    } catch (error) {
      console.error("Booking error:", error)
      toast.error(error.response?.data?.message || "Booking failed")
    } finally {
      setIsBooking(false)
    }
  }


  if (loading) return <Loading />
  if (!show) return null

  return (
    <div className='px-4 md:px-10 lg:px-16 py-28 md:pt-36 max-w-7xl mx-auto min-h-screen'>
      {/* Cinema & Movie Header Card */}
      <div className='mb-10 w-full bg-primary/5 rounded-3xl border border-primary/20 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 md:gap-8'>
        <img
          src={image_base_url + show.movie.poster_path}
          alt={show.movie.title}
          className='w-24 md:w-28 rounded-xl object-cover shadow-lg border border-white/10'
        />

        <div className='flex flex-col items-center md:items-start flex-1 w-full'>
          <h1 className='text-2xl md:text-3xl font-bold text-white mb-3'>
            {show.movie.title}
          </h1>

          {/* Badges */}
          <div className='flex flex-wrap items-center justify-center md:justify-start gap-2.5'>
            <div className='bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-gray-300 text-xs md:text-sm font-medium'>
              {show.theatre?.name || 'Cineverse Multiplex'}
            </div>
            <div className='bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-primary text-xs md:text-sm font-semibold'>
              {new Date(show.showDateTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className='bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-gray-300 text-xs md:text-sm font-semibold'>
              {new Date(show.showDateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
            <div className='bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-full text-accent text-xs font-semibold'>
              {show.language} • {show.format}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Left = Price Calculation, Right = Seats Grid */}
      <div className='flex flex-col lg:flex-row items-start gap-8 lg:gap-12 relative'>
        <BlurCircle top="-50px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        {/* LEFT SIDE: Price Calculation Card */}
        <div className='w-full lg:w-80 lg:sticky lg:top-28 bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5 order-2 lg:order-1 flex-shrink-0'>
          <div className='flex items-center justify-between pb-3 border-b border-white/10'>
            <h3 className='text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider'>
              <Receipt className='w-4 h-4 text-primary' />
              Price Calculation
            </h3>
            <span className='text-xs text-primary font-semibold'>
              {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}
            </span>
          </div>

          {selectedSeats.length > 0 ? (
            <div className='space-y-4'>
              {/* Selected Seats Badges */}
              <div>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                  Selected Seats
                </p>
                <div className='flex flex-wrap gap-2'>
                  {selectedSeats.map((seatId) => {
                    const price = getSeatPrice(seatId)
                    return (
                      <span
                        key={seatId}
                        className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold'
                      >
                        {seatId}
                        <span className='text-gray-400 font-normal'>₹{price}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Section-wise breakdown */}
              <div className='pt-3 border-t border-white/5 space-y-2 text-xs text-gray-300'>
                {getSectionBreakdown().map((item) => (
                  <div key={item.name} className='flex justify-between items-center'>
                    <span>
                      {item.name} ({item.count} × ₹{item.price})
                    </span>
                    <span className='font-medium text-white'>
                      ₹{item.count * item.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Amount */}
              <div className='pt-3 border-t border-white/10 flex items-center justify-between'>
                <span className='text-sm text-gray-300 font-medium'>Total Amount</span>
                <span className='text-2xl font-bold text-primary'>₹{totalPrice}</span>
              </div>

              {/* Proceed to Checkout Button */}
              <button
                disabled={isBooking}
                onClick={bookTickets}
                className='w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dull transition rounded-xl font-semibold cursor-pointer active:scale-95 text-white text-sm shadow-neon-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isBooking ? 'Processing Booking...' : 'Proceed To CheckOut'}
                <ArrowRightIcon strokeWidth={2.5} className='w-4 h-4' />
              </button>

            </div>
          ) : (
            <div className='text-center py-6 text-gray-400'>
              <Armchair className='w-8 h-8 mx-auto text-gray-600 mb-2' />
              <p className='text-xs'>Select seats from the layout to view price calculation</p>

              {/* Section price guide */}
              <div className='mt-5 pt-4 border-t border-white/5 text-left space-y-2'>
                <p className='text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                  Ticket Rates
                </p>
                {show.theatre?.seatingSections?.map((sec) => (
                  <div key={sec.name} className='flex justify-between text-xs text-gray-400'>
                    <span>{sec.name}</span>
                    <span className='text-primary font-medium'>
                      ₹{show.sectionPrices?.[sec.name] || show.showPrice}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Seats Matrix & Screen */}
        <div className='flex-1 w-full flex flex-col items-center order-1 lg:order-2'>
          <h2 className='text-xl font-semibold mb-6'>Select your seats</h2>

          <div className='w-full flex flex-col items-center gap-10 mt-4'>
            {show.theatre?.seatingSections?.map((section) => (
              <div key={section.name} className='w-full flex flex-col items-center'>
                {/* Section Header */}
                <div className='flex items-center gap-2 mb-4'>
                  <Armchair className='w-4 h-4 text-primary' />
                  <span className='text-xs font-bold text-gray-300 uppercase tracking-widest'>
                    {section.name} Section
                  </span>
                  <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-accent border border-primary/30'>
                    ₹{show.sectionPrices?.[section.name] || show.showPrice}
                  </span>
                </div>

                {/* Rows in this section */}
                <div className='flex flex-col gap-3 items-center overflow-x-auto max-w-full pb-2'>
                  {section.rowLetters?.map((rowLetter) => (
                    <div key={rowLetter} className='flex items-center gap-3'>
                      <span className='w-5 text-right font-medium text-xs text-gray-400'>
                        {rowLetter}
                      </span>
                      <div className='flex gap-2.5'>
                        {Array.from({ length: section.seatsPerRow }, (_, i) => {
                          const seatId = `${rowLetter}${i + 1}`
                          const isOccupied = show.occupiedSeats && show.occupiedSeats[seatId]
                          const isSelected = selectedSeats.includes(seatId)

                          return (
                            <button
                              key={seatId}
                              disabled={isOccupied}
                              onClick={() => handleSeatClick(seatId)}
                              className={`h-8 w-8 md:h-9 md:w-9 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                isOccupied
                                  ? 'bg-gray-700/40 text-gray-600 border border-gray-700 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-primary text-white shadow-neon-primary scale-105'
                                  : 'border border-primary/50 text-gray-300 hover:border-primary hover:bg-primary/10'
                              }`}
                            >
                              {seatId}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Screen Side */}
          <div className='w-full max-w-2xl mt-12 mb-4 text-center'>
            <img src={assets.screenImage} alt='screen' className='w-full opacity-80' />
            <p className='text-gray-400 text-xs tracking-widest mt-2'>SCREEN THIS WAY</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeatLayout
