import React, { useEffect, useState } from 'react'
import { CheckIcon, Trash2Icon, StarIcon, Search, X, Loader2, Film, Video, Play, ExternalLink, ClipboardPaste, Eye, EyeOff } from 'lucide-react'
import { dummyShowsData } from '../../assets/assets'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { kConverter } from '../../lib/kConverter'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'


const AddShows = () => {

    const { axios, getToken, user,image_base_url } = useAppContext()
    const currency = import.meta.env.VITE_CURRENCY
    const [nowPlayingMovies, setNowPlayingMovies] = useState([])
    const [selectedMovie, setSelectedMovie] = useState(null)
    const [selectedMovieObj, setSelectedMovieObj] = useState(null)
    const [dateTimeInput, setDateTimeInput] = useState("")
    const [dateTimeSelection, setDateTimeSelection] = useState({})
    const [showPrice, setShowPrice] = useState("")
    const [loading, setLoading] = useState(true)
    const [theatres, setTheatres] = useState([]);
    const [selectedTheatre, setSelectedTheatre] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
    const [selectedFormat, setSelectedFormat] = useState("2D");
    const [sectionPrices, setSectionPrices] = useState({});

    // Movie Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const [hasSearched, setHasSearched] = useState(false)

    const [addingShow,setAddingShow] = useState(false);

    // Movie Trailer / Background Video State
    const [trailerUrl, setTrailerUrl] = useState("")
    const [isLoadingTrailer, setIsLoadingTrailer] = useState(false)
    const [showTrailerPreview, setShowTrailerPreview] = useState(false)

    // Helper to extract YouTube video ID from various link formats
    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const clean = String(url).trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
        const match = clean.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        return match ? match[1] : null;
    };

    const trailerVideoId = getYouTubeVideoId(trailerUrl);

    // Auto-fetch existing or suggested TMDB trailer when selecting a movie
    const handleSelectMovie = async (movie) => {
        setSelectedMovie(movie.id);
        setSelectedMovieObj(movie);
        setShowTrailerPreview(false);
        try {
            setIsLoadingTrailer(true);
            const token = await getToken();
            const { data } = await axios.get(`/api/show/trailer/${movie.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success && data.trailer) {
                setTrailerUrl(data.trailer);
            } else {
                setTrailerUrl("");
            }
        } catch (error) {
            console.error("Error auto-fetching trailer:", error);
            setTrailerUrl("");
        } finally {
            setIsLoadingTrailer(false);
        }
    };

    const handlePasteTrailer = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setTrailerUrl(text.trim());
                toast.success("Trailer link pasted!");
            }
        } catch (err) {
            toast.error("Please paste directly into the input box");
        }
    };

    const fetchNowPlayingMovies = async () => {
        try {
            const token = await getToken();
           const { data } = await axios.get('/api/show/now-playing', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) setNowPlayingMovies(data.movies);
            else console.log(data.message);

        } catch (error) {
            console.log('Error fetching movies : ',
                error)
        }
    }

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            setHasSearched(false);
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const token = await getToken();
            const { data } = await axios.get(`/api/show/search-movies?query=${encodeURIComponent(searchQuery.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setSearchResults(data.movies || []);
                setHasSearched(true);
            } else {
                toast.error(data.message || "Failed to search movies");
            }
        } catch (error) {
            console.error("Error searching movies:", error);
            toast.error("Failed to search movies");
        } finally {
            setIsSearching(false);
        }
    }

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setHasSearched(false);
    }
    
    const fetchTheatres = async () => {
        try {
            const { data } = await axios.get('/api/theatre/all');
            if (data.success && data.theatres.length > 0) {
                setTheatres(data.theatres);
                const firstTh = data.theatres[0];
                setSelectedTheatre(firstTh._id);
            
            // Initialize default prices for this theatre's active sections
            const initialPrices = {};
            firstTh.seatingSections?.forEach(sec => {
                initialPrices[sec.name] = "";
            });
            setSectionPrices(initialPrices);
        }
        } catch (error) {
            console.error("Error fetching theatres:", error);
        }
    };
    


    const handleDateTimeAdd = () => {
        if (!dateTimeInput) return;

        const [date, time] = dateTimeInput.split("T");
        if (!date || !time) return;

        setDateTimeSelection((prev) => {
            const times = prev[date] || [];

            if (!times.includes(time)) {
                return { ...prev, [date]: [...times, time] };
            }

            return prev;
        });
    }
    const handleTheatreChange = (theatreId) => {
        setSelectedTheatre(theatreId);
        const th = theatres.find(t => t._id === theatreId);
        if (th) {
            const newPrices = {};
            th.seatingSections?.forEach(sec => {
                newPrices[sec.name] = sectionPrices[sec.name] || "";
            });
            setSectionPrices(newPrices);
        }
    };


    const handleRemoveTime = (date, time) => {
        setDateTimeSelection((prev) => {
            const filteredTimes = prev[date].filter((t) => t !== time);

            if (filteredTimes.length === 0) {
                const { [date]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [date]: filteredTimes,
            };
        });
    }

    const handleSubmit = async () => {
    try {
        setAddingShow(true);
        if(!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !selectedTheatre){
            return toast.error("Please select a movie, theatre, and show times");
        }

        // Validate all active section prices are entered
        const missingPrice = Object.entries(sectionPrices).some(([sec, price]) => !price || Number(price) <= 0);
        if (missingPrice) {
            return toast.error("Please enter a valid price for all seat sections");
        }

        // Convert price strings to numbers
        const numericPrices = {};
        Object.entries(sectionPrices).forEach(([sec, price]) => {
            numericPrices[sec] = Number(price);
        });

        const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({ date, time }));
        const payload = {
            movieID: selectedMovie,
            theatreId: selectedTheatre,
            language: selectedLanguage,
            format: selectedFormat,
            showsInput,
            sectionPrices: numericPrices,
            trailerUrl: trailerUrl.trim()
        };

        const token = await getToken();
        const { data } = await axios.post("/api/show/add", payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if(data.success){
            toast.success(data.message);
            setDateTimeSelection({});
            setSelectedMovie(null);
            setSelectedMovieObj(null);
            setTrailerUrl("");
            setShowTrailerPreview(false);
        } else {
            toast.error(data.message);
        }
    } catch (error) {
        console.error("Submission Error", error);
        const serverError = error.response?.data?.message || error.message || "Failed to add show";
        toast.error(serverError);
    } finally {
        setAddingShow(false);
    }
};



    useEffect(() => {
        if(user){
            fetchNowPlayingMovies();
            fetchTheatres();
        }
        setLoading(false)
    }, [user])

    const displayMovies = hasSearched ? searchResults : nowPlayingMovies;

    return !loading ? (
        <>
            <Title text1="Add" text2="Shows" />

            <div className="max-w-6xl">

                {/* Search and Movie Selector Header */}
                <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-lg font-medium text-white">
                            {hasSearched ? `Search Results for "${searchQuery}"` : "Now Playing in Indian Cinemas"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {hasSearched 
                                ? `Found ${searchResults.length} movie${searchResults.length === 1 ? '' : 's'}` 
                                : "Select from current theatrical releases or search any movie via TMDB"}
                        </p>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search TMDB (e.g. Mirzapur, Spider-Man)..."
                                className="w-full bg-[#111827] border border-gray-700 focus:border-primary pl-9 pr-8 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-4 py-2 bg-primary hover:bg-primary-dull disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition flex items-center gap-2 shrink-0 cursor-pointer"
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <span>Search</span>
                            )}
                        </button>
                        {hasSearched && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="px-3 py-2 border border-gray-700 hover:border-gray-500 text-gray-300 text-sm rounded-lg transition shrink-0 cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                    </form>
                </div>

                {/* Selected Movie Indicator */}
                {selectedMovieObj && (
                    <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {selectedMovieObj.poster_path ? (
                                <img
                                    src={image_base_url + selectedMovieObj.poster_path}
                                    alt={selectedMovieObj.title}
                                    className="w-10 h-14 object-cover rounded shadow"
                                />
                            ) : (
                                <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                                    <Film className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-primary font-medium uppercase tracking-wider">Selected Movie</p>
                                <p className="text-sm font-semibold text-white">{selectedMovieObj.title}</p>
                                <p className="text-xs text-gray-400">Release Date: {selectedMovieObj.release_date || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium bg-primary/20 px-2.5 py-1 rounded-full">
                            <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
                            Selected
                        </div>
                    </div>
                )}

                {/* Movies Carousel / Scroll List */}
                {displayMovies.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 bg-[#111827]/40 rounded-xl border border-gray-800 my-4">
                        <Film className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                        <p className="text-base font-medium text-gray-300">
                            {hasSearched ? `No movies found matching "${searchQuery}"` : "No movies available"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {hasSearched ? "Try searching with a different movie title" : "Check back later"}
                        </p>
                        {hasSearched && (
                            <button
                                onClick={clearSearch}
                                className="mt-4 px-4 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-md transition cursor-pointer"
                            >
                                Return to Now Playing
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-4 mt-4">
                        <div className="flex gap-4 w-max">
                            {displayMovies.map((movie) => (
                                <div
                                    key={movie.id}
                                    className={`relative w-40 min-w-40 cursor-pointer hover:-translate-y-1 transition duration-300 ${
                                        selectedMovie === movie.id ? "ring-2 ring-primary rounded-lg" : "opacity-80 hover:opacity-100"
                                    }`}
                                    onClick={() => handleSelectMovie(movie)}
                                >
                                    <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-[2/3]">
                                        {movie.poster_path ? (
                                            <img
                                                src={image_base_url + movie.poster_path}
                                                alt={movie.title}
                                                className="w-full h-full object-cover brightness-90"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-gray-500">
                                                <Film className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-medium line-clamp-2">{movie.title}</span>
                                            </div>
                                        )}

                                        <div className="text-xs flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                                            <p className="flex items-center gap-1 text-gray-300">
                                                <StarIcon
                                                    className="w-3.5 h-3.5 text-primary"
                                                    fill="currentColor"
                                                />
                                                {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
                                            </p>

                                            <p className="text-gray-400 text-[11px]">
                                                {kConverter(movie.vote_count || 0)} Votes
                                            </p>
                                        </div>
                                    </div>

                                    {selectedMovie === movie.id && (
                                        <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded shadow-lg">
                                            <CheckIcon
                                                className="w-4 h-4 text-white"
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                    )}

                                    <p className="font-medium text-sm truncate mt-2 text-white" title={movie.title}>
                                        {movie.title}
                                    </p>

                                    <p className="text-gray-400 text-xs">
                                        {movie.release_date || "Unknown date"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Movie Trailer / Background Video Input Bar */}
                <div className="mt-8 bg-[#111827] border border-gray-700/80 rounded-xl p-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                                <Video className="w-4 h-4" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-white flex items-center gap-2">
                                    Movie Trailer / Background Video (YouTube URL)
                                    {isLoadingTrailer && (
                                        <span className="flex items-center gap-1 text-xs font-normal text-primary">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching default trailer...
                                        </span>
                                    )}
                                </label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Paste a YouTube video link to display as the dynamic background video on the movie details page.
                                </p>
                            </div>
                        </div>

                        {trailerVideoId && (
                            <button
                                type="button"
                                onClick={() => setShowTrailerPreview(!showTrailerPreview)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-medium text-gray-200 transition cursor-pointer self-start sm:self-auto shrink-0"
                            >
                                {showTrailerPreview ? <EyeOff className="w-3.5 h-3.5 text-primary" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
                                {showTrailerPreview ? "Hide Preview" : "Live Preview"}
                            </button>
                        )}
                    </div>

                    {/* Input Field Row */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                <Play className="w-4 h-4 text-red-500 fill-red-500" />
                            </div>
                            <input
                                type="url"
                                value={trailerUrl}
                                onChange={(e) => setTrailerUrl(e.target.value)}
                                placeholder={selectedMovie ? "https://www.youtube.com/watch?v=... or https://youtu.be/..." : "Select a movie above or paste custom YouTube link..."}
                                className="w-full bg-[#0b0f19] border border-gray-700 focus:border-red-500 pl-10 pr-9 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                            />
                            {trailerUrl && (
                                <button
                                    type="button"
                                    onClick={() => { setTrailerUrl(""); setShowTrailerPreview(false); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                    title="Clear URL"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handlePasteTrailer}
                            className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Paste from clipboard"
                        >
                            <ClipboardPaste className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">Paste</span>
                        </button>
                    </div>

                    {/* Live Validation & Embedded Player Preview */}
                    {trailerUrl.trim() && (
                        <div className="mt-3">
                            {trailerVideoId ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                            <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
                                            <span>Valid YouTube Trailer (ID: <code className="bg-emerald-950/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono">{trailerVideoId}</code>)</span>
                                        </div>
                                        <a
                                            href={`https://www.youtube.com/watch?v=${trailerVideoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition"
                                        >
                                            <span>Open in YouTube</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    {showTrailerPreview && (
                                        <div className="relative aspect-video max-w-xl rounded-lg overflow-hidden border border-gray-700 shadow-2xl bg-black mt-2">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${trailerVideoId}?autoplay=1&mute=1&loop=1&playlist=${trailerVideoId}&modestbranding=1&rel=0`}
                                                className="w-full h-full"
                                                allow="autoplay; encrypted-media; fullscreen"
                                                allowFullScreen
                                                title="Trailer Preview"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                    <span>⚠️</span>
                                    <span>Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Theatre, Language, and Format Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    {/* Select Theatre */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Theatre *</label>
                        <select
                            value={selectedTheatre}
                            onChange={(e) => handleTheatreChange(e.target.value)}
                            className="w-full bg-[#111827] border border-gray-600 px-3 py-2 rounded-md outline-none text-sm text-white"
                        >
                            {theatres.length === 0 && <option value="">No theatres registered</option>}
                            {theatres.map((th) => (
                                <option key={th._id} value={th._id}>
                                    {th.name} ({th.city} - {th.totalSeats} seats)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Language *</label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full bg-[#111827] border border-gray-600 px-3 py-2 rounded-md outline-none text-sm text-white"
                        >
                            <option value="Hindi">Hindi</option>
                            <option value="English">English</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Telugu">Telugu</option>
                            <option value="Malayalam">Malayalam</option>
                            <option value="Kannada">Kannada</option>
                        </select>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Format *</label>
                        <select
                            value={selectedFormat}
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            className="w-full bg-[#111827] border border-gray-600 px-3 py-2 rounded-md outline-none text-sm text-white"
                        >
                            <option value="2D">2D</option>
                            <option value="3D">3D</option>
                            <option value="IMAX">IMAX</option>
                            <option value="4DX">4DX</option>
                        </select>
                    </div>
                </div>

                {/* Section Prices Inputs */}
                <div className="mt-8">
                    <label className="block text-sm font-medium mb-3">
                        Section Seat Prices ({currency}) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                        {Object.keys(sectionPrices).map((sectionName) => (
                            <div key={sectionName} className="p-3 bg-[#111827] border border-gray-700 rounded-lg">
                                <span className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
                                    {sectionName} Section
                                </span>
                                <div className="inline-flex items-center gap-2 w-full">
                                    <span className="text-gray-400 text-sm">{currency}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Price"
                                        value={sectionPrices[sectionName]}
                                        onChange={(e) =>
                                            setSectionPrices({ ...sectionPrices, [sectionName]: e.target.value })
                                        }
                                        className="outline-none bg-transparent w-full text-white text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Date & Time Selection */}
                <div className="mt-6">

                    <label className="block text-sm font-medium mb-2">
                        Select Date and Time
                    </label>

                    <div className="inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg">

                        <input
                            type="datetime-local"
                            value={dateTimeInput}
                            onChange={(e) => setDateTimeInput(e.target.value)}
                            className="outline-none rounded-md"
                        />

                        <button
                            onClick={handleDateTimeAdd}
                            className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer"
                        >
                            Add Time
                        </button>

                    </div>

                </div>

                {/* Display Selected Times */}
                {Object.keys(dateTimeSelection).length > 0 && (
                    <div className="mt-6">

                        <h2 className="mb-2">
                            Selected Date-Time
                        </h2>

                        <ul className="space-y-3">

                            {Object.entries(dateTimeSelection).map(([date, times]) => (
                                <li key={date}>

                                    <div className="font-medium">
                                        {date}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-1 text-sm">

                                        {times.map((time) => (
                                            <div
                                                key={time}
                                                className="border border-primary px-2 py-1 flex items-center rounded"
                                            >

                                                <span>
                                                    {time}
                                                </span>

                                                <Trash2Icon
                                                    onClick={() =>
                                                        handleRemoveTime(date, time)
                                                    }
                                                    width={15}
                                                    className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                                                />

                                            </div>
                                        ))}

                                    </div>

                                </li>
                            ))}

                        </ul>

                    </div>
                )}

                <button
                    onClick={handleSubmit} disabled={addingShow}
                    className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
                >
                    Add Show
                </button>

            </div>
        </>
    ) : <Loading />
}

export default AddShows