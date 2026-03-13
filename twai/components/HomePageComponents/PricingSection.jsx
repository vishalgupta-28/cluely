"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

// pricingTiers array with "Sign Up" instead of "Join Waitlist"
const pricingTiers = [
    { id: "free", name: "Free", price: 0, description: "Perfect for checking out first time", meetings: "300 minutes of meetings", storage: "1 GB storage", features: ["Real-time AI meeting assistance", "Document search & retrieval", "Meeting summaries / Transcripts", "Priority support", "5 Agents",], cta: "Sign Up", },
    { id: "basic", name: "Basic", price: 29, description: "Perfect for freelancers and individual consultants", meetings: "1500 minutes of meetings", storage: "5 GB storage", features: ["Everything in Free, plus:", "Agenda item tracking", "Preparation Hub QnA Access", "Priority support", "15 AI-agents",], popular: true, cta: "Sign Up", },
    { id: "pro", name: "Pro", price: 199, description: "Ideal for small teams and growing businesses", meetings: "10000 minutes of meetings", storage: "20 GB storage", features: ["Everything in Basic, plus:", "Custom AI agent development", "Integration with CRM systems", "Dedicated account manager", "Unlimited AI-agent templates",], cta: "Sign Up", },
]

const PricingCard = ({ tier, billingCycle }) => {
    const displayPrice = billingCycle === "annual" && tier.price > 0 ? Math.round(tier.price * 0.8 * 12) : tier.price;
    const priceSuffix = billingCycle === "annual" && tier.price > 0 ? "/year" : "/month";

    return (
        <div className={`relative rounded-xl overflow-hidden h-full flex flex-col ${ tier.popular ? "shadow-xl border-2 border-[#FF00D6]" : "shadow-md border border-gray-800" }`}>
             {tier.popular && (<div className="absolute top-0 right-0 bg-[#FF00D6] text-white px-3 py-1 text-xs font-semibold rounded-bl-lg z-10">Most Popular</div>)}
             <div className="bg-[#1a1f29] p-6 flex-grow flex flex-col">
                 <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
                 <p className="text-sm text-gray-300 mb-3 h-10">{tier.description}</p>
                 <div className="mb-4">
                     {tier.price === 0 ? (<span className="text-2xl font-bold text-white">Free</span>) : (<><span className="text-2xl font-bold text-white">${displayPrice}</span><span className="text-sm text-gray-400">{priceSuffix}</span></>)}
                 </div>
                 <div className="space-y-2 mb-6 text-sm text-gray-300">
                     <div className="flex items-center"><Check className="h-4 w-4 text-[#FF00D6] mr-2 flex-shrink-0" />{tier.meetings}</div>
                     <div className="flex items-center"><Check className="h-4 w-4 text-[#FF00D6] mr-2 flex-shrink-0" />{tier.storage}</div>
                 </div>
                 <Link href="/signup">
                    <Button className={`w-full mt-auto py-3 text-base ${ tier.popular ? "bg-[#FF00D6] hover:bg-[#D600B1] text-white" : "bg-[#242936] hover:bg-[#2f3646] text-white" }`}>{tier.cta}</Button>
                 </Link>
                 <div className="space-y-2 mt-6 pt-6 border-t border-gray-700">
                     {tier.features.map((feature, index) => (<div key={index} className="flex items-start"><div className="text-[#FF00D6] mr-2 mt-0.5 flex-shrink-0"><Check className="h-4 w-4" /></div><span className="text-sm text-gray-300">{feature}</span></div>))}
                 </div>
             </div>
        </div>
    )
}

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState("monthly")
  // const [isModalOpen, setIsModalOpen] = useState(false)
  // const [selectedTierId, setSelectedTierId] = useState(null)

  // --- Mobile Carousel State & Refs ---
  const [isMobile, setIsMobile] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const [cardWidth, setCardWidth] = useState(0)
  const carouselRef = useRef(null)
  const cardWrapperRef = useRef(null)
  const trackRef = useRef(null); // Ref for the track div for adding/removing classes

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
        if (cardWrapperRef.current) setCardWidth(cardWrapperRef.current.offsetWidth);
    });
  };

  // Check mobile status and setup resize listener
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      if (isMobile !== mobile) {
          setIsMobile(mobile);
          setActiveIndex(0);
      }
    };
    checkMobile();
    const debouncedCheckMobile = debounce(checkMobile, 100);
    window.addEventListener("resize", debouncedCheckMobile);
    return () => window.removeEventListener("resize", debouncedCheckMobile);
  }, [isMobile]);

  // Update dimensions on mount and when isMobile changes
  useEffect(() => {
    if (isMobile) {
      updateDimensions();
      const debouncedUpdateDimensions = debounce(updateDimensions, 100);
      window.addEventListener('resize', debouncedUpdateDimensions);
      return () => window.removeEventListener('resize', debouncedUpdateDimensions);
    }
  }, [isMobile]);

  // Open modal handler - commented out as we're using direct sign up link now
  // const handleJoinWaitlist = (tierId) => {
  //   setSelectedTierId(tierId);
  //   setIsModalOpen(true);
  // }

  // --- Carousel Navigation ---
  const nextSlide = () => {
    setActiveIndex((prevIndex) => Math.min(prevIndex + 1, pricingTiers.length - 1));
  };

  const prevSlide = () => {
    setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
  };

  // --- Calculate Offset for Centering ---
  const calculateOffset = () => {
    if (!carouselWidth || !cardWidth || !isMobile) return '0px';
    
    const centerOffset = (carouselWidth - cardWidth) / 2;
    const maxOffset = 0;
    const calculatedOffset = `-${(activeIndex * cardWidth) - centerOffset}px`;

    return activeIndex === 0 ? `${maxOffset}px` : calculatedOffset;
  };

  // --- Swipe Handlers ---
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setIsSwiping(true);
      trackRef.current?.classList.remove('duration-300');
    }
  };

  const handleTouchMove = (e) => {
    if (isSwiping && touchStartX !== null && e.touches && e.touches.length === 1) {
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - touchStartX;

      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e) => {
    trackRef.current?.classList.add('duration-300');

    if (isSwiping && touchStartX !== null && e.changedTouches && e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX;
      const swipeThreshold = 50;

      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0) {
          nextSlide();
        } else {
          if (activeIndex > 0) {
              prevSlide();
          }
        }
      }
    }
    setTouchStartX(null);
    setIsSwiping(false);
  };

  return (
    <section id="pricing" className="section-padding bg-[#0f1217] text-white py-7 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-normal md:font-bold text-white text-center mb-6 md:mb-8">
          Choose Your Plan
        </h2>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-6 md:mb-8">
           <div className="bg-[#1a1f29] rounded-lg p-1 shadow-sm border border-gray-800 inline-flex">
             <button className={`px-3 py-2 md:px-4 md:py-2 text-sm rounded-md transition-colors ${ billingCycle === "monthly" ? "bg-[#FF00D6] text-white" : "bg-transparent text-gray-300 hover:bg-[#242936]" }`} onClick={() => setBillingCycle("monthly")}>Monthly</button>
             <button className={`px-3 py-2 md:px-4 md:py-2 text-sm rounded-md transition-colors ${ billingCycle === "annual" ? "bg-[#FF00D6] text-white" : "bg-transparent text-gray-300 hover:bg-[#242936]" }`} onClick={() => setBillingCycle("annual")}>Annual <span className="text-[#FF69B4] text-xs ml-1">Save 20%</span></button>
           </div>
        </div>

        {isMobile ? (
            <div className="relative w-full overflow-hidden pb-6" ref={carouselRef}>
                <button onClick={prevSlide} disabled={activeIndex === 0} className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous tier"><ChevronLeft className="h-5 w-5" /></button>
                <button onClick={nextSlide} disabled={activeIndex >= pricingTiers.length - 1} className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-[#1a1f29]/60 h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-[#1a1f29]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next tier"><ChevronRight className="h-5 w-5" /></button>

                <div
                    ref={trackRef}
                    className="flex transition-transform ease-in-out duration-300"
                    style={{ transform: `translateX(${calculateOffset()})` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {pricingTiers.map((tier, index) => (
                        <div
                            key={tier.id}
                            ref={index === 0 ? cardWrapperRef : null}
                            className={`w-[85vw] max-w-[340px] px-2 flex-shrink-0 transform ${
                                index === activeIndex ? 'scale-100 opacity-100 z-10' : 'scale-95 opacity-70 z-0'
                            }`}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`Pricing tier ${index + 1} of ${pricingTiers.length}: ${tier.name}`}
                         >
                            <PricingCard
                                tier={tier}
                                billingCycle={billingCycle}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-6 space-x-2">
                   {pricingTiers.map((_, index) => (<button key={index} className={`w-2 h-2 rounded-full transition-all duration-300 ${ index === activeIndex ? 'bg-[#FF00D6] w-5' : 'bg-gray-600 hover:bg-gray-500' }`} onClick={() => setActiveIndex(index)} aria-label={`Go to tier ${index + 1}`} aria-current={index === activeIndex}/>))}
                </div>
            </div>
        ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {pricingTiers.map((tier) => (
                     <PricingCard
                        key={tier.id}
                        tier={tier}
                        billingCycle={billingCycle}
                    />
                ))}
            </div>
        )}
      </div>
    </section>
  )
}

export default PricingSection