import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PlayCircleIcon, StarIcon, Heart } from 'lucide-react'
import { dummyDateTimeData, dummyShowsData } from '../assets/assets'
import BlurCircle from '../components/BlurCircle'
import timeFormat from '../lib/timeFormat.js'
import DateSelect from '../components/DateSelect.jsx'
import MovieCard from '../components/MovieCard'
import { useNavigate } from 'react-router-dom'
import Loading from '../components/Loading'
import toast from 'react-hot-toast'

const MovieDetails = () => {
    const { id } = useParams()
    const [show, setShow] = useState(null)
    const navigate = useNavigate();

    const getShow = async () => {
        const show = dummyShowsData.find(show => show._id === id)
        if (show) {
            setShow({
                movie: show,
                dateTime: dummyDateTimeData
            })
        }
    }
    useEffect(() => {
        getShow()
    }, [id])

    return show ? (
        <div className='pt-28 pb-16 px-4 md:px-12 max-w-7xl mx-auto'>
            {/* Hero Container Div */}
            <div className='relative w-full rounded-4xl overflow-hidden min-h-[500px] md:h-[540px] flex items-center p-6 md:p-12 shadow-2xl bg-black border border-white/10'>
                {/* Background Trailer Frame (Constrained to container width) */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {(() => {
                        const trailerUrl = show.movie.trailer || show.movie.videoUrl || 'https://www.youtube.com/watch?v=WpW36ldAqnM';
                        const getYouTubeId = (url) => {
                            if (!url) return 'WpW36ldAqnM';
                            const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            return match ? match[1] : 'WpW36ldAqnM';
                        };
                        const ytId = getYouTubeId(trailerUrl);
                        return (
                            <div className="absolute inset-0 scale-[1.35] pointer-events-none">
                                <iframe
                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&modestbranding=1&rel=0&disablekb=1&playsinline=1`}
                                    className="w-full h-full opacity-53"
                                    style={{ border: 'none' }}
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowFullScreen
                                    title="Background Trailer"
                                />
                            </div>
                        );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-r from-dark/75 via-dark/20 to-transparent z-[1]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-transparent to-transparent z-[1]" />
                </div>

                <div className='flex flex-col md:flex-row gap-8 items-center relative z-10 w-full'>
                    <img
                        src={show.movie.poster_path}
                        alt={show.movie.title}
                        className='rounded-2xl h-88 md:h-96 w-60 md:w-64 object-cover shadow-2xl border border-white/10 flex-shrink-0'
                    />

                    <div className='relative flex flex-col gap-3'>
                        <BlurCircle top='-50px' left='-50px' />

                        <p className='text-accent uppercase tracking-widest font-bold text-xs'>
                            {show.movie.original_language || 'ENGLISH'}
                        </p>

                        <h1 className='text-3xl md:text-5xl font-extrabold max-w-xl text-balance tracking-tight text-white'>
                            {show.movie.title}
                        </h1>

                        <div className='flex items-center gap-2 text-gray-300 font-medium text-sm'>
                            <StarIcon className='w-4 h-4 text-accent fill-accent' />
                            <span className="text-white font-bold">{show.movie.vote_average.toFixed(1)}</span> User Rating
                        </div>

                        <p className='text-gray-300 text-sm leading-relaxed max-w-xl line-clamp-3'>
                            {show.movie.overview}
                        </p>

                        <p className="text-gray-400 text-xs font-medium mt-1">
                            {timeFormat(show.movie.runtime)} •{' '}
                            {show.movie.genres.map(genre => genre.name).join(', ')} •{' '}
                            {show.movie.release_date.split('-')[0]}
                        </p>

                        <div className='flex items-center flex-wrap gap-4 mt-4'>
                            <button
                                className='flex items-center gap-2 px-6 py-3 text-sm
                                bg-white/10 hover:bg-white/20 border border-white/10 transition rounded-full
                                font-semibold cursor-pointer active:scale-95 text-white'
                            >
                                <PlayCircleIcon className='w-5 h-5 text-accent' />
                                Watch Trailer
                            </button>

                            <a href='#dateSelect' className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'>
                                Book Now
                            </a>

                            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition text-gray-300 hover:text-white">
                                <Heart className='w-5 h-5' />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <p className='text-lg font-medium mt-20'>Your Favorite Cast</p>
            <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
                <div className='flex items-center gap-4 w-max px-4'>
                    {show.movie.casts.slice(0, 12).map((cast, index) => (
                        <div key={index} className='flex flex-col items-center text-center'>
                            <img src={cast.profile_path} alt="" className='rounded-full h-20 md:h-20 aspect-square object-cover' />
                            <p className='font-medium text-xs mt-3'>{cast.name}</p>
                        </div>
                    ))}
                </div>
            </div>
            <DateSelect dateTime={show.dateTime} id={id} />
            <p className='text-lg font-medium mt-20 mb-8'>You May Also Like</p>
            <div className='flex flex-wrap max-sm:justify-center gap-8'>
                {dummyShowsData.slice(0, 4).map((movie, index) => (
                    <MovieCard key={index} movie={movie} />
                ))}
            </div>
            <div className='flex justify-center mt-20'>
                <button onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate('/movies'); }} className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'>Show more</button>
            </div>
        </div>
    ) : (
        <Loading />
    )
}

export default MovieDetails