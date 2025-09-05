import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Truck, Package, CheckCircle, Clock } from "lucide-react";

export default function DeliveryPage() {
  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">Delivery Dashboard</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">Manage and track all your deliveries.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Waiting for pickup</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">On the way to customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2,540</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Tasks</CardTitle>
          <CardDescription>Your current and upcoming delivery assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-8 flex flex-col items-center justify-center text-muted-foreground/50 space-y-4 h-64 border-2 border-dashed rounded-lg">
            <Truck className="w-16 h-16"/>
            <p>Your delivery tasks will be listed here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
