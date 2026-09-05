import React from 'react'
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import SeatLayout from "./pages/SeatLayout";
import Favourite from "./pages/Favourite";
import MyBookings from "./pages/MyBookings";
import {Routes,Route, useLocation} from "react-router-dom";
import { Toaster } from "react-hot-toast";



function App() {

  const isAdminRoute = useLocation().pathname.startsWith("/admin")

  return (
    <>
    <Toaster/>
    {!isAdminRoute && <Navbar/>}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/movies" element={<Movies/>}/>
      <Route path="/movies/:id" element={<MovieDetails/>}/>
      <Route path="/movie/:id/:date" element={<SeatLayout/>}/>
      <Route path="/favorite" element={<Favourite/>}/>
      <Route path="/my-bookings" element={<MyBookings/>}/>  
    </Routes>
    {!isAdminRoute && <Footer/>}
    </>
  )
}

export default App
