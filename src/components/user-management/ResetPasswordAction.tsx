
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import ResetPasswordDialog from './ResetPasswordDialog';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ResetPasswordActionProps {
  userId: string;
  userEmail: string;
}

const ResetPasswordAction = ({ userId, userEmail }: ResetPasswordActionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { userData, hasRole } = useAuth();
  
  // Only show the button if user has admin role
  if (!userData || !hasRole(UserRole.ADMIN)) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-500 hover:bg-blue-50"
        onClick={() => setIsDialogOpen(true)}
        title="Reset user's password"
      >
        <Lock className="h-4 w-4" />
      </Button>
      
      <ResetPasswordDialog
        userId={userId}
        userEmail={userEmail}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default ResetPasswordAction;
