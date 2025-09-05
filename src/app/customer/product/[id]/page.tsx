
'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, CartItem, ProductCategory } from '@/lib/types';
import { Loader2, Star, ShoppingBasket, Heart, BadgePercent, Truck, ShieldCheck, Repeat } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  useEffect(() => {
    // Load cart and favorites from local storage
    const savedCart = localStorage.getItem('ramukaka_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedFavorites = localStorage.getItem('ramukaka_favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites).map((p: Product) => p.id));
  }, []);
  
  useEffect(() => {
    if (!productId) return;
    
    setLoading(true);
    
    const fetchProductData = async () => {
      // Fetch the single product document
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        setProduct(null); // Or trigger a notFound()
        setLoading(false);
        return;
      }
      
      const productData = { id: productSnap.id, ...productSnap.data() } as Product;
      setProduct(productData);

      // Fetch related products from the same category
      if (productData.category) {
        const q = query(
            collection(db, 'products'), 
            where('category', '==', productData.category),
            where('__name__', '!=', productId) // Exclude the current product
        );
        const querySnapshot = await getDocs(q);
        const fetchedRelatedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setRelatedProducts(fetchedRelatedProducts);
      }
      setLoading(false);
    };

    fetchProductData();
  }, [productId]);
  
  const updateCart = (newCart: CartItem[]) => {
      setCart(newCart);
      localStorage.setItem('ramukaka_cart', JSON.stringify(newCart));
  }

  const handleAddToCart = (product: Product) => {
      const newCart = [...cart];
      const existingItem = newCart.find(item => item.id === product.id);
      if (existingItem) {
          existingItem.quantity += 1;
      } else {
          newCart.push({ ...product, quantity: 1 });
      }
      updateCart(newCart);
      toast({
          title: 'Added to Tokri!',
          description: `${product.name} has been added to your tokri.`
      })
  }

  const toggleFavorite = (product: Product) => {
      const currentFavorites: Product[] = JSON.parse(localStorage.getItem('ramukaka_favorites') || '[]');
      const isFavorite = favorites.includes(product.id);
      let updatedFavorites: Product[];
      
      if (isFavorite) {
          updatedFavorites = currentFavorites.filter(fav => fav.id !== product.id);
          toast({ title: "Removed from Favorites" });
      } else {
          updatedFavorites = [...currentFavorites, product];
          toast({ title: "Added to Favorites!" });
      }
      localStorage.setItem('ramukaka_favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites.map(p => p.id));
  };


  if (loading) {
    return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }
  
  if (!product) {
      notFound();
  }

  const isFavorite = favorites.includes(product.id);

  return (
    <div className="space-y-8 p-4 md:p-6">
        {/* Product Details Section */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Image Carousel */}
            <div className="animate-fade-in-left">
                <Carousel className="w-full">
                    <CarouselContent>
                        {product.images.map((img, index) => (
                            <CarouselItem key={index}>
                                <div className="aspect-square bg-card rounded-xl overflow-hidden shadow-lg border">
                                    <Image src={img} alt={`${product.name} image ${index + 1}`} width={600} height={600} className="w-full h-full object-cover"/>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-3" />
                    <CarouselNext className="right-3" />
                </Carousel>
            </div>

            {/* Product Info and Actions */}
            <div className="space-y-4 animate-fade-in-right">
                <Badge variant="outline">{product.category}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold font-headline">{product.name}</h1>
                
                {product.rating && product.rating.count > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-5 h-5 ${i < Math.round(product.rating!.points) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                        </div>
                        <span className="font-bold">{product.rating.points.toFixed(1)}</span>
                        <span className="text-muted-foreground">({product.rating.count} ratings)</span>
                    </div>
                )}
                
                <div className="flex items-baseline gap-3">
                     {product.discountPrice ? (
                        <>
                            <span className="text-4xl font-bold text-primary">₹{product.discountPrice.toFixed(2)}</span>
                            <span className="text-2xl line-through text-muted-foreground">₹{product.price.toFixed(2)}</span>
                        </>
                     ) : (
                        <span className="text-4xl font-bold text-primary">₹{product.price.toFixed(2)}</span>
                     )}
                     <span className="text-lg text-muted-foreground">per {product.unitQuantity} {product.unit}</span>
                </div>
                
                <Separator/>

                <div className="flex items-center gap-3">
                    <Button size="lg" className="w-full h-12" onClick={() => handleAddToCart(product)}>
                        <ShoppingBasket className="mr-2"/>
                        Add to Tokri
                    </Button>
                    <Button size="lg" variant="outline" className="h-12" onClick={() => toggleFavorite(product)}>
                        <Heart className={`mr-2 transition-colors ${isFavorite ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`}/>
                        Favorite
                    </Button>
                </div>
                
                {/* Value Propositions */}
                <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-sm">
                        <BadgePercent className="w-5 h-5 text-primary"/>
                        <span className="font-medium">पूरे बाज़ार में सर्वोत्तम मूल्य</span>
                    </div>
                     <div className="flex items-center gap-3 text-sm">
                        <Truck className="w-5 h-5 text-primary"/>
                        <span className="font-medium">मुफ़्त और तेज़ होम डिलीवरी</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <ShieldCheck className="w-5 h-5 text-primary"/>
                        <span className="font-medium">ताज़ा और उच्च गुणवत्ता वाले उत्पाद</span>
                    </div>
                     <div className="flex items-center gap-3 text-sm">
                        <Repeat className="w-5 h-5 text-primary"/>
                        <span className="font-medium">आसान वापसी नीति</span>
                    </div>
                     <div className="flex items-center gap-3 text-sm">
                        <Image src="/rewards.svg" alt="Rewards" width={20} height={20} className="text-primary"/>
                        <span className="font-medium">रोमांचक ऑफ़र और पुरस्कार</span>
                    </div>
                </div>

            </div>
        </div>
        
        <Separator/>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold font-headline">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {relatedProducts.map(relProduct => (
                      <Link key={relProduct.id} href={`/customer/product/${relProduct.id}`} className="block">
                        <div className="relative bg-card rounded-xl shadow-sm overflow-hidden group border h-full flex flex-col">
                            <div className="aspect-square overflow-hidden">
                                <Image 
                                    src={relProduct.images[0]}
                                    alt={relProduct.name} 
                                    width={200} 
                                    height={200} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-3 space-y-2 flex flex-col flex-grow">
                                <h3 className="font-semibold text-sm truncate flex-grow">{relProduct.name}</h3>
                                <p className="text-xs text-muted-foreground">per {relProduct.unitQuantity} {relProduct.unit}</p>
                                <div className="font-bold text-base pt-1">
                                    {relProduct.discountPrice ? (
                                    <div className="flex items-baseline gap-1.5">
                                        <span>₹{relProduct.discountPrice.toFixed(2)}</span>
                                        <span className="text-sm line-through text-muted-foreground">₹{relProduct.price.toFixed(2)}</span>
                                    </div>
                                    ) : `₹${relProduct.price.toFixed(2)}`}
                                </div>
                            </div>
                        </div>
                      </Link>
                  ))}
              </div>
          </div>
        )}
    </div>
  );
}
