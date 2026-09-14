import React from 'react'
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import SeatLayout from "./pages/SeatLayout";
import Favourite from "./pages/Favourite";
import MyBookings from "./pages/MyBookings";
import BookingConfirmation from "./components/BookingConfirmation";
import {Routes,Route, useLocation} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from './pages/admin/Layout';
import Dashboard from './pages/admin/Dashboard';
import ListShows from './pages/admin/ListShows';
import AddShows from './pages/admin/AddShows';
import ListBookings from './pages/admin/ListBookings';
import { useAppContext } from './context/AppContext';
import { SignIn } from '@clerk/react';

function App() {

  const isAdminRoute = useLocation().pathname.startsWith("/admin")


  const {user} = useAppContext();

  return (
    <>
    <Toaster/>
    {!isAdminRoute && <Navbar/>}
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/movies" element={<Movies/>}/>
      <Route path="/movies/:id" element={<MovieDetails/>}/>
      <Route path="/seat-layout/:showId" element={<SeatLayout/>}/>
      <Route path="/favorite" element={<Favourite/>}/>
      <Route path="/my-bookings" element={<MyBookings/>}/> 
      <Route path="/booking-confirmation" element={<BookingConfirmation/>}/>
      <Route path='/admin/*' element={user? <Layout/>:(
        <div className="min-h-screen flex items-center justify-center">
          <SignIn fallbackRedirectUrl={'/admin'}/>
        </div>
      )}>
        <Route index element={<Dashboard/>}/>
        <Route path='list-shows' element={<ListShows/>}/>
        <Route path='add-shows' element={<AddShows/>}/>
        <Route path='list-bookings' element={<ListBookings/>}/>
      </Route>
    </Routes>
    {!isAdminRoute && <Footer/>}
    </>
  )
}

export default App
