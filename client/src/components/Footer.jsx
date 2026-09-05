import React from 'react'
import { assets } from '../assets/assets.js'

const Footer = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-24 mt-40 xl:px-32 border-t border-white/5">
      <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-white/10 text-gray-400 pb-14">
        <div>
          <img className="w-34 md:w-32" src={assets.logo} alt="logo" />
          <p className="max-w-[410px] mt-6 text-gray-400">Experience the next generation of cinema with Cineverse. Immersive, futuristic, and unforgettable.</p>
        </div>
        <div className="flex flex-wrap justify-between w-full md:w-[45%] gap-5">
          <div>
            <h3 className="font-semibold text-base text-white md:mb-5 mb-2">Quick Links</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-accent transition">Home</a></li>
              <li><a href="#" className="hover:text-accent transition">Best Sellers</a></li>
              <li><a href="#" className="hover:text-accent transition">Offers & Deals</a></li>
              <li><a href="#" className="hover:text-accent transition">Contact Us</a></li>
              <li><a href="#" className="hover:text-accent transition">FAQs</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-base text-white md:mb-5 mb-2">Need Help?</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-accent transition">Delivery Information</a></li>
              <li><a href="#" className="hover:text-accent transition">Return & Refund Policy</a></li>
              <li><a href="#" className="hover:text-accent transition">Payment Methods</a></li>
              <li><a href="#" className="hover:text-accent transition">Track your Order</a></li>
              <li><a href="#" className="hover:text-accent transition">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-base text-white md:mb-5 mb-2">Follow Us</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li><a href="#" className="hover:text-accent transition">Instagram</a></li>
              <li><a href="#" className="hover:text-accent transition">Twitter</a></li>
              <li><a href="#" className="hover:text-accent transition">Facebook</a></li>
              <li><a href="#" className="hover:text-accent transition">YouTube</a></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="py-4 text-center text-sm md:text-base text-gray-400">
        Copyright 2025 © Cineverse All Right Reserved.
      </p>
    </footer>
  )
}

export default Footer