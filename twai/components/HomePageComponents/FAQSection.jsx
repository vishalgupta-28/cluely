import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "How does Jarwiz AI integrate with my existing meeting tools?",
    answer:
      "Jarwiz AI integrates seamlessly with popular meeting platforms like Zoom, Google Meet, Microsoft Teams, and Webex through a simple browser extension. Once installed, you can activate Jarwiz AI with a single click at the start of any meeting. No complex setup or configuration is required.",
  },
  {
    question: "Is my data secure with Jarwiz AI?",
    answer:
      "Absolutely. We take security very seriously. All conversations and documents are encrypted both in transit and at rest. We maintain SOC 2 compliance and adhere to GDPR regulations. Your data is never used to train our models without explicit consent, and you maintain full ownership of all your information.",
  },
  {
    question: "Can I customize the AI agents for my specific needs?",
    answer:
      "Yes! Jarwiz AI offers customizable agents that can be tailored to specific roles, industries, or use cases. You can adjust the agent's knowledge base, tone, priorities, and behavior through an intuitive interface. Premium users can work with our team to develop completely custom agents for specialized needs.",
  },
  {
    question: "How accurate is the real-time conversation analysis?",
    answer:
      "Jarwiz AI's conversation analysis is highly accurate, with comprehension rates consistently above 95% in most professional settings. The system continuously improves as it learns from your meetings and can handle different accents, speaking styles, and technical jargon with impressive accuracy.",
  },
  {
    question: "What happens if I exceed my meeting or storage limits?",
    answer:
      "If you approach your limits, you'll receive notifications so you can manage your usage. If you exceed your limits, you can either upgrade to a higher tier or purchase additional meeting credits or storage as needed. We never abruptly cut off service in the middle of an important meeting.",
  },
]

const FAQSection = () => {
  return (
    <section id="faq" className="section-padding bg-[#121620] py-6 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="section-title text-white text-2xl md:text-4xl font-normal md:font-bold text-center mb-8 md:mb-12">
          <span className="md:hidden">FAQ&apos;s</span>
          <span className="hidden md:inline">Frequently Asked Questions</span>
        </h2>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 md:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-gray-700 rounded-lg overflow-hidden bg-[#1a1f29]"
              >
                <AccordionTrigger className="px-4 md:px-6 py-3 md:py-4 hover:bg-[#242936] text-left font-medium text-white text-sm md:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-gray-300 bg-[#242936]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

export default FAQSection

