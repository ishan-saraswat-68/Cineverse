import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const Loading = () => {
    const { nextUrl } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        // ONLY redirect if nextUrl is actually provided in the route
        if (nextUrl) {
            const timer = setTimeout(() => {
                navigate('/' + nextUrl)
            }, 8000)

            return () => clearTimeout(timer) // Cleans up timer if user navigates away
        }
    }, [nextUrl, navigate])

    return (
        <div className='flex justify-center items-center h-[80vh]'>
            <div className='animate-spin rounded-full h-20 w-20 border-3 border-t-primary'></div>
        </div>
    )
}

export default Loading
