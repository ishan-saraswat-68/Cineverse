import Theatre from "../models/theatre.js";

// Helper function to generate row letters (A, B, C... Z, AA, AB...)
const generateRowLetters = (startIndex, count) => {
  const letters = [];
  for (let i = 0; i < count; i++) {
    let index = startIndex + i;
    let label = "";
    while (index >= 0) {
      label = String.fromCharCode((index % 26) + 65) + label;
      index = Math.floor(index / 26) - 1;
    }
    letters.push(label);
  }
  return letters;
};

// Helper to format sections & calculate capacity
const processSeatingSections = (sections) => {
  const order = ["Recliner", "Executive", "Classic"];
  const activeSections = sections
    .filter((s) => s.enabled)
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  if (activeSections.length === 0) {
    throw new Error("At least one seating section must be enabled");
  }

  let currentRowIndex = 0;
  let totalSeats = 0;

  const processedSections = activeSections.map((sec) => {
    const rows = Number(sec.rows);
    const seatsPerRow = Number(sec.seatsPerRow);

    if (!rows || rows < 1 || !seatsPerRow || seatsPerRow < 1) {
      throw new Error(`Invalid row or seat count for ${sec.name} section`);
    }

    const rowLetters = generateRowLetters(currentRowIndex, rows);
    currentRowIndex += rows;
    totalSeats += rows * seatsPerRow;

    return {
      name: sec.name,
      enabled: true,
      rows,
      seatsPerRow,
      rowLetters,
    };
  });

  return { processedSections, totalSeats };
};

// 1. Add Theatre
export const addTheatre = async (req, res) => {
  try {
    const { name, address, city, state, pincode, phone, totalHalls, sections } = req.body;

    if (!name || !address || !city || !state || !pincode || !sections) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const { processedSections, totalSeats } = processSeatingSections(sections);

    const theatre = await Theatre.create({
      name,
      address,
      city,
      state,
      pincode,
      phone: phone || "",
      totalHalls: totalHalls || 1,
      totalSeats,
      seatingSections: processedSections,
    });

    res.status(201).json({ success: true, message: "Theatre created successfully", theatre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Active Theatres
export const getTheatres = async (req, res) => {
  try {
    const theatres = await Theatre.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, theatres });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Theatre
export const updateTheatre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, pincode, phone, totalHalls, sections } = req.body;

    const updateData = { name, address, city, state, pincode, phone, totalHalls };

    if (sections) {
      const { processedSections, totalSeats } = processSeatingSections(sections);
      updateData.seatingSections = processedSections;
      updateData.totalSeats = totalSeats;
    }

    const updatedTheatre = await Theatre.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedTheatre) {
      return res.status(404).json({ success: false, message: "Theatre not found" });
    }

    res.json({ success: true, message: "Theatre updated successfully", theatre: updatedTheatre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Soft Delete Theatre
export const deleteTheatre = async (req, res) => {
  try {
    const { id } = req.params;
    const theatre = await Theatre.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!theatre) {
      return res.status(404).json({ success: false, message: "Theatre not found" });
    }
    res.json({ success: true, message: "Theatre removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
