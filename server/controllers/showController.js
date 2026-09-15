import axios from "axios";
import https from "https";
import dns from "dns";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import { set } from "mongoose";

// Workaround for ISP DNS poisoning of TMDB API in some regions
const customDnsResolver = new dns.promises.Resolver();
customDnsResolver.setServers(['8.8.8.8', '1.1.1.1']);

const httpsAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (hostname === 'api.themoviedb.org') {
      customDnsResolver.resolve4(hostname).then(addresses => {
        if (addresses && addresses.length > 0) {
          if (options && options.all) {
            callback(null, [{ address: addresses[0], family: 4 }]);
          } else {
            callback(null, addresses[0], 4);
          }
        } else {
          dns.lookup(hostname, options, callback);
        }
      }).catch(err => {
        console.error("DNS Resolution Error:", err);
        dns.lookup(hostname, options, callback);
      });
    } else {
      dns.lookup(hostname, options, callback);
    }
  }
});

// API to get now playing movies from TMDB api (defaults to Indian cinemas: region=IN)
export const getNowPlayingMovies = async (req, res) => {
    try {
        const region = req.query.region || 'IN';
        const page = req.query.page || 1;

        const response = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            params: {
                region,
                page
            },
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                'Accept-Encoding': 'identity'
            },
            httpsAgent
        });
        const data = response.data;
        res.json({ success: true, movies: data.results, total_pages: data.total_pages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}

// API to search movies from TMDB
export const searchMovies = async (req, res) => {
    try {
        const { query, page = 1 } = req.query;
        if (!query || !query.trim()) {
            return res.json({ success: true, movies: [], total_pages: 0 });
        }

        const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
            params: {
                query: query.trim(),
                page,
                include_adult: false
            },
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
                'Accept-Encoding': 'identity'
            },
            httpsAgent
        });

        const data = response.data;
        res.json({ success: true, movies: data.results, total_pages: data.total_pages });
    } catch (error) {
        console.error("Search Movies Error:", error);
        res.status(500).json({ message: error.message });
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
        
        let movie = await Movie.findById(movieID);
        if(!movie){
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieID}`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, 'Accept-Encoding': 'identity' },
                    httpsAgent
                }),
                axios.get(`https://api.themoviedb.org/3/movie/${movieID}/credits`, {
                    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, 'Accept-Encoding': 'identity' },
                    httpsAgent
                })
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id: movieID,
                title: movieApiData.title,
                overview: movieApiData.overview || "",
                poster_path: movieApiData.poster_path || "",
                backdrop_path: movieApiData.backdrop_path || movieApiData.poster_path,
                genres: movieApiData.genres.map(genre=>genre.name),
                casts: movieCreditsData.cast || [],
                release_date: movieApiData.release_date || new Date().toISOString().split("T")[0],
                original_language: movieApiData.original_language || "en",
                tagline: movieApiData.tagline || "",
                run_time: movieApiData.runtime || 120,
                vote_average: movieApiData.vote_average || 0
            }
            movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];
        showsInput.forEach(show => {
            const showDate = show.date;
            show.time.forEach((time) => {
                const dateTimeString = `${showDate}T${time}`;
                showsToCreate.push({
                    movie: movieID,
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
        console.error(error);
        res.status(500).json({ message: error.message });
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
