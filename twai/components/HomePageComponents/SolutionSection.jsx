import { useState, useRef, useEffect } from "react";
import { MessageSquare, FileText, Lightbulb, Link, Settings } from "lucide-react"; 

// FeatureCard component remains the same
const FeatureCard = ({ icon, title, description, isActive = false, isMobile = false }) => {
  return (
    <div
      className={`bg-[#1a1f29] p-5 rounded-xl shadow-md transition-all duration-300 border border-gray-800 h-full
        ${isMobile ?
          `transform ${isActive ? 'scale-100 opacity-100 z-10' : 'scale-95 opacity-70 z-0'}` : 
          'hover:shadow-lg hover:translate-y-[-5px]'}`}
    >
      <div className="flex items-start">
        {!isMobile && (
          <div className="mt-1 mr-3 md:mr-4 text-[#FF00D6]">{icon}</div>
        )}
        <div>
          <h3 className={`text-lg font-semibold ${isMobile ? 'text-[#FF00D6]' : 'text-white'} mb-2`}>{title}</h3>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
      </div>
    </div>
  );
};

// MobileCarousel component with swipe functionality
const MobileCarousel = ({ features }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const carouselRef = useRef(null);
  const cardWrapperRef = useRef(null);

  const [touchStartX, setTouchStartX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const updateDimensions = () => {
    if (carouselRef.current) {
      setCarouselWidth(carouselRef.current.offsetWidth);
    }
    if (cardWrapperRef.current) {
      setCardWidth(cardWrapperRef.current.offsetWidth);
    }
  };

  useEffect(() => {
    updateDimensions();
    const debouncedHandleResize = debounce(updateDimensions, 100);
    window.addEventListener('resize', debouncedHandleResize);
    return () => window.removeEventListener('resize', debouncedHandleResize);
  }, []);

  useEffect(() => {
    updateDimensions();
  }, [features.length]);

  const nextSlide = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % features.length);
  };

  const prevSlide = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + features.length) % features.length);
  };

  const calculateOffset = () => {
    if (!carouselWidth || !cardWidth) return '0px';
    const centerOffset = (carouselWidth - cardWidth) / 2;
    const maxOffset = 0;
    const calculatedOffset = `-${(activeIndex * cardWidth) - centerOffset}px`;
    return activeIndex === 0 ? `${maxOffset}px` : calculatedOffset;
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isSwiping || touchStartX === null || !e.touches || e.touches.length !== 1) {
      return;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping || touchStartX === null || !e.changedTouches || e.changedTouches.length !== 1) {
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const swipeThreshold = 50;
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    setTouchStartX(null);
    setIsSwiping(false);
  };

  return (
    <div
      className="relative w-full overflow-hidden py-6"
      ref={carouselRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={prevSlide}
        className="absolute left-1 md:left-2 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors"
        aria-label="Previous card"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors"
        aria-label="Next card"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div
        className="flex transition-transform duration-300 ease-in-out touch-pan-y"
        style={{
          transform: `translateX(${calculateOffset()})`,
        }}
      >
        {features.map((feature, index) => (
          <div
            key={index}
            ref={index === 0 ? cardWrapperRef : null}
            className="w-[80vw] max-w-[300px] px-2 flex-shrink-0 cursor-pointer"
            onClick={() => setActiveIndex(index)}
            role="group"
            aria-roledescription="slide"
            aria-label={`Card ${index + 1} of ${features.length}`}
          >
            <FeatureCard
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              isActive={index === activeIndex}
              isMobile={true}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6 space-x-2">
        {features.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300
              ${index === activeIndex ? 'bg-[#FF00D6] w-6' : 'bg-gray-500 hover:bg-gray-400'}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
};

// SolutionSection component remains mostly the same, but ensure imports are correct
const SolutionSection = () => {
  const features = [
    {
      icon: <MessageSquare size={22} />,
      title: "Real-time AI collaborator",
      description: "Follows the flow, fills gaps, and sharpens arguments, without disrupting the conversation."
    },
    {
      icon: <FileText size={22} />,
      title: "1-Click assistance",
      description: "Quick-action AI agents for instant, clear, and non-intrusive support."
    },
    {
      icon: <FileText size={22} />,
      title: "Instant web & doc search",
      description: "Searches uploaded documents & web to pull up exact information when needed, along with citations."
    },
    {
      icon: <Lightbulb size={22} />,
      title: "Contextual suggestions",
      description: "Live context-aware suggestions to help you decide & spot hidden opportunities you might have missed."
    },
    {
      icon: <Link size={22} />,
      title: "Seamless integration",
      description: "Compatible with Zoom, Google Meet, Teams, and all popular meeting platforms — no setup stress."
    },
    {
      icon: <Settings size={22} />,
      title: "Customizable AI agents",
      description: "Custom-fit AI agents tailored to your role, industry, and style, for ultra-relevant support."
    }
  ];

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section id="features" className="section-padding bg-[#181d26] text-white py-7 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-normal md:font-bold text-white text-center mb-3 md:mb-8">
          JarWiz AI: Smarter Discussions. Better Outcomes. In 1-click.
        </h2>

        <div className="text-base text-center text-gray-300 w-full md:w-4/5 mx-auto mb-4 md:mb-12">
          <p className="hidden md:block mb-2">
            A real-time AI meeting companion that helps you think faster, speak smarter, and get to the point, every time.
          </p>



          <p className="hidden md:block mb-2">
            Simply update JarWiz AI with meeting details, relevant documents, and integrations (e.g., Salesforce, CRM).
          </p>

        </div>
        {isMobile ? (
          <MobileCarousel features={features} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                isMobile={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SolutionSection;
