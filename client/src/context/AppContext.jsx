import { createContext, useContext, useState,useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser, useAuth } from "@clerk/react";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({children}) =>{

    const [isAdmin, setIsAdmin] = useState(false);
    const [shows,setShows] = useState([]);
    const [favouriteMovies,setFavouriteMovies] = useState([]);

    const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

    const {user} = useUser();
    const {getToken} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const fetchIsAdmin = async() =>{
        try {
            const token = await getToken();
            const {data} = await axios.get("/api/admin/is-admin",{headers:{Authorization:`Bearer ${token}`}})
            setIsAdmin(data.isAdmin);

            // if user is not  admin and trying to access non-admin route, redirect to home
            if(!data.isAdmin && location.pathname.startsWith("/admin")){
                navigate("/");
                toast.error("You are not authorized to access admin dashboard")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const fetchFavoriteMovies = async() =>{
        try {
            const token = await getToken();
            if (!token) return;
            const {data} = await axios.get("/api/user/favourites",{headers:{Authorization:`Bearer ${token}`}})
            if(data.success){
                setFavouriteMovies(data.movies || []);
            }
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    }
    const fetchShows = async() =>{
        try {
            const {data} = await axios.get("/api/show/all");
            if(data.success) {
                setShows(data.shows);
            }
            else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        fetchShows();
    }, []);

    useEffect(() => {
        if(user) {
            fetchIsAdmin();
            fetchFavoriteMovies();
        }
    }, [user]);
    
    const value = {
        axios,
        fetchIsAdmin,
        user, getToken, navigate, isAdmin,
        favouriteMovies, fetchFavoriteMovies,
        shows, fetchShows, image_base_url 
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => useContext(AppContext);
