import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["Recliner", "Executive", "Classic"],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    rows: {
      type: Number,
      required: true,
      min: 1,
    },
    seatsPerRow: {
      type: Number,
      required: true,
      min: 5,
    },
    rowLetters: [
      {
        type: String,
      },
    ], // e.g. ["A", "B"]
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, default: "" },
    totalHalls: { type: Number, default: 1 },
    totalSeats: { type: Number, required: true },
    seatingSections: [sectionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Theatre = mongoose.model("Theatre", theatreSchema);
export default Theatre;
