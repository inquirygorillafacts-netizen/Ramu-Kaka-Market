
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Shield, User, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

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
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().roles.admin) {
          setIsAdmin(true);
          fetchUsers();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } else {
        router.push('/auth');
      }
    });
     return () => unsubscribe();
  }, [router]);

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
    } catch (err: any) {
      console.error("Error fetching users:", err);
      if (err.code === 'permission-denied') {
          setError("You do not have permission to view this page.");
      } else {
          setError("Failed to load user data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  const renderRoles = (roles: UserProfile['roles']) => {
    return Object.entries(roles).map(([role, value]) => {
      let roleId = '';
      if (role === 'admin' && typeof value === 'object' && value.adminId) roleId = `(${value.adminId})`;
      if (role === 'delivery' && typeof value === 'object' && value.deliveryId) roleId = `(${value.deliveryId})`;
      
      const variant = role === 'admin' ? 'destructive' : role === 'delivery' ? 'secondary' : 'default';

      return (
        <Badge key={role} variant={variant} className="mr-1 capitalize">
          {role} {roleId}
        </Badge>
      );
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Verifying access & loading users...</p>
      </div>
    );
  }

  if (!isAdmin) {
     return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to view this page.</p>
        <Button onClick={() => router.push('/role-selection')}>Back to Gates</Button>
      </div>
    );
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
          {error ? (
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
