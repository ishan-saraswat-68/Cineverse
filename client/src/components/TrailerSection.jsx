import React, { useEffect, useState } from 'react'
import { dummyTrailers } from '../assets/assets.js'
import BlurCircle from './BlurCircle.jsx'
import ReactPlayer from 'react-player'
import { PlayCircleIcon } from 'lucide-react'
import { useAppContext } from '../context/AppContext.jsx'

const TrailersSection = () => {
    const { shows, image_base_url } = useAppContext();

    // Collect movies that have trailers
    const dynamicTrailers = React.useMemo(() => {
        const list = (shows || [])
            .filter((m) => m && (m.trailer || m.videoUrl))
            .map((m) => ({
                title: m.title,
                videoUrl: m.trailer || m.videoUrl,
                image: m.backdrop_path
                    ? image_base_url + m.backdrop_path
                    : (m.poster_path ? image_base_url + m.poster_path : '')
            }));
        return list.length > 0 ? list : dummyTrailers;
    }, [shows, image_base_url]);

    const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);

    useEffect(() => {
        if (dynamicTrailers.length > 0) {
            setCurrentTrailer(dynamicTrailers[0]);
        }
    }, [dynamicTrailers]);

    return (
        <div className='px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden'>

            <p className='text-gray-300 font-medium text-lg max-w-[960px] mx-auto'>
                Trailers
            </p>

            <div className='relative mt-6'>
                <BlurCircle top='-100px' right='-100px' />

                <ReactPlayer
                    src={currentTrailer.videoUrl}
                    url={currentTrailer.videoUrl}
                    controls={true}
                    config={{
                        youtube: {
                            playerVars: {
                                origin: typeof window !== 'undefined' ? window.location.origin : ''
                            }
                        }
                    }}
                    className="mx-auto max-w-full overflow-hidden rounded-xl"
                    width="960px"
                    height="540px"
                />
            </div>
            <div className='group grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto'>
                {dynamicTrailers.slice(0, 4).map((trailer, idx) => (
                    <div
                        key={trailer.videoUrl + idx}
                        className={`relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition h-40 md:h-48 rounded-lg overflow-hidden cursor-pointer border ${
                            currentTrailer.videoUrl === trailer.videoUrl ? 'border-primary ring-1 ring-primary' : 'border-white/10'
                        }`}
                        onClick={() => setCurrentTrailer(trailer)}>
                        <img src={trailer.image} alt={trailer.title || "trailer"} className='w-full h-full object-cover brightness-75'/>
                        <PlayCircleIcon strokeWidth={1.6} className="absolute top-1/2 left-1/2 w-8 h-8 md:w-10 md:h-10 text-white transform -translate-x-1/2 -translate-y-1/2 drop-shadow-lg"/>
                        {trailer.title && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs font-medium text-white truncate">{trailer.title}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TrailersSection