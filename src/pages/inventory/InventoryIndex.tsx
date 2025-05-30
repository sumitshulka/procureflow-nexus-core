
import React from "react";
import { Outlet } from "react-router-dom";

const InventoryIndex = () => {
  return (
    <div className="h-full">
      <Outlet />
    </div>
  );
};

export default InventoryIndex;
