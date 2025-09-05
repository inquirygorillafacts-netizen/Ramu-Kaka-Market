
'use client';

import { useState, useEffect } from 'react';
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input';
import { Loader2, ShieldCheck, Truck } from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: {
    customer?: boolean;
    admin?: { adminId: string } | boolean;
    delivery?: { deliveryId: string } | boolean;
  };
}

interface RoleManagerProps {
  user: UserProfile | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (userId: string, newRoles: UserProfile['roles']) => Promise<void>;
}

export default function RoleManager({ user, isOpen, onOpenChange, onSave }: RoleManagerProps) {
  const [currentRoles, setCurrentRoles] = useState<UserProfile['roles'] | null>(null);
  const [deliveryId, setDeliveryId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setCurrentRoles(JSON.parse(JSON.stringify(user.roles))); // Deep copy
      
      const adminRole = user.roles.admin;
      if (typeof adminRole === 'object' && adminRole.adminId) {
        setAdminId(adminRole.adminId);
      } else {
        setAdminId(`ADM-${user.name.split(' ')[0].toUpperCase()}`);
      }

      const deliveryRole = user.roles.delivery;
      if (typeof deliveryRole === 'object' && deliveryRole.deliveryId) {
        setDeliveryId(deliveryRole.deliveryId);
      } else {
        setDeliveryId(`DEL-${user.name.split(' ')[0].toUpperCase()}`);
      }

    }
  }, [user, isOpen]);
  
  if (!user || !currentRoles) return null;

  const handleAdminToggle = (isToggled: boolean) => {
    const newRoles = { ...currentRoles };
    if (isToggled) {
      newRoles.admin = { adminId: adminId || `ADM-${user.name.split(' ')[0].toUpperCase()}` };
    } else {
      delete newRoles.admin;
    }
    setCurrentRoles(newRoles);
  };
  
  const handleDeliveryToggle = (isToggled: boolean) => {
    const newRoles = { ...currentRoles };
    if (isToggled) {
      newRoles.delivery = { deliveryId: deliveryId || `DEL-${user.name.split(' ')[0].toUpperCase()}` };
    } else {
      delete newRoles.delivery;
    }
    setCurrentRoles(newRoles);
  };
  
  const handleDeliveryIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newId = e.target.value;
      setDeliveryId(newId);
      if (currentRoles.delivery) {
        setCurrentRoles({
            ...currentRoles,
            delivery: { deliveryId: newId }
        });
      }
  }

  const handleAdminIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newId = e.target.value;
      setAdminId(newId);
      if (currentRoles.admin) {
        setCurrentRoles({
            ...currentRoles,
            admin: { adminId: newId }
        });
      }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await onSave(user.id, currentRoles);
    setIsSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Roles for {user.name}</DialogTitle>
          <DialogDescription>
            Assign or remove roles for this user. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            {/* Admin Role */}
            <div className="flex items-center space-x-4 p-4 rounded-md border">
                 <ShieldCheck className="w-6 h-6 text-destructive" />
                <div className="flex-1 space-y-1">
                    <Label htmlFor="admin-role" className="text-base font-medium">Administrator</Label>
                    <p className="text-sm text-muted-foreground">
                        Grants full access to the admin panel.
                    </p>
                </div>
                <Switch
                    id="admin-role"
                    checked={!!currentRoles.admin}
                    onCheckedChange={handleAdminToggle}
                />
            </div>
             {currentRoles.admin && (
                <div className="space-y-2 pl-4 animate-fade-in-down">
                    <Label htmlFor="admin-id">Admin ID</Label>
                    <Input id="admin-id" value={adminId} onChange={handleAdminIdChange} />
                </div>
             )}

            {/* Delivery Role */}
            <div className="flex items-center space-x-4 p-4 rounded-md border">
                <Truck className="w-6 h-6 text-primary" />
                <div className="flex-1 space-y-1">
                    <Label htmlFor="delivery-role" className="text-base font-medium">Delivery Personnel</Label>
                    <p className="text-sm text-muted-foreground">
                        Grants access to the delivery dashboard.
                    </p>
                </div>
                 <Switch
                    id="delivery-role"
                    checked={!!currentRoles.delivery}
                    onCheckedChange={handleDeliveryToggle}
                />
            </div>
             {currentRoles.delivery && (
                <div className="space-y-2 pl-4 animate-fade-in-down">
                    <Label htmlFor="delivery-id">Delivery ID</Label>
                    <Input id="delivery-id" value={deliveryId} onChange={handleDeliveryIdChange} />
                </div>
             )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
