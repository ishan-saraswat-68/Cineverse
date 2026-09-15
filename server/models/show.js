import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
    {
        movie: { type: String, required: true, ref: "Movie" },
        theatre: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Theatre" },
        showDateTime: { type: Date, required: true },
        sectionPrices: {
            type: Object, // e.g. { "Recliner": 450, "Executive": 280, "Classic": 180 }
            required: true,
        },
        showPrice: { type: Number, required: true }, // Base/starting price (e.g. min section price)
        language: { type: String, required: true },
        format: { type: String, required: true },
        occupiedSeats: { type: Object, default: {} },
    },
    { minimize: false }
);

const Show = mongoose.model("Show", showSchema);
export default Show;
