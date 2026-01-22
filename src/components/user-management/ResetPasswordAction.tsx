import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KeyRound } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import ResetPasswordDialog from './ResetPasswordDialog';

interface ResetPasswordActionProps {
  userId: string;
  userEmail: string;
  asMenuItem?: boolean;
}

const ResetPasswordAction: React.FC<ResetPasswordActionProps> = ({ 
  userId, 
  userEmail, 
  asMenuItem = false 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (asMenuItem) {
    return (
      <>
        <DropdownMenuItem onSelect={() => setIsDialogOpen(true)}>
          <KeyRound className="w-4 h-4 mr-2" />
          Reset Password
        </DropdownMenuItem>
        <ResetPasswordDialog
          userId={userId}
          userEmail={userEmail}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)}>
        <KeyRound className="w-4 h-4" />
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
