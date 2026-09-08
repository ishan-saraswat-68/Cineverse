import React, { useState } from 'react'
import BlurCircle from './BlurCircle'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom';
import isoTimeFormat from '../lib/isoTimeFormat.js';

const DateSelect = ({dateTime, id}) => {

    const [selected, setSelected] = useState(null);
    const navigate = useNavigate();

    return (
        <div id='dateSelect' className='pt-30'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg'>
                <BlurCircle top="-100px" left="-100px"/>
                <BlurCircle top="100px" right="0px"/>
                <div>
                    <p className='text-lg font-semibold'>Choose Date</p>
                    <div className='flex items-center gap-6 text-sm mt-5'>
                        <ChevronLeftIcon width={28}/>
                        <span className='grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4'>
                            {Object.keys(dateTime).map((date)=>(
                                <button onClick={()=>{ setSelected(date)}} key={date} className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer ${selected === date ? "bg-primary text-white " : "border border-primary/70"}`}>
                                    <span>{new Date(date).getDate()}</span>
                                    <span>{new Date(date).toLocaleDateString("en-US", {month: "short" })}</span>
                                </button>
                            ))}
                        </span>
                        <ChevronRightIcon width={28}/>
                    </div>
                </div>
            </div>

            {/* NEW: Cinema & Timing Selection */}
            {selected && (
                <div className='mt-10 p-8 bg-black/20 border border-white/5 rounded-lg'>
                    <p className='text-lg font-semibold mb-6'>Available Cinemas</p>
                    <div className='flex flex-col gap-8'>
                        {dateTime[selected].map((cinema) => (
                            <div key={cinema.cinemaId} className='space-y-4'>
                                <p className='text-md font-medium text-gray-200'>{cinema.cinemaName}</p>
                                <div className='flex flex-wrap gap-4'>
                                    {cinema.timings.map((item) => (
                                        <button 
                                            key={item.time} 
                                            onClick={() => {
                                                navigate(`/seat-layout/${item.showId}`);
                                                window.scrollTo(0, 0);
                                            }} 
                                            className='flex items-center gap-2 px-6 py-2 rounded-md border border-primary/40 hover:bg-primary/20 transition cursor-pointer text-sm text-gray-300'
                                        >
                                            <ClockIcon className="w-4 h-4" />
                                            {isoTimeFormat(item.time)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default DateSelect
