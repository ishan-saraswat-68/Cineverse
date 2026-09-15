import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, Film } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContext.jsx'

const Favourite = () => {
  const { favouriteMovies } = useAppContext()
  
  return (
    <div className='relative pt-32 pb-24 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto overflow-hidden min-h-[80vh]'>
      <BlurCircle top="120px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <div className='flex items-center gap-3 mb-8'>
        <div className='p-3 rounded-2xl bg-primary/15 text-primary border border-primary/30'>
          <Heart className='w-6 h-6 fill-primary' />
        </div>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-white'>Your Favourite Movies</h1>
          <p className='text-gray-400 text-sm mt-0.5'>Movies you have saved to your personal watchlist</p>
        </div>
      </div>

      {favouriteMovies && favouriteMovies.length > 0 ? (
        <div className='flex flex-wrap max-sm:justify-center gap-8'>
          {favouriteMovies.map((movie) => (
            <MovieCard movie={movie} key={movie._id} />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center py-24 text-center rounded-3xl border border-white/5 bg-white/[0.02] p-8 mt-4'>
          <div className='p-4 rounded-full bg-white/5 border border-white/10 mb-4'>
            <Film className='w-10 h-10 text-gray-400' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>No favourite movies yet</h2>
          <p className='text-gray-400 text-sm max-w-md mb-6 leading-relaxed'>
            Browse available shows and movies, and click the heart icon on any movie to save it to your favourites.
          </p>
          <Link 
            to='/movies' 
            onClick={() => window.scrollTo(0, 0)}
            className='px-6 py-2.5 bg-primary hover:bg-primary-dull text-white text-sm font-medium rounded-lg transition active:scale-95'
          >
            Explore Movies
          </Link>
        </div>
      )}
    </div>
  )
}

export default Favourite