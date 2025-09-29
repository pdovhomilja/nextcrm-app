"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data for testing
const mockBoards = [
  { id: "1", name: "Project Alpha" },
  { id: "2", name: "Marketing Campaign" },
  { id: "3", name: "Development Sprint" },
  { id: "4", name: "Customer Support" },
  { id: "5", name: "Research & Analytics" },
];

export const FocusTestComponent = () => {
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [renderCount, setRenderCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track renders
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.log(`🔄 Component re-render #${renderCount + 1}`);
  });

  // Track focus events
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => console.log("🎯 Input FOCUSED");
    const handleBlur = () => console.log("😵 Input BLURRED");
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      console.log(`⌨️  Input value changed: "${target.value}"`);
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('input', handleInput);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('input', handleInput);
    };
  }, [renderCount]);

  // Filter boards based on search query
  const filteredBoards = boardSearchQuery.trim()
    ? mockBoards.filter(board =>
        board.name.toLowerCase().includes(boardSearchQuery.toLowerCase())
      )
    : mockBoards;

  console.log(`🔍 Search query: "${boardSearchQuery}"`);
  console.log(`📋 Filtered boards count: ${filteredBoards.length}`);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Focus Issue Test Environment</h2>

      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
        <div>Render count: <strong>{renderCount}</strong></div>
        <div>Search query: <strong>"{boardSearchQuery}"</strong></div>
        <div>Selected board: <strong>{selectedBoard || "None"}</strong></div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Board Selection</label>
          <Select
            onValueChange={(value) => {
              console.log(`🎯 Board selected: ${value}`);
              setSelectedBoard(value);
              setBoardSearchQuery(""); // Clear search when selection is made
            }}
            value={selectedBoard}
            onOpenChange={(open) => {
              console.log(`📂 Select dropdown ${open ? 'OPENED' : 'CLOSED'}`);
              if (!open) {
                setBoardSearchQuery(""); // Clear search when dropdown closes
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  ref={inputRef}
                  placeholder="Search boards..."
                  value={boardSearchQuery}
                  onChange={(e) => {
                    console.log(`🔄 Setting search query: "${e.target.value}"`);
                    setBoardSearchQuery(e.target.value);
                  }}
                  className="h-8"
                  onClick={(e) => {
                    console.log("🖱️  Input clicked - stopPropagation called");
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    console.log(`⌨️  Key pressed: ${e.key} - stopPropagation called`);
                    e.stopPropagation();
                  }}
                  onFocus={() => console.log("🎯 Input onFocus event")}
                  onBlur={() => console.log("😵 Input onBlur event")}
                />
              </div>
              <SelectGroup>
                <SelectLabel>Boards</SelectLabel>
                {filteredBoards.length > 0 ? (
                  filteredBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    No boards found
                  </div>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded">
        <h3 className="font-medium text-blue-800 mb-2">Test Instructions:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Click on the board select dropdown</li>
          <li>2. Click in the search input field</li>
          <li>3. Try typing multiple characters quickly</li>
          <li>4. Watch the console for focus/blur events</li>
          <li>5. Note if you need to re-click after each character</li>
        </ol>
      </div>
    </div>
  );
};

export default FocusTestComponent;