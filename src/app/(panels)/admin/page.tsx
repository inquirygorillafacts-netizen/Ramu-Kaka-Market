
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Users, Shield, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: {
    customer?: boolean;
    admin?: { adminId: string };
    delivery?: { deliveryId: string };
  };
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const usersList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UserProfile));
        setUsers(usersList);
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderRoles = (roles: UserProfile['roles']) => {
    return Object.keys(roles).map(role => {
      let roleId = '';
      if (role === 'admin' && roles.admin) roleId = `(${roles.admin.adminId})`;
      if (role === 'delivery' && roles.delivery) roleId = `(${roles.delivery.deliveryId})`;
      
      const variant = role === 'admin' ? 'destructive' : role === 'delivery' ? 'secondary' : 'default';

      return (
        <Badge key={role} variant={variant} className="mr-1 capitalize">
          {role} {roleId}
        </Badge>
      );
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">User Management</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">Oversee and manage all users and their roles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <span>All Users</span>
          </CardTitle>
          <CardDescription>A list of all users in the system. You can manage their roles here.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-destructive text-center h-64 flex items-center justify-center">
              <p>{error}</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{renderRoles(user.roles)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Manage Roles</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
