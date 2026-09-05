import React from 'react'

const Loading = () => {
    return (
        <div className='flex justify-center items-center h-[80vh]'>
            <div className='animate-spin rounded-full h-20 w-20 border-3 border-t-primary'></div>
        </div>
    )
}

export default Loading