import { useState, useRef, useEffect } from "react";
import { Clock, CheckCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

// --- Data Array for Benefits ---
const benefitsData = [
    {
        id: "time",
        icon: <Clock className="h-6 w-6 md:h-7 md:w-7" />,
        title: "Save Time",
        
        points: [
            "Less time spent preparing materials",
            "Automatic meeting notes and summaries",
            "Faster decision-making in meetings",
        ],
    },
    {
        id: "confidence",
        icon: <CheckCircle className="h-6 w-6 md:h-7 md:w-7" />,
        title: "Boost Confidence",
      
        points: [
            "Eliminate anxiety about forgetting details",
            "Provide accurate information on demand",
            "Speak with authority on any topic",
        ],
    },
    {
        id: "outcomes",
        icon: <TrendingUp className="h-6 w-6 md:h-7 md:w-7" />,
        title: "Improve Outcomes",
        
        points: [
            "Higher conversion rates in sales calls",
            "More productive team discussions",
            "Shorter decision cycles across projects",
        ],
    },
];

// --- Reusable Benefit Card Component ---
const BenefitCard = ({ benefit, isMobile = false }) => {
    return (
        <div className="bg-[#1a1f29] p-6 md:p-8 rounded-xl shadow-md border border-gray-800 h-full flex flex-col">
            {!isMobile && (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#242936] flex items-center justify-center text-[#FF00D6] mb-4 md:mb-6 flex-shrink-0">
                    {benefit.icon}
                </div>
            )}
            <h3 className={`text-lg font-semibold ${isMobile ? 'text-[#FF00D6]' : 'text-white'} ${isMobile ? '' : ' mb-2'} md:mb-3`}>{benefit.title}</h3>
            <p className={`hidden md:block text-sm text-gray-300 ${isMobile ? '' : ' mb-4 '} md:mb-6 flex-grow`}>{benefit.description}</p>
            <ul className="space-y-2 md:space-y-3">
                {benefit.points.map((point, index) => (
                    <li key={index} className="flex items-start">
                        <div className="text-[#FF00D6] mr-2 mt-1 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-300">{point}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const BenefitsSection = () => {

    // --- Mobile Carousel State & Refs ---
    const [isMobile, setIsMobile] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [carouselWidth, setCarouselWidth] = useState(0);
    const [cardWidth, setCardWidth] = useState(0);
    const carouselRef = useRef(null);
    const cardWrapperRef = useRef(null);
    const trackRef = useRef(null);

    // --- Swipe Handling State ---
    const [touchStartX, setTouchStartX] = useState(null);
    const [isSwiping, setIsSwiping] = useState(false);

    // --- Debounce Function ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Update Dimensions Function ---
    const updateDimensions = () => {
        requestAnimationFrame(() => {
            if (carouselRef.current) setCarouselWidth(carouselRef.current.offsetWidth);
            // Ensure cardWrapperRef exists and measure it
            if (cardWrapperRef.current) setCardWidth(cardWrapperRef.current.offsetWidth);
        });
    };

    // Check mobile status and setup resize listener
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768; // md breakpoint
             if (isMobile !== mobile) { // Only update state and activeIndex if mode changes
                setIsMobile(mobile);
                setActiveIndex(0); // Reset to first card when switching modes
             }
        };
        checkMobile();
        const debouncedCheckMobile = debounce(checkMobile, 100);
        window.addEventListener("resize", debouncedCheckMobile);
        return () => window.removeEventListener("resize", debouncedCheckMobile);
    }, [isMobile]); // Re-run if isMobile changes

    // Update dimensions on mount and when isMobile changes
    useEffect(() => {
        if (isMobile) {
            // Ensure dimensions are calculated after initial mobile render
            const timer = setTimeout(updateDimensions, 50); // Small delay might help ensure layout is stable
            const debouncedUpdateDimensions = debounce(updateDimensions, 100);
            window.addEventListener('resize', debouncedUpdateDimensions);
            return () => {
                 clearTimeout(timer);
                 window.removeEventListener('resize', debouncedUpdateDimensions);
            }
        }
    }, [isMobile]); // Run when isMobile status changes

    // --- Carousel Navigation ---
    const nextSlide = () => {
        setActiveIndex((prevIndex) => Math.min(prevIndex + 1, benefitsData.length - 1));
    };

    const prevSlide = () => {
        setActiveIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    };

    // --- Calculate Offset (User's version with left-aligned first card) ---
    const calculateOffset = () => {
        if (!carouselWidth || !cardWidth || !isMobile) return '0px';

        const centerOffset = (carouselWidth - cardWidth) / 2;
        const maxOffset = 0; // Ensure first card is fully visible aligned left
        const calculatedOffset = `-${(activeIndex * cardWidth) - centerOffset}px`;

        // If it's the first card (index 0), align it left, otherwise center it
        return activeIndex === 0 ? `${maxOffset}px` : calculatedOffset;
    };

    // --- Swipe Handlers ---
    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length === 1) {
            setTouchStartX(e.touches[0].clientX);
            setIsSwiping(true);
            trackRef.current?.classList.remove('duration-300'); // Disable transition during swipe
        }
    };

    const handleTouchMove = (e) => {
        if (isSwiping && touchStartX !== null && e.touches && e.touches.length === 1) {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - touchStartX;
            if (Math.abs(deltaX) > 10) { // Prioritize horizontal swipe
                e.preventDefault(); // Prevent vertical scroll
            }
        }
    };

    const handleTouchEnd = (e) => {
        trackRef.current?.classList.add('duration-300'); // Re-enable transition
        if (isSwiping && touchStartX !== null && e.changedTouches && e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX;
            const swipeThreshold = 50;

            if (Math.abs(deltaX) > swipeThreshold) {
                if (deltaX < 0) nextSlide(); // Swiped Left
                else prevSlide(); // Swiped Right
            }
        }
        setTouchStartX(null);
        setIsSwiping(false);
    };


    return (
        <section id="benefits" className="section-padding bg-[#121620] py-8 md:py-16">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl md:text-3xl font-normal md:font-bold text-white text-center mb-6 md:mb-8">
                    Why Choose Jarwiz AI?
                </h2>

                {/* Conditional Rendering: Mobile Carousel or Desktop Grid */}
                {isMobile ? (
                    // --- Mobile Centered Carousel ---
                    <div className="relative w-full overflow-hidden pb-4" ref={carouselRef}>
                        {/* Left/Right Buttons */}
                        <button onClick={prevSlide} disabled={activeIndex === 0} className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous benefit"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={nextSlide} disabled={activeIndex >= benefitsData.length - 1} className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next benefit"><ChevronRight className="h-5 w-5" /></button>

                        {/* Carousel Track */}
                        <div
                            ref={trackRef}
                            className="flex transition-transform ease-in-out duration-300"
                            style={{ transform: `translateX(${calculateOffset()})` }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {benefitsData.map((benefit, index) => (
                                <div
                                    key={benefit.id}
                                    ref={index === 0 ? cardWrapperRef : null}
                                    className={`w-[85vw] max-w-[340px] px-2 flex-shrink-0 transform transition-transform transition-opacity ${
                                        index === activeIndex ? 'scale-100 opacity-100 z-10' : 'scale-95 opacity-70 z-0'
                                    }`}
                                    role="group"
                                    aria-roledescription="slide"
                                    aria-label={`Benefit ${index + 1} of ${benefitsData.length}: ${benefit.title}`}
                                >
                                    <BenefitCard benefit={benefit} isMobile={true} />
                                </div>
                            ))}
                        </div>

                        {/* Indicators */}
                        <div className="flex justify-center mt-6 space-x-2">
                            {benefitsData.map((_, index) => (
                                <button
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        index === activeIndex ? 'bg-[#FF00D6] w-5' : 'bg-gray-600 hover:bg-gray-500'
                                    }`}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`Go to benefit ${index + 1}`}
                                    aria-current={index === activeIndex}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    // --- Desktop Grid View ---
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-10 max-w-6xl mx-auto">
                        {benefitsData.map((benefit) => (
                            <BenefitCard key={benefit.id} benefit={benefit} />
                        ))}
                    </div>
                )}

                 {/* --- Impact Section (Remains unchanged, only visible on desktop) --- */}
                <div className="bg-[#1a1f29] p-6 md:p-8 rounded-xl shadow-md border border-gray-800 hidden md:block max-w-6xl mx-auto">
                    <h3 className="text-lg font-semibold text-white text-center mb-6 md:mb-8">Impact on Your Business</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 text-center">
                        {/* Impact Stat 1 */}
                        <div className="p-4 md:p-6 bg-[#242936] rounded-lg border border-gray-700">
                            <div className="text-2xl font-bold text-[#FF00D6] mb-1 md:mb-2">50%</div>
                            <p className="text-sm text-gray-300">Reduction in meeting preparation time</p>
                        </div>
                        {/* Impact Stat 2 */}
                        <div className="p-4 md:p-6 bg-[#242936] rounded-lg border border-gray-700">
                            <div className="text-2xl font-bold text-[#FF00D6] mb-1 md:mb-2">35%</div>
                            <p className="text-sm text-gray-300">Increase in meeting productivity</p>
                        </div>
                         {/* Impact Stat 3 */}
                        <div className="p-4 md:p-6 bg-[#242936] rounded-lg border border-gray-700">
                             <div className="text-2xl font-bold text-[#FF00D6] mb-1 md:mb-2">25%</div>
                             <p className="text-sm text-gray-300">Faster decision-making process</p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default BenefitsSection;
