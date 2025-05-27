
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/types';

const UserTypesManager = () => {
  const userTypes = [
    { role: UserRole.ADMIN, description: 'Full system access' },
    { role: UserRole.PROCUREMENT_OFFICER, description: 'Manage procurement processes' },
    { role: UserRole.REQUESTER, description: 'Create procurement requests' },
    { role: UserRole.APPROVER, description: 'Approve requests' },
    { role: UserRole.VENDOR, description: 'Vendor portal access' },
    { role: UserRole.INVENTORY_MANAGER, description: 'Manage inventory' },
    { role: UserRole.FINANCE_OFFICER, description: 'Financial operations' },
    { role: UserRole.EVALUATION_COMMITTEE, description: 'Evaluate proposals' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {userTypes.map((type) => (
            <div key={type.role} className="flex justify-between items-center p-2 border rounded">
              <span className="font-medium">{type.role}</span>
              <span className="text-sm text-gray-600">{type.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserTypesManager;
