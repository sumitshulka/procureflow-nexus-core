
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { KeyRound } from 'lucide-react';

interface ResetPasswordActionProps {
  userId: string;
  userEmail: string;
}

const ResetPasswordAction: React.FC<ResetPasswordActionProps> = ({ userId, userEmail }) => {
  const { toast } = useToast();

  const handleResetPassword = () => {
    // This would typically send a password reset email
    toast({
      title: 'Password Reset',
      description: `Password reset email would be sent to ${userEmail}`,
    });
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleResetPassword}>
      <KeyRound className="w-4 h-4" />
    </Button>
  );
};

export default ResetPasswordAction;
