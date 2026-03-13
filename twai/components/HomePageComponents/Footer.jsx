import { Facebook, Twitter, Linkedin } from "lucide-react"
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="bg-[#0a0d14] text-gray-300">
      <div className="container mx-auto py-10 md:py-12 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-bold text-white mb-3 md:mb-4">
              <Link href="/" className="text-2xl font-extrabold" style={{ color: "#007BFF" }}>
                Jarwiz<span style={{ color: "#FF00D6" }}>AI</span>
              </Link>
            </h3>
            <p className="text-sm text-gray-400 mb-3 md:mb-4">
              AI-powered meeting assistant that makes every conversation more productive.
            </p>
            <div className="flex space-x-3 md:space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-1.5">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-1.5">
                <Linkedin size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors p-1.5">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          <div className="col-span-1">
            <h4 className="text-base font-semibold text-white mb-3 md:mb-4">Product</h4>
            <ul className="space-y-1.5 md:space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Testimonials
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="text-base font-semibold text-white mb-3 md:mb-4">Company</h4>
            <ul className="space-y-1.5 md:space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Press
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-base font-semibold text-white mb-3 md:mb-4">Support</h4>
            <ul className="space-y-1.5 md:space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm mb-3 md:mb-0">
            © {new Date().getFullYear()} Jarwiz AI. All rights reserved.
          </p>
          <div>
            <ul className="flex flex-wrap justify-center gap-3 md:gap-6 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

