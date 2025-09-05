
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
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';

const IMGBB_API_KEY = '43d1267c74925ed8af33485644bfaa6b';

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ProductForm({ isOpen, onOpenChange }: ProductFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

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

  const resetForm = () => {
    setName('');
    setPrice('');
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  const handleSubmit = async () => {
    if (!name || !price || !photoFile) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields and select an image.' });
      return;
    }

    setIsSaving(true);
    const imageUrl = await handleImageUpload(photoFile);
    if (!imageUrl) {
      setIsSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, 'products'), {
        name: name,
        price: parseFloat(price),
        imageUrl: imageUrl,
      });
      toast({ title: 'Success!', description: 'Product added successfully.' });
      resetForm();
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details for the new product.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Product Image</Label>
            <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} disabled={isSaving} />
          </div>
          {photoPreview && (
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <Image src={photoPreview} alt="Product Preview" layout="fill" className="object-cover rounded-md" />
              </div>
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
