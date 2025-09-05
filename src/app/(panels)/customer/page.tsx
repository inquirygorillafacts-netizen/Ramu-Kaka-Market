import { personalizeCustomerEntry } from "@/ai/flows/personalized-customer-entry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Sparkles, Handshake } from "lucide-react";
import Image from "next/image";

// Mock data to be passed to the AI flow. In a real app, this would be fetched from a database based on the logged-in user.
const mockCustomerData = {
  customerId: 'CUST-PRIYA-001',
  customerName: 'Priya',
  customerPurchaseHistory: 'Fresh vegetables, organic spices, handmade soaps, artisanal cheese, whole wheat bread.',
  customerPreferences: 'Loves organic and locally-sourced products. Interested in sustainable living.'
};

export default async function CustomerPage() {
  // In a real app, you would identify the user and get their data before calling the AI
  const personalization = await personalizeCustomerEntry(mockCustomerData);

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">{personalization.welcomeMessage}</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">We've prepared some special offers just for you based on your preferences!</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-primary" />
              <CardTitle>Your Personalized Promotions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground">{personalization.personalizedPromotions}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <CardTitle>Recommended For You</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
             <p className="text-muted-foreground mb-4">{personalization.personalizedRecommendations}</p>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative aspect-square">
                    <Image data-ai-hint="fresh vegetables" src="https://picsum.photos/seed/veg/300/300" alt="Recommendation 1" fill className="rounded-md object-cover" />
                </div>
                 <div className="relative aspect-square">
                    <Image data-ai-hint="artisanal cheese" src="https://picsum.photos/seed/cheese/300/300" alt="Recommendation 2" fill className="rounded-md object-cover" />
                </div>
                 <div className="relative aspect-square">
                    <Image data-ai-hint="handmade soaps" src="https://picsum.photos/seed/soap/300/300" alt="Recommendation 3" fill className="rounded-md object-cover" />
                </div>
                 <div className="relative aspect-square">
                    <Image data-ai-hint="organic spices" src="https://picsum.photos/seed/spice/300/300" alt="Recommendation 4" fill className="rounded-md object-cover" />
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
              <Handshake className="w-6 h-6 text-primary" />
              <CardTitle>Community Highlights</CardTitle>
          </div>
          <CardDescription>Discover what's new from our local partners.</CardDescription>
        </CardHeader>
        <CardContent>
            <blockquote className="border-l-4 border-primary pl-4">
              <p className="font-highlight text-lg italic text-center text-foreground/80">"The quality of produce from Ramu Kaka Market is unmatched. It feels like a farmer's market at my doorstep!"</p>
              <footer className="text-right mt-2 text-sm text-muted-foreground">- A happy customer</footer>
            </blockquote>
        </CardContent>
      </Card>
    </div>
  );
}
