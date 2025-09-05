
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Image as ImageIcon, X, Star, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NextImage from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ProductCategory } from '@/lib/types';

const IMGBB_API_KEY = '43d1267c74925ed8af33485644bfaa6b';

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductAdded: () => void;
}

export default function ProductForm({ isOpen, onOpenChange, onProductAdded }: ProductFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [unit, setUnit] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [ratingPoints, setRatingPoints] = useState('');
  const [ratingCount, setRatingCount] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setCategory('');
    setUnit('');
    setKeywords([]);
    setCurrentKeyword('');
    setPrice('');
    setDiscountPrice('');
    setRatingPoints('');
    setRatingCount('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (photoFiles.length + files.length > 5) {
        toast({ variant: 'destructive', title: 'Too many images', description: 'You can upload a maximum of 5 images.' });
        return;
      }
      setPhotoFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentKeyword.trim() && keywords.length < 4) {
      e.preventDefault();
      setKeywords([...keywords, currentKeyword.trim()]);
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        return result.data.url;
      } else {
        throw new Error(result.error.message || 'Image upload failed');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Image Upload Failed',
        description: error.message || 'Could not upload image.',
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!name || !price || !unit || !category || photoFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all required fields and select at least one image.' });
      return;
    }

    setIsSaving(true);
    const imageUrls: string[] = [];
    for (const file of photoFiles) {
      const url = await handleImageUpload(file);
      if (url) {
        imageUrls.push(url);
      } else {
        // Stop if any image fails to upload
        setIsSaving(false);
        return;
      }
    }

    try {
      await addDoc(collection(db, 'products'), {
        name: name,
        category: category,
        unit: unit,
        keywords: keywords,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        rating: {
          points: ratingPoints ? parseFloat(ratingPoints) : 0,
          count: ratingCount ? parseInt(ratingCount, 10) : 0,
        },
        images: imageUrls,
      });
      toast({ title: 'Success!', description: 'Product added successfully.' });
      resetForm();
      onProductAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the product.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details for the new product. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} placeholder="e.g. Fresh Apples"/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ProductCategory)} disabled={isSaving}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                  <SelectItem value="Fruits">Fruits</SelectItem>
                  <SelectItem value="Grocery">Grocery</SelectItem>
                  <SelectItem value="Cafe">Cafe</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit} disabled={isSaving}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="gram">Gram (g)</SelectItem>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="litre">Litre (l)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="keywords">Related Keywords (up to 4)</Label>
              <div className="flex flex-wrap gap-2">
                  {keywords.map((kw, index) => (
                      <Badge key={index} variant="secondary">
                          {kw}
                          <button onClick={() => removeKeyword(index)} className="ml-1.5 rounded-full hover:bg-destructive/20 p-0.5">
                              <X className="h-3 w-3" />
                          </button>
                      </Badge>
                  ))}
              </div>
              <Input 
                id="keywords" 
                value={currentKeyword} 
                onChange={(e) => setCurrentKeyword(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Type a keyword and press Enter"
                disabled={isSaving || keywords.length >= 4}
              />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹)</Label>
              <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isSaving} placeholder="e.g. 100"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-price">Discount Price (₹) <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input id="discount-price" type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} disabled={isSaving} placeholder="e.g. 80" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fake Rating <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="rating-points" type="number" value={ratingPoints} onChange={(e) => setRatingPoints(e.target.value)} disabled={isSaving} placeholder="Points (e.g. 4.5)" className="pl-10"/>
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="rating-count" type="number" value={ratingCount} onChange={(e) => setRatingCount(e.target.value)} disabled={isSaving} placeholder="Count (e.g. 150)" className="pl-10"/>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Product Images (up to 5)</Label>
            <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} disabled={isSaving || photoFiles.length >= 5} multiple />
          </div>
          
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photoPreviews.map((src, index) => (
                <div key={index} className="relative aspect-square">
                  <NextImage src={src} alt={`Product Preview ${index + 1}`} layout="fill" className="object-cover rounded-md" />
                  <button onClick={() => removePhoto(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" disabled={isSaving}>
                      <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
