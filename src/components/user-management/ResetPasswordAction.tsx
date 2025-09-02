
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KeyRound } from 'lucide-react';
import ResetPasswordDialog from './ResetPasswordDialog';

interface ResetPasswordActionProps {
  userId: string;
  userEmail: string;
}

const ResetPasswordAction: React.FC<ResetPasswordActionProps> = ({ userId, userEmail }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
