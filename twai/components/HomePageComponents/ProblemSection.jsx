import { ClipboardX, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"

// --- Reusable Problem Card Component ---
const ProblemCard = ({ problem, isMobile = false }) => {
  return (
    <div className="bg-[#1a1f29] p-6 rounded-xl shadow-md border border-gray-800 h-full flex flex-col">
      {!isMobile && (
        <div className="w-12 h-12 rounded-full bg-[#242936] flex items-center justify-center text-[#FF00D6] mb-4 flex-shrink-0">
          <ClipboardX className="h-6 w-6" />
        </div>
      )}
      <h3 className={`text-lg font-semibold ${isMobile ? 'text-[#FF00D6]' : 'text-white'} mb-2`}>{problem.title}</h3>
      <p className="text-sm text-gray-300 flex-grow">{problem.description}</p>
    </div>
  );
};

const ProblemSection = () => {
  const [activeSlide, setActiveSlide] = useState(0)
  const totalSlides = 3
  const cardWidthRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const [cardWidth, setCardWidth] = useState(0)
  const trackRef = useRef(null)
  const [touchStartX, setTouchStartX] = useState(null)
  const [isSwiping, setIsSwiping] = useState(false)

  const problemItems = [
    {
      title: "Before Meetings - Time Wasted",
      description: "You spend hours preparing details that are never referenced during meetings."
    },
    {
      title: "During Meetings - Information Overload",
      description: "You struggle to remember key data points when the pressure is on."
    },
    {
      title: "After Meetings - Lost Opportunities",
      description: "You leave thinking, “I should’ve said that,” or forget critical next steps."
    }
  ]

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1))
  }

  // --- Debounce Function ---
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // --- Update Dimensions Function ---
  const updateDimensions = () => {
    requestAnimationFrame(() => {
      if (trackRef.current) setCarouselWidth(trackRef.current.offsetWidth)
      if (cardWidthRef.current) setCardWidth(cardWidthRef.current.offsetWidth)
    })
  }

  // Check mobile status and setup resize listener
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      if (isMobile !== mobile) {
        setIsMobile(mobile)
        setActiveSlide(0)
      }
    }
    checkMobile()
    const debouncedCheckMobile = debounce(checkMobile, 100)
    window.addEventListener("resize", debouncedCheckMobile)
    return () => window.removeEventListener("resize", debouncedCheckMobile)
  }, [isMobile])

  // Update dimensions on mount and when isMobile changes
  useEffect(() => {
    if (isMobile) {
      // Ensure dimensions are calculated after initial mobile render
      const timer = setTimeout(updateDimensions, 50);
      const debouncedUpdateDimensions = debounce(updateDimensions, 100)
      window.addEventListener('resize', debouncedUpdateDimensions)
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', debouncedUpdateDimensions);
      }
    }
  }, [isMobile])

  // --- Calculate Offset (Left-aligned first card) ---
  const calculateOffset = () => {
    if (!carouselWidth || !cardWidth || !isMobile) return '0px';

    const centerOffset = (carouselWidth - cardWidth) / 2;
    const maxOffset = 0; // Ensure first card is fully visible aligned left
    const calculatedOffset = `-${(activeSlide * cardWidth) - centerOffset}px`;

    // If it's the first card (index 0), align it left, otherwise center it
    return activeSlide === 0 ? `${maxOffset}px` : calculatedOffset;
  };

  // --- Swipe Handlers ---
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX)
      setIsSwiping(true)
      trackRef.current?.classList.remove('duration-300') // Disable transition during swipe
    }
  }

  const handleTouchMove = (e) => {
    if (isSwiping && touchStartX !== null && e.touches && e.touches.length === 1) {
      const currentX = e.touches[0].clientX
      const deltaX = currentX - touchStartX
      if (Math.abs(deltaX) > 10) { // Prioritize horizontal swipe
        e.preventDefault() // Prevent vertical scroll
      }
    }
  }

  const handleTouchEnd = (e) => {
    trackRef.current?.classList.add('duration-300') // Re-enable transition
    if (isSwiping && touchStartX !== null && e.changedTouches && e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX
      const deltaX = touchEndX - touchStartX
      const swipeThreshold = 50

      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0) nextSlide() // Swiped Left
        else prevSlide() // Swiped Right
      }
    }
    setTouchStartX(null)
    setIsSwiping(false)
  }

  return (
    <section className="section-padding bg-[#0f1217] text-white py-6 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-normal md:font-bold text-white text-center mb-6 md:mb-8">
          Why Meetings Suck — Too Much Prep. Too Little Outcome.
        </h2>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Desktop version - visible only on md screens and up */}
          <div className="hidden md:block bg-[#1a1f29] p-6 md:p-8 rounded-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <ClipboardX size={180} className="text-jarwiz-400" />
            </div>
            <div className="grid gap-4 md:gap-6 relative z-10">
              {problemItems.map((item, index) => (
                <div key={index} className="bg-[#242936] p-4 md:p-5 rounded-lg shadow-sm border border-gray-800">
                  <h3 className="text-lg font-semibold text-[#FF00D6] mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile carousel - visible only on screens below md */}
          {isMobile && (
            <div className="relative w-full overflow-hidden pb-4">
              {/* Left/Right Buttons */}
              <button
                onClick={prevSlide}
                disabled={activeSlide === 0}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous problem"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextSlide}
                disabled={activeSlide >= totalSlides - 1}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next problem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Carousel Track */}
              <div
                ref={trackRef}
                className="flex transition-transform ease-in-out duration-300"
                style={{ transform: `translateX(${calculateOffset()})` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {problemItems.map((problem, index) => (
                  <div
                    key={index}
                    ref={index === 0 ? cardWidthRef : null}
                    className={`w-[85vw] max-w-[340px] px-2 flex-shrink-0 transform transition-transform transition-opacity ${
                      index === activeSlide ? 'scale-100 opacity-100 z-10' : 'scale-95 opacity-70 z-0'
                    }`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Problem ${index + 1} of ${totalSlides}: ${problem.title}`}
                  >
                    <ProblemCard problem={problem} isMobile={true} />
                  </div>
                ))}
              </div>

              {/* Indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === activeSlide ? 'bg-[#FF00D6] w-5' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Go to problem ${index + 1}`}
                    aria-current={index === activeSlide}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="order-first md:order-last hidden md:block">
            <p className="text-base text-gray-300 mb-6">
              Professionals waste hours each week preparing for and following up on meetings, only to struggle with
              information overload and forgotten details during the discussion.
            </p>
            <p className="text-base text-gray-300 mb-6">
              This leads to lost opportunities, delayed decisions, and unnecessary stress.
            </p>
            <div className="bg-[#1a1f29] border border-gray-800 p-5 md:p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">The Average Professional:</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <div className="w-10 font-extrabold h-10 md:w-12 md:h-12 rounded-full bg-[#242936] flex items-center justify-center text-[#FF00D6] mr-3 md:mr-4 flex-shrink-0 text-sm">
                    12+
                  </div>
                  <p className="text-sm text-gray-300">Hours per week in meetings</p>
                </li>
                <li className="flex items-center">
                  <div className="w-10 font-extrabold h-10 md:w-12 md:h-12 rounded-full bg-[#242936] flex items-center justify-center text-[#FF00D6] mr-3 md:mr-4 flex-shrink-0 text-sm">
                    4+
                  </div>
                  <p className="text-sm text-gray-300">Hours preparing for those meetings</p>
                </li>
                <li className="flex items-center">
                  <div className="w-10 font-extrabold h-10 md:w-12 md:h-12 rounded-full bg-[#242936] flex items-center justify-center text-[#FF00D6] mr-3 md:mr-4 flex-shrink-0 text-sm">
                    65%
                  </div>
                  <p className="text-sm text-gray-300">Feel meetings are unproductive</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProblemSection
