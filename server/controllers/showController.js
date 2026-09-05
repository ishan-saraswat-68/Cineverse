import axios from "axios";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import { set } from "mongoose";

// API to get now playing movies from TMDB api
export const getNowPlayingMovies = async (req, res) => {
    try {
        const {data} = await axios.get('https://api.themoviedb.org/3/movie/now_playing',{
            headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY}`}
        })
        const movies = data.results;
        res.json({success: true, movies: movies});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}

// API to add a new show to the database 
export const addShow = async (req, res) => {
    try {
        const {movieID, showsInput, showPrice} = req.body;
        
        let movie = await Movie.findById(movieID);
        if(!movie){
            // fetch movie details and credits from the tmdb api 
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieID}`,{
            headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY}`}}),
            axios.get(`https://api.themoviedb.org/3/movie/${movieID}/credits`,{
                headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY}`}})
            ])

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id: movieID,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres.map(genre=>genre.name),
                casts: movieCreditsData.cast,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                run_time: movieApiData.runtime,
                vote_average: movieApiData.vote_average
            }
            // Add movie to the database 
            movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];
        showsInput.forEach(show=>{
            const showDate = show.date;
            show.time.forEach((time)=>{
                const dateTimeString = `${showDate}T${time}`;
                showsToCreate.push({
                    movie: movieID,
                    showDateTime: new Date(dateTimeString),
                    showPrice,
                    occupiedSeats: [],
                })
            }) 
        });

        if(showsToCreate.length>0){
            await Show.insertMany(showsToCreate);
        }

        res.status(201).json({success: true, message: 'Show added successfully'})
        
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
        console.log(uniqueShows);
        res.json({success:true, shows: Array.from(uniqueShows)})
    }
    catch(error){
        console.error(error);
        res.status(500).json({message: error.message});
    }
}


// api to get single show 

export const getShow = async(req,res)=>{
    try {
        const {movieID} = req.params;
        // get all upcoming shows for the movie 
        const shows = await Show.find({movie: movieID,showDateTime: {$gte: new Date()}});

        const movie = await Movie.findById(movieID);
        const dateTime = {};

        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split('T')[0];
            
            if(!dateTime[date]){
                dateTime[date] = [];
            }
            dateTime[date].push({time: show.showDateTime, showId: show._id});
        })
        res.json({success:true, dateTime:dateTime, movie:movie})
    } catch (error) {
        console.error(error);
        res.status(500).json({message: error.message});
    }
}