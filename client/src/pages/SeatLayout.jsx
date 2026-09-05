import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import Loading from '../components/Loading.jsx'
import { dummyDateTimeData, dummyShowsData, assets } from '../assets/assets'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import isoTimeFormat from '../lib/isoTimeFormat.js'
import BlurCircle from '../components/BlurCircle.jsx'
import toast from 'react-hot-toast'




const SeatLayout = () => {

  const groupRows = [["A","B"],["C","D"],["E","F"],["G","H"],["I","J"],["K"]];
  const { id, date } = useParams()
  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedTime, setSelectedTime] = useState(null)
  const [show, setShow] = useState(null)

  const navigate = useNavigate()

  const getShow = async () => {
    const show = dummyShowsData.find(show => show._id === id)
    if (show) {
      setShow({
        movie: show,
        dateTime: dummyDateTimeData
      })
    }
  }
  const renderSeats = (row, count = 10) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${selectedSeats.includes(seatId) &&
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
    if (!selectedTime) {
      return toast("Please select  time first")
    }
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
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>

            {/* Available Timings */}
      <div className='w-64 bg-primary/10 border border-primary/20 rounded-lg py-6 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6 mb-4'>Available Cinemas</p>

        <div className='flex flex-col gap-6'>
          {show.dateTime[date].map((cinema) => (
            <div key={cinema.cinemaId} className='space-y-2'>
              {/* Cinema Name */}
              <p className='text-sm font-medium px-6 text-gray-300'>{cinema.cinemaName}</p>
              
              {/* Timings for this cinema */}
              <div className='space-y-1'>
                {cinema.timings.map((item) => (
                  <div 
                    key={item.time} 
                    onClick={() => setSelectedTime({...item, cinemaId: cinema.cinemaId, cinemaName: cinema.cinemaName})} 
                    className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${selectedTime?.time === item.time && selectedTime?.cinemaId === cinema.cinemaId
                      ? "bg-primary text-white"
                      : "hover:bg-primary/20"
                    }`}
                  >
                    <ClockIcon className="w-4 h-4" />
                    <p className='text-sm'>{isoTimeFormat(item.time)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Seats Layout */}
      <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className='text-2xl font-semibold mb-4'>Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>
        <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>
          <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>
          <div className='grid grid-cols-2 gap-11'>
            {groupRows.slice(1,5).map((group,index)=>(
              <div key={index}>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>handleProceed()} className='flex items-center gap-2 mt-20 px-10 py-3 text-sm bg-primary hover: bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 text-white'>
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