import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        overview: {
            type: String,
            default: ""
        },
        poster_path: {
            type: String,
            default: ""
        },
        backdrop_path: {
            type: String,
            default: ""
        },
        release_date: {
            type: String,
            default: ""
        },
        original_language: {
            type: String,
            default: "en"
        },
        tagline: {
            type: String,
            default: ""
        },
        genres: {
            type: Array,
            default: []
        },
        casts:{
            type: Array,
            default: []
        },
        vote_average:{
            type: Number,
            default: 0
        },
        run_time:{
            type: Number,
            default: 120
        }
    },
    { timestamps: true }
)

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;