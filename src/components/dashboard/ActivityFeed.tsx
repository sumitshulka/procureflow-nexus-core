
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ActivityFeed = () => {
  const activities = [
    {
      id: 1,
      user: {
        name: "Jane Smith",
        avatar: "/placeholder.svg",
        initials: "JS",
      },
      action: "approved",
      item: "purchase request",
      itemId: "PR-2023-089",
      timestamp: "10 minutes ago",
      priority: "high",
    },
    {
      id: 2,
      user: {
        name: "Michael Brown",
        avatar: "/placeholder.svg",
        initials: "MB",
      },
      action: "submitted",
      item: "new RFP",
      itemId: "RFP-2023-032",
      timestamp: "45 minutes ago",
      priority: "medium",
    },
    {
      id: 3,
      user: {
        name: "Sarah Davis",
        avatar: "/placeholder.svg",
        initials: "SD",
      },
      action: "created",
      item: "purchase order",
      itemId: "PO-2023-102",
      timestamp: "2 hours ago",
      priority: "medium",
    },
    {
      id: 4,
      user: {
        name: "James Wilson",
        avatar: "/placeholder.svg",
        initials: "JW",
      },
      action: "received",
      item: "goods",
      itemId: "GRN-2023-067",
      timestamp: "5 hours ago",
      priority: "low",
    },
    {
      id: 5,
      user: {
        name: "Lisa Johnson",
        avatar: "/placeholder.svg",
        initials: "LJ",
      },
      action: "uploaded",
      item: "invoice",
      itemId: "INV-2023-154",
      timestamp: "8 hours ago",
      priority: "high",
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <div className="border rounded-md bg-white divide-y">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-3 flex items-center gap-3 hover:bg-gray-50"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
              <AvatarFallback>{activity.user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{activity.user.name}</span>{" "}
                <span className="text-gray-600">{activity.action}</span>{" "}
                <span>{activity.item}</span>{" "}
                <span className="font-medium text-procurement-700">
                  {activity.itemId}
                </span>
              </p>
              <p className="text-xs text-gray-500">{activity.timestamp}</p>
            </div>
            <div>{getPriorityBadge(activity.priority)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
