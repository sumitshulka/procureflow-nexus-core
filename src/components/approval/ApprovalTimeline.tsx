
import React from 'react';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, HelpCircle, ClipboardList } from 'lucide-react';
import { 
  Timeline, 
  TimelineItem, 
  TimelineConnector, 
  TimelineContent, 
  TimelineDot, 
  TimelineOppositeContent 
} from "@/components/ui/timeline";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ApprovalHistoryItem {
  id: string;
  status: string;
  created_at: string;
  approval_date?: string;
  comments?: string;
  profiles?: {
    full_name: string;
  };
}

interface ApprovalTimelineProps {
  approvalHistory: ApprovalHistoryItem[];
  loading: boolean;
}

const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ 
  approvalHistory, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-gray-500">Loading approval history...</p>
        </div>
      </div>
    );
  }

  if (approvalHistory.length === 0) {
    return (
      <Alert>
        <AlertTitle>No approval history</AlertTitle>
        <AlertDescription>
          This request has not yet been submitted for approval or no approvals have been recorded.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Timeline className="max-w-2xl mx-auto">
      {approvalHistory.map((approval, index) => {
        let icon;
        let color;
        
        switch (approval.status) {
          case 'pending':
            icon = <Clock />;
            color = "text-amber-500";
            break;
          case 'approved':
            icon = <CheckCircle />;
            color = "text-green-500";
            break;
          case 'rejected':
            icon = <XCircle />;
            color = "text-red-500";
            break;
          case 'more_info':
            icon = <HelpCircle />;
            color = "text-blue-500";
            break;
          default:
            icon = <ClipboardList />;
            color = "text-gray-500";
        }
        
        return (
          <TimelineItem key={approval.id}>
            {index < approvalHistory.length - 1 && <TimelineConnector />}
            <TimelineOppositeContent className="text-xs text-gray-500">
              {format(new Date(approval.created_at), "MMM dd, yyyy h:mm a")}
            </TimelineOppositeContent>
            <TimelineDot className={color}>
              {icon}
            </TimelineDot>
            <TimelineContent>
              <h3 className="font-medium">
                Request {approval.status.replace('_', ' ')}
              </h3>
              <p className="text-sm text-gray-600">
                By {approval.profiles?.full_name || "Unknown user"}
              </p>
              {approval.comments && (
                <p className="text-sm mt-1 text-gray-700 bg-gray-50 p-2 rounded border">
                  "{approval.comments}"
                </p>
              )}
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
};

export default ApprovalTimeline;
