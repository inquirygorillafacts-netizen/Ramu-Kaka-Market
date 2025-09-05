'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, LifeBuoy, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
                    <Image src="/whatsapp.svg" alt="Whatsapp Icon" width={24} height={24} />
                    <span>हमारे व्हाट्सएप समुदाय से जुड़ें</span>
                </CardTitle>
                 <CardDescription>
                    सीधे हमसे और अन्य ग्राहकों से जुड़ें।
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                   सर्वोत्तम ऑफर, डिस्काउंट की जानकारी पाएं, अपने अनुभव साझा करें, और अपने सभी सवालों के जवाब तुरंत प्राप्त करें। हम और हमारी टीम आपकी मदद करने और आपकी सलाह सुनने के लिए ग्रुप में मौजूद हैं!
                </p>
                <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <Link href="https://chat.whatsapp.com/G0tXobjgzo70nClvmNGHvc" target="_blank">
                        <Image src="/whatsapp-white.svg" alt="Whatsapp Icon" width={20} height={20} className="mr-2"/>
                        Join WhatsApp Group
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{animationDelay: '200ms'}}>
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
