import axios from "axios";
import https from "https";
import dns from "dns";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import { set } from "mongoose";

// Workaround for ISP DNS poisoning & edge reset of TMDB API in some regions
// Restrict to IPv4 addresses because cloud environments like Render do not support outbound IPv6
const customDnsResolver = new dns.promises.Resolver();
customDnsResolver.setServers(['8.8.8.8', '1.1.1.1']);

let cachedIps = [];
let lastResolved = 0;

async function getHealthyTmdbIps() {
    const now = Date.now();
    if (cachedIps.length > 0 && (now - lastResolved < 60000)) {
        return cachedIps;
    }
    const results = [];
    try {
        const v4 = await customDnsResolver.resolve4('api.themoviedb.org');
        v4.forEach(ip => results.push({ address: ip, family: 4 }));
    } catch (e) {
        console.warn("[TMDB DNS] resolve4 fallback:", e.message);
    }

    // Shuffle pool so requests don't stick to a single reset edge node
    for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
    }

    if (results.length > 0) {
        cachedIps = results;
        lastResolved = now;
    }
    return cachedIps;
}

const httpsAgent = new https.Agent({
    keepAlive: true,
    lookup: async (hostname, options, callback) => {
        if (hostname === 'api.themoviedb.org') {
            try {
                const ips = await getHealthyTmdbIps();
                if (ips.length > 0) {
                    if (options && options.all) {
                        return callback(null, ips);
                    }
                    const picked = ips[Math.floor(Math.random() * ips.length)];
                    return callback(null, picked.address, picked.family);
                }
            } catch (e) {}
        }
        dns.lookup(hostname, options, callback);
    }
});

const tmdbClient = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        'Accept-Encoding': 'identity'
    },
    httpsAgent,
    timeout: 30000
});

export const fetchTmdb = async (config, retries = 3, delay = 500) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await tmdbClient(config);
        } catch (err) {
            const isNetworkError = !err.response && (
                err.code === 'ECONNRESET' ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'ECONNREFUSED' ||
                err.code === 'ECONNABORTED' ||
                err.code === 'ENETUNREACH' ||
                err.code === 'EHOSTUNREACH' ||
                (err.message && err.message.includes('socket hang up'))
            );
            if (attempt === retries || !isNetworkError) {
                throw err;
            }
            console.warn(`[TMDB] Network issue (${err.code || err.message}) on attempt ${attempt}. Retrying in ${delay * attempt}ms...`);
            await new Promise(res => setTimeout(res, delay * attempt));
        }
    }
};

// API to get now playing movies from TMDB api (defaults to Indian cinemas: region=IN)
export const getNowPlayingMovies = async (req, res) => {
    try {
        const region = req.query.region || 'IN';
        const page = req.query.page || 1;

        const response = await fetchTmdb({
            url: '/movie/now_playing',
            params: {
                region,
                page
            }
        });
        const data = response.data;
        res.json({ success: true, movies: data.results, total_pages: data.total_pages });
    } catch (error) {
        console.error("Get Now Playing Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to search movies from TMDB
export const searchMovies = async (req, res) => {
    try {
        const { query, page = 1 } = req.query;
        if (!query || !query.trim()) {
            return res.json({ success: true, movies: [], total_pages: 0 });
        }

        const response = await fetchTmdb({
            url: '/search/movie',
            params: {
                query: query.trim(),
                page,
                include_adult: false
            }
        });

        const data = response.data;
        res.json({ success: true, movies: data.results, total_pages: data.total_pages });
    } catch (error) {
        console.error("Search Movies Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to add a new show to the database 
export const addShow = async (req, res) => {
    try {
        const { movieID, showsInput, sectionPrices, theatreId, language, format } = req.body;
        
        if (!movieID || !showsInput || !sectionPrices || !theatreId || !language || !format) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate that sectionPrices has numbers
        const pricesArray = Object.values(sectionPrices).map(Number);
        if (pricesArray.length === 0 || pricesArray.some(p => isNaN(p) || p <= 0)) {
            return res.status(400).json({ success: false, message: 'Invalid section prices' });
        }

        // Base price is the minimum section price
        const baseShowPrice = Math.min(...pricesArray);
        
        let movie = await Movie.findById(String(movieID));
        if(!movie){
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                fetchTmdb({ url: `/movie/${movieID}` }),
                fetchTmdb({ url: `/movie/${movieID}/credits` })
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id: String(movieID),
                title: movieApiData.title || "Untitled",
                overview: movieApiData.overview || "No overview available.",
                poster_path: movieApiData.poster_path || "",
                backdrop_path: movieApiData.backdrop_path || movieApiData.poster_path || "",
                genres: movieApiData.genres?.map(genre => genre.name) || [],
                casts: movieCreditsData?.cast || [],
                release_date: movieApiData.release_date || new Date().toISOString().split("T")[0],
                original_language: movieApiData.original_language || "en",
                tagline: movieApiData.tagline || "",
                run_time: movieApiData.runtime || 120,
                vote_average: movieApiData.vote_average || 0
            };
            movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];
        showsInput.forEach(show => {
            const showDate = show.date;
            const times = Array.isArray(show.time) ? show.time : [show.time];
            times.forEach((time) => {
                const dateTimeString = `${showDate}T${time}`;
                showsToCreate.push({
                    movie: String(movieID),
                    theatre: theatreId,
                    language,
                    format,
                    showDateTime: new Date(dateTimeString),
                    sectionPrices,
                    showPrice: baseShowPrice,
                    occupiedSeats: {},
                });
            });
        });

        if(showsToCreate.length > 0){
            await Show.insertMany(showsToCreate);
        }

        res.status(201).json({ success: true, message: 'Show added successfully' });
        
    } catch (error) {
        console.error("Add Show Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to add show" });
    }
}




// api to get all shows from the database
export const getShows = async (req,res)=>{
    try {
        const shows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie').sort({showDateTime:1});

        // filter unique shows 
        const uniqueShows = new Set(shows.map(show => show.movie));
        res.json({success:true, shows: Array.from(uniqueShows)})
    }
    catch(error){
        console.error(error);
        res.status(500).json({message: error.message});
    }
}


// api to get single show 

// api to get single movie shows grouped by date & cinema
export const getShow = async (req, res) => {
    try {
        const { movieID } = req.params;
        // get all upcoming shows for the movie, populating theatre
        const shows = await Show.find({
            movie: movieID,
            showDateTime: { $gte: new Date() }
        }).populate('theatre').sort({ showDateTime: 1 });

        const movie = await Movie.findById(movieID);
        const dateTime = {};

        shows.forEach((show) => {
            if (!show.theatre) return;
            const date = show.showDateTime.toISOString().split('T')[0];
            
            if (!dateTime[date]) {
                dateTime[date] = [];
            }

            // Check if this cinema is already in this date array
            let cinemaEntry = dateTime[date].find(
                (c) => String(c.cinemaId) === String(show.theatre._id)
            );

            if (!cinemaEntry) {
                cinemaEntry = {
                    cinemaId: show.theatre._id,
                    cinemaName: show.theatre.name,
                    city: show.theatre.city,
                    address: show.theatre.address,
                    timings: []
                };
                dateTime[date].push(cinemaEntry);
            }

            cinemaEntry.timings.push({
                time: show.showDateTime,
                showId: show._id,
                language: show.language,
                format: show.format,
                price: show.showPrice
            });
        });

        res.json({ success: true, dateTime, movie });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// api to get a single show's full details for SeatLayout
export const getSingleShow = async (req, res) => {
    try {
        const { showId } = req.params;
        const show = await Show.findById(showId)
            .populate('movie')
            .populate('theatre');

        if (!show) {
            return res.status(404).json({ success: false, message: 'Show not found' });
        }

        res.json({ success: true, show });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
