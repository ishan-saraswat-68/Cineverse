import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Loading from '../components/Loading.jsx'
import { dummyShowsData, dummyDateTimeData, assets } from '../assets/assets'
import { ArrowRightIcon } from 'lucide-react'
import BlurCircle from '../components/BlurCircle.jsx'
import toast from 'react-hot-toast'

const SeatLayout = () => {

  const groupRows = [["A","B"],["C","D"],["E","F"],["G","H"],["I","J"],["K"]];
  const { showId } = useParams(); // Using the new URL param
  const [selectedSeats, setSelectedSeats] = useState([])
  const [show, setShow] = useState(null)

  const navigate = useNavigate()

  const getShow = async () => {
    // In dummy data mode, we find the specific show by its showId
    let foundShow = null;
    let foundDate = null;
    let foundCinema = null;

    Object.entries(dummyDateTimeData).forEach(([date, cinemas]) => {
      cinemas.forEach(cinema => {
        const timeSlot = cinema.timings.find(t => t.showId === showId);
        if (timeSlot) {
          foundShow = timeSlot;
          foundDate = date;
          foundCinema = cinema;
        }
      });
    });

    if (foundShow) {
      setShow({
        movie: dummyShowsData[0], // In a real app, this comes from the backend payload
        timeSlot: foundShow,
        cinema: foundCinema,
        date: foundDate
      })
    }
  }

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-4 mt-4">
      <div className="flex flex-nowrap items-center justify-center gap-3">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-9 w-9 rounded-md border border-primary/60 cursor-pointer flex items-center justify-center transition-colors ${selectedSeats.includes(seatId) &&
                "bg-primary text-white"
                }`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  )

  const handleSeatClick = (seatId) => {
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4) {
      return toast.error("You can only select 4 seats at a time")
    }
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
    )
  }

  const handleProceed = () => {
    if(selectedSeats.length === 0){
      return toast.error("Please select seats first")
    }
    navigate(`/my-bookings`)
  }
  
  useEffect(() => {
    getShow()
  }, [])

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50 justify-center'>

      {/* Seats Layout (Centered) */}
      <div className='relative flex flex-col items-center max-md:mt-16 w-full max-w-5xl'>
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        
        {/* Dynamic Cinema Header Card */}
        <div className='mb-12 w-full bg-primary/5 rounded-3xl border border-primary/20 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 md:gap-8'>
            
            {/* Movie Poster */}
            <img src={show.movie.poster_path} alt={show.movie.title} className='w-24 md:w-28 rounded-xl object-cover shadow-lg border border-white/10' />
            
            {/* Middle Section */}
            <div className='flex flex-col items-center md:items-start flex-1 w-full'>
                <h1 className='text-3xl md:text-3xl font-bold text-white mb-4'>
                    {show.movie.title}
                </h1>
                
                {/* Badges */}
                <div className='flex flex-wrap items-center justify-center md:justify-start gap-3'>
                    <div className='bg-white/5 border border-white/10 px-5 py-2 rounded-full text-gray-300 text-sm font-medium'>
                        {show.cinema.cinemaName}
                    </div>
                    <div className='bg-white/5 border border-white/10 px-5 py-2 rounded-full text-primary text-sm font-semibold'>
                        {new Date(show.date).toLocaleDateString("en-US", {weekday: 'short', month: 'short', day: 'numeric'})}
                    </div>
                    <div className='bg-white/5 border border-white/10 px-5 py-2 rounded-full text-gray-300 text-sm font-semibold'>
                        {new Date(show.timeSlot.time).toLocaleTimeString("en-US", {hour: '2-digit', minute:'2-digit', hour12: false})}
                    </div>
                </div>
            </div>
        </div>

        <h2 className='text-xl font-semibold mb-4'>Select your seats</h2>
        <img src={assets.screenImage} alt="screen" className='w-full opacity-80' />
        <p className='text-gray-400 text-sm mb-10'>SCREEN SIDE</p>
        
        <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>
          <div className='flex flex-col mb-12'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>
          <div className='grid grid-cols-2 gap-x-20 gap-y-12'>
            {groupRows.slice(1,5).map((group,index)=>(
              <div key={index} className='flex flex-col'>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>
        
        <button onClick={()=>handleProceed()} className='flex items-center gap-2 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 text-white'>
          Proceed To CheckOut
          <ArrowRightIcon strokeWidth={3} className='w-4 h-4' />
        </button>
      </div>

    </div>
  ) : (
    <Loading />
  )
}

export default SeatLayout
