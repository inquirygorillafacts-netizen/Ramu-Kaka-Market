
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, LifeBuoy, Phone } from 'lucide-react';

const faqs = [
    {
        question: "मैं ऑर्डर कैसे दे सकता हूँ?",
        answer: "आप हमारे ग्राहक होमपेज से उत्पादों को अपनी टोकरी (cart) में जोड़ सकते हैं। जब आप तैयार हों, तो टोकरी पर जाएं और 'Order Now' बटन पर क्लिक करके अपना ऑर्डर पूरा करें।"
    },
    {
        question: "भुगतान के कौन से तरीके उपलब्ध हैं?",
        answer: "हम ऑनलाइन भुगतान (डेबिट कार्ड, क्रेडिट कार्ड, UPI) और कैश ऑन डिलीवरी (COD) दोनों स्वीकार करते हैं। ऑनलाइन भुगतान पर विशेष ऑफर भी मिलते हैं।"
    },
    {
        question: "मेरी डिलीवरी में कितना समय लगेगा?",
        answer: "हम आपके ऑर्डर को जल्द से जल्द पहुंचाने की कोशिश करते हैं। आमतौर पर, डिलीवरी उसी दिन या अगले दिन हो जाती है। आप 'My Orders' सेक्शन में अपने ऑर्डर की स्थिति को ट्रैक कर सकते हैं।"
    },
    {
        question: "क्या मैं अपना ऑर्डर रद्द कर सकता हूँ?",
        answer: "आप ऑर्डर देने के कुछ समय बाद तक उसे रद्द कर सकते हैं, जब तक कि वह 'Out for Delivery' की स्थिति में न चला जाए। अधिक जानकारी के लिए कृपया हमसे संपर्क करें।"
    }
]

export default function HelpPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
        <header className="animate-fade-in-down">
            <div className="flex items-center gap-4">
                <LifeBuoy className="w-8 h-8 text-primary"/>
                <h1 className="text-3xl font-bold font-headline text-primary">Help Center</h1>
            </div>
            <p className="text-muted-foreground mt-1">आपके सभी सवालों के जवाब यहाँ हैं।</p>
        </header>

        <Card className="animate-fade-in-up">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-6 h-6"/>
                    <span>अक्सर पूछे जाने वाले प्रश्न (FAQs)</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                   {faqs.map((faq, index) => (
                     <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                        <AccordionContent>
                           {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                   ))}
                </Accordion>
            </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{animationDelay: '100ms'}}>
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Phone className="w-6 h-6"/>
                    <span>हमसे संपर्क करें</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    यदि आपको अभी भी सहायता की आवश्यकता है, तो बेझिझक हमें कॉल करें। हमारी टीम आपकी मदद के लिए हमेशा तैयार है।
                </p>
                <Button asChild className="w-full">
                    <a href="tel:8302806913">
                        <Phone className="mr-2"/>
                        Call Us Now
                    </a>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
