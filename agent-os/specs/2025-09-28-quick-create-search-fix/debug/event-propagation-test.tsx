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

const mockBoards = [
  { id: "1", name: "Project Alpha" },
  { id: "2", name: "Marketing Campaign" },
  { id: "3", name: "Development Sprint" },
];

export const EventPropagationTest = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addToLog = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [`${timestamp}: ${event}`, ...prev.slice(0, 19)]);
  };

  const filteredBoards = searchQuery.trim()
    ? mockBoards.filter(board =>
        board.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockBoards;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Event Propagation Test</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Component */}
        <div className="space-y-4">
          <h3 className="font-medium">Test Select Component</h3>
          <Select
            onOpenChange={(open) => {
              addToLog(`Select ${open ? 'OPENED' : 'CLOSED'}`);
            }}
            onValueChange={(value) => {
              addToLog(`Value selected: ${value}`);
            }}
          >
            <SelectTrigger onClick={() => addToLog("Trigger CLICKED")}>
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent
              onClick={() => addToLog("SelectContent CLICKED")}
              onMouseDown={() => addToLog("SelectContent MOUSE_DOWN")}
            >
              <div
                className="p-2"
                onClick={() => addToLog("Search container CLICKED")}
                onMouseDown={() => addToLog("Search container MOUSE_DOWN")}
              >
                <Input
                  ref={inputRef}
                  placeholder="Search boards..."
                  value={searchQuery}
                  onChange={(e) => {
                    addToLog(`Input CHANGE: "${e.target.value}"`);
                    setSearchQuery(e.target.value);
                  }}
                  onClick={(e) => {
                    addToLog("Input CLICKED - calling stopPropagation");
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    addToLog("Input MOUSE_DOWN - calling stopPropagation");
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    addToLog(`Input KEY_DOWN: ${e.key} - calling stopPropagation`);
                    e.stopPropagation();
                  }}
                  onFocus={() => addToLog("Input FOCUS")}
                  onBlur={() => addToLog("Input BLUR")}
                  className="h-8"
                />
              </div>
              <SelectGroup>
                <SelectLabel>Boards</SelectLabel>
                {filteredBoards.map((board) => (
                  <SelectItem
                    key={board.id}
                    value={board.id}
                    onClick={() => addToLog(`Item ${board.name} CLICKED`)}
                  >
                    {board.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Current State */}
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div>Search Query: <strong>"{searchQuery}"</strong></div>
            <div>Filtered Boards: <strong>{filteredBoards.length}</strong></div>
            <div>Input Ref: <strong>{inputRef.current ? "Active" : "Null"}</strong></div>
          </div>

          {/* Manual Focus Test */}
          <div className="mt-4 space-x-2">
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                  addToLog("Manual FOCUS called on input");
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Focus Input
            </button>
            <button
              onClick={() => {
                setSearchQuery("");
                addToLog("Search query CLEARED");
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Clear Search
            </button>
          </div>
        </div>

        {/* Event Log */}
        <div className="space-y-4">
          <h3 className="font-medium">Event Log</h3>
          <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono h-96 overflow-y-auto">
            {eventLog.length === 0 ? (
              <div className="text-gray-500">No events yet...</div>
            ) : (
              eventLog.map((event, index) => (
                <div key={index} className="mb-1">{event}</div>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setEventLog([]);
              addToLog("Event log CLEARED");
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">Event Propagation Tests:</h3>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. Open the dropdown by clicking the trigger</li>
          <li>2. Click in the search input field</li>
          <li>3. Type a character and watch for focus loss</li>
          <li>4. Note if stopPropagation prevents unwanted events</li>
          <li>5. Check if re-renders cause focus issues</li>
          <li>6. Test manual focus restoration</li>
        </ol>
      </div>
    </div>
  );
};

export default EventPropagationTest;